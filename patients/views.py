from django.shortcuts import render
from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrStaff, IsClinicalStaff
from .models import Patient, PatientDocument, FamilyGroup, FamilyMember
from .serializers import (PatientSerializer, PatientListSerializer, PatientDocumentSerializer,
                          FamilyGroupSerializer, FamilyMemberSerializer)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['gender', 'blood_group']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']
    ordering_fields = ['created_at', 'last_name', 'first_name']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'recent']:
            permission_classes = [IsClinicalStaff]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminOrStaff]
        else:
            permission_classes = [IsAdminOrStaff]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_patients = self.get_queryset().order_by('-created_at')[:5]
        serializer = PatientListSerializer(recent_patients, many=True)
        return Response(serializer.data)


class PatientDocumentViewSet(viewsets.ModelViewSet):
    queryset = PatientDocument.objects.all()
    serializer_class = PatientDocumentSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['patient', 'document_type']
    ordering_fields = ['uploaded_at']
    ordering = ['-uploaded_at']
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        documents = PatientDocument.objects.filter(patient_id=patient_id)
        serializer = PatientDocumentSerializer(documents, many=True)
        return Response(serializer.data)


class FamilyGroupViewSet(viewsets.ModelViewSet):
    queryset = FamilyGroup.objects.prefetch_related('members__patient').all()
    serializer_class = FamilyGroupSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['primary_user']

    def perform_create(self, serializer):
        serializer.save(primary_user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_family(self, request):
        groups = FamilyGroup.objects.filter(primary_user=request.user)
        return Response(FamilyGroupSerializer(groups, many=True).data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        patient_id = request.data.get('patient_id')
        relationship = request.data.get('relationship', 'OTHER')
        if not patient_id:
            return Response({'error': 'patient_id required'}, status=status.HTTP_400_BAD_REQUEST)
        member, created = FamilyMember.objects.get_or_create(
            family_group=group, patient_id=patient_id,
            defaults={'relationship': relationship}
        )
        if not created:
            return Response({'error': 'Patient already in family group'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(FamilyMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class FamilyMemberViewSet(viewsets.ModelViewSet):
    queryset = FamilyMember.objects.select_related('patient', 'family_group').all()
    serializer_class = FamilyMemberSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['family_group', 'patient', 'relationship']


class PatientHealthTimelineView(APIView):
    """
    Returns a single chronological list of ALL health events for a patient,
    merged and sorted by date.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response(
                {"error": "Patient not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        events = []

        # --- Appointments ---
        from appointments.models import Appointment
        for appt in Appointment.objects.filter(patient=patient).select_related('doctor'):
            events.append({
                'event_type': 'appointment',
                'date': appt.appointment_date.isoformat(),
                'title': f"Appointment with Dr. {appt.doctor.first_name} {appt.doctor.last_name}",
                'description': appt.reason,
                'details': {
                    'doctor': f"Dr. {appt.doctor.first_name} {appt.doctor.last_name}",
                    'status': appt.get_status_display(),
                    'reason': appt.reason,
                    'time': appt.appointment_time.isoformat() if appt.appointment_time else None,
                },
            })

        # --- Prescriptions ---
        from prescriptions.models import Prescription
        for rx in Prescription.objects.filter(patient=patient).select_related('doctor').prefetch_related('items'):
            events.append({
                'event_type': 'prescription',
                'date': rx.created_at.date().isoformat(),
                'title': f"Prescription by Dr. {rx.doctor.first_name} {rx.doctor.last_name}",
                'description': rx.diagnosis,
                'details': {
                    'doctor': f"Dr. {rx.doctor.first_name} {rx.doctor.last_name}",
                    'diagnosis': rx.diagnosis,
                    'medicines_count': rx.items.count(),
                    'follow_up_date': rx.follow_up_date.isoformat() if rx.follow_up_date else None,
                },
            })

        # --- Lab Orders ---
        from lab.models import LabOrder
        for order in LabOrder.objects.filter(patient=patient).prefetch_related('items__test'):
            test_names = [item.test.name for item in order.items.all()]
            results_summary = []
            for item in order.items.all():
                if item.result_value:
                    flag = " (ABNORMAL)" if item.is_abnormal else ""
                    results_summary.append(f"{item.test.name}: {item.result_value}{flag}")
            events.append({
                'event_type': 'lab_order',
                'date': order.created_at.date().isoformat(),
                'title': f"Lab Order: {', '.join(test_names[:3])}{'...' if len(test_names) > 3 else ''}",
                'description': f"{len(test_names)} test(s) - {order.get_status_display()}",
                'details': {
                    'tests': test_names,
                    'status': order.get_status_display(),
                    'results_summary': results_summary,
                    'order_number': order.order_number,
                },
            })

        # --- Vitals ---
        from vitals.models import VitalSign
        for v in VitalSign.objects.filter(patient=patient):
            bp = f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}" if v.blood_pressure_systolic else "N/A"
            events.append({
                'event_type': 'vitals',
                'date': v.recorded_at.date().isoformat(),
                'title': f"Vitals Recorded - BP: {bp}",
                'description': f"BP: {bp}, Pulse: {v.pulse_rate or 'N/A'}, Temp: {v.temperature or 'N/A'}F, Weight: {v.weight or 'N/A'}kg",
                'details': {
                    'blood_pressure': bp,
                    'pulse': v.pulse_rate,
                    'temperature': float(v.temperature) if v.temperature else None,
                    'weight': float(v.weight) if v.weight else None,
                    'oxygen_saturation': float(v.oxygen_saturation) if v.oxygen_saturation else None,
                },
            })

        # --- Discharge Summaries ---
        from discharge.models import DischargeSummary
        for ds in DischargeSummary.objects.filter(patient=patient).select_related('doctor'):
            events.append({
                'event_type': 'discharge_summary',
                'date': ds.discharge_date.isoformat(),
                'title': f"Discharge Summary - {ds.discharge_diagnosis[:60]}",
                'description': f"Admitted: {ds.admission_date} | Discharged: {ds.discharge_date}",
                'details': {
                    'admission_date': ds.admission_date.isoformat(),
                    'discharge_date': ds.discharge_date.isoformat(),
                    'diagnosis': ds.discharge_diagnosis,
                    'discharge_type': ds.get_discharge_type_display(),
                    'summary_number': ds.summary_number,
                },
            })

        # Sort all events chronologically (newest first)
        events.sort(key=lambda e: e['date'], reverse=True)

        return Response({
            'patient_id': patient.id,
            'patient_name': f"{patient.first_name} {patient.last_name}",
            'total_events': len(events),
            'timeline': events,
        })


class PatientHealthReportView(APIView):
    """
    Generates a consolidated PDF health report with ALL patient data.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response(
                {"error": "Patient not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        from analytics.pdf_reports import build_pdf, _info_table, _items_table, Paragraph, Spacer

        def elements_fn(styles):
            elems = []

            # --- Patient Info Header ---
            elems.append(Paragraph("Patient Health Report", styles["heading"]))
            info_data = [
                ["Name:", f"{patient.first_name} {patient.last_name}"],
                ["Date of Birth:", str(patient.date_of_birth)],
                ["Gender:", patient.get_gender_display()],
                ["Blood Group:", patient.blood_group or "N/A"],
                ["Phone:", patient.phone_number],
                ["Email:", patient.email],
                ["Address:", patient.address],
                ["Emergency Contact:", f"{patient.emergency_contact_name or 'N/A'} ({patient.emergency_contact_number or 'N/A'})"],
            ]
            elems.append(_info_table(info_data))
            elems.append(Spacer(1, 12))

            # --- Allergies Section ---
            from vitals.models import Allergy
            allergies = Allergy.objects.filter(patient=patient, is_active=True)
            elems.append(Paragraph("Allergies", styles["heading"]))
            if allergies.exists():
                allergy_rows = []
                for a in allergies:
                    allergy_rows.append([
                        a.allergen,
                        a.get_allergy_type_display(),
                        a.get_severity_display(),
                        a.reaction,
                    ])
                elems.append(_items_table(
                    ["Allergen", "Type", "Severity", "Reaction"],
                    allergy_rows,
                ))
            else:
                elems.append(Paragraph("No known allergies on record.", styles["normal"]))
            elems.append(Spacer(1, 12))

            # --- Visit History Table ---
            from appointments.models import Appointment
            appointments = Appointment.objects.filter(patient=patient).select_related('doctor').order_by('-appointment_date')
            elems.append(Paragraph("Visit History", styles["heading"]))
            if appointments.exists():
                visit_rows = []
                for appt in appointments[:50]:  # Limit to 50 most recent
                    visit_rows.append([
                        str(appt.appointment_date),
                        f"Dr. {appt.doctor.first_name} {appt.doctor.last_name}",
                        appt.reason[:60],
                        appt.get_status_display(),
                    ])
                elems.append(_items_table(
                    ["Date", "Doctor", "Reason", "Status"],
                    visit_rows,
                ))
            else:
                elems.append(Paragraph("No visit history found.", styles["normal"]))
            elems.append(Spacer(1, 12))

            # --- Prescriptions Table ---
            from prescriptions.models import Prescription
            prescriptions = Prescription.objects.filter(patient=patient).select_related('doctor').prefetch_related('items').order_by('-created_at')
            elems.append(Paragraph("Prescriptions", styles["heading"]))
            if prescriptions.exists():
                rx_rows = []
                for rx in prescriptions[:50]:
                    medicines = ", ".join([item.medicine_name for item in rx.items.all()[:5]])
                    if rx.items.count() > 5:
                        medicines += "..."
                    rx_rows.append([
                        str(rx.created_at.date()),
                        f"Dr. {rx.doctor.first_name} {rx.doctor.last_name}",
                        rx.diagnosis[:50],
                        medicines[:60],
                    ])
                elems.append(_items_table(
                    ["Date", "Doctor", "Diagnosis", "Medicines"],
                    rx_rows,
                ))
            else:
                elems.append(Paragraph("No prescriptions found.", styles["normal"]))
            elems.append(Spacer(1, 12))

            # --- Lab Results Table ---
            from lab.models import LabOrder
            lab_orders = LabOrder.objects.filter(patient=patient).prefetch_related('items__test').order_by('-created_at')
            elems.append(Paragraph("Lab Results", styles["heading"]))
            if lab_orders.exists():
                lab_rows = []
                for order in lab_orders[:50]:
                    tests = ", ".join([item.test.name for item in order.items.all()[:3]])
                    if order.items.count() > 3:
                        tests += "..."
                    results = "; ".join([
                        f"{item.test.name}: {item.result_value}"
                        for item in order.items.all() if item.result_value
                    ][:3])
                    lab_rows.append([
                        str(order.created_at.date()),
                        tests,
                        order.get_status_display(),
                        results or "Pending",
                    ])
                elems.append(_items_table(
                    ["Date", "Tests", "Status", "Results"],
                    lab_rows,
                ))
            else:
                elems.append(Paragraph("No lab results found.", styles["normal"]))
            elems.append(Spacer(1, 12))

            # --- Vitals History Table ---
            from vitals.models import VitalSign
            vitals = VitalSign.objects.filter(patient=patient).order_by('-recorded_at')
            elems.append(Paragraph("Vitals History", styles["heading"]))
            if vitals.exists():
                vitals_rows = []
                for v in vitals[:50]:
                    bp = f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}" if v.blood_pressure_systolic else "N/A"
                    vitals_rows.append([
                        str(v.recorded_at.date()),
                        bp,
                        str(v.pulse_rate) if v.pulse_rate else "N/A",
                        f"{v.temperature}F" if v.temperature else "N/A",
                        f"{v.weight}kg" if v.weight else "N/A",
                        f"{v.oxygen_saturation}%" if v.oxygen_saturation else "N/A",
                    ])
                elems.append(_items_table(
                    ["Date", "BP", "Pulse", "Temp", "Weight", "SpO2"],
                    vitals_rows,
                ))
            else:
                elems.append(Paragraph("No vitals history found.", styles["normal"]))

            return elems

        pdf_bytes = build_pdf(elements_fn)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="health_report_patient_{patient.id}.pdf"'
        )
        return response
