from itertools import combinations

from django.db.models import Q
from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from analytics.pdf_reports import (
    build_pdf, _info_table, _items_table, Paragraph, Spacer,
)
from users.permissions import IsAdminOrDoctor
from .models import (
    Prescription, PrescriptionItem, MedicalRecord,
    DrugInteraction, PrescriptionTemplate,
)
from .serializers import (
    PrescriptionSerializer,
    PrescriptionCreateSerializer,
    PrescriptionDetailSerializer,
    MedicalRecordSerializer,
    MedicalRecordListSerializer,
    DrugInteractionSerializer,
    PrescriptionTemplateSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.select_related(
        'patient', 'doctor', 'appointment'
    ).prefetch_related('items').all()
    serializer_class = PrescriptionSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'appointment']
    search_fields = [
        'diagnosis',
        'items__medicine_name',
    ]
    ordering_fields = ['created_at', 'follow_up_date']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'by_patient', 'by_doctor', 'download_pdf']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminOrDoctor]
        else:
            permission_classes = [IsAdminOrDoctor]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PrescriptionCreateSerializer
        if self.action in ['retrieve', 'list']:
            return PrescriptionDetailSerializer
        return PrescriptionSerializer

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        prescriptions = self.get_queryset().filter(patient_id=patient_id)
        page = self.paginate_queryset(prescriptions)
        if page is not None:
            serializer = PrescriptionDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = PrescriptionDetailSerializer(prescriptions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_doctor(self, request):
        doctor_id = request.query_params.get('doctor_id')
        if not doctor_id:
            return Response(
                {'error': 'doctor_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        prescriptions = self.get_queryset().filter(doctor_id=doctor_id)
        page = self.paginate_queryset(prescriptions)
        if page is not None:
            serializer = PrescriptionDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = PrescriptionDetailSerializer(prescriptions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        prescription = self.get_object()

        def build_elements(styles):
            elems = []
            elems.append(Paragraph("PRESCRIPTION", styles["heading"]))
            elems.append(Spacer(1, 6))

            # Doctor info
            doctor = prescription.doctor
            elems.append(Paragraph("Prescribing Doctor", styles["heading"]))
            doc_data = [
                ["Doctor:", f"Dr. {doctor.first_name} {doctor.last_name}"],
                ["Specialization:", doctor.get_specialization_display()],
                ["License No:", doctor.license_number],
                ["Date:", str(prescription.created_at.strftime('%Y-%m-%d'))],
            ]
            elems.append(_info_table(doc_data))
            elems.append(Spacer(1, 10))

            # Patient info
            patient = prescription.patient
            elems.append(Paragraph("Patient Information", styles["heading"]))
            patient_data = [
                ["Name:", f"{patient.first_name} {patient.last_name}"],
                ["Date of Birth:", str(patient.date_of_birth)],
                ["Gender:", patient.get_gender_display()],
                ["Phone:", patient.phone_number],
            ]
            if patient.blood_group:
                patient_data.append(["Blood Group:", patient.blood_group])
            if patient.allergies:
                patient_data.append(["Allergies:", patient.allergies])
            elems.append(_info_table(patient_data))
            elems.append(Spacer(1, 10))

            # Diagnosis
            elems.append(Paragraph("Diagnosis", styles["heading"]))
            elems.append(Paragraph(prescription.diagnosis, styles["normal"]))
            elems.append(Spacer(1, 10))

            # Medications table
            elems.append(Paragraph("Medications", styles["heading"]))
            headers = ["#", "Medicine", "Dosage", "Frequency", "Duration", "Instructions"]
            rows = []
            for idx, item in enumerate(prescription.items.all(), 1):
                rows.append([
                    str(idx),
                    item.medicine_name,
                    item.dosage,
                    item.frequency,
                    item.duration,
                    item.instructions or "-",
                ])
            col_widths = [25, 110, 65, 80, 65, 130]
            elems.append(_items_table(headers, rows, col_widths=col_widths))

            if prescription.notes:
                elems.append(Spacer(1, 10))
                elems.append(Paragraph("Additional Notes", styles["heading"]))
                elems.append(Paragraph(prescription.notes, styles["normal"]))

            if prescription.follow_up_date:
                elems.append(Spacer(1, 10))
                elems.append(Paragraph("Follow-up", styles["heading"]))
                elems.append(Paragraph(
                    f"Please schedule a follow-up visit on {prescription.follow_up_date}.",
                    styles["normal"],
                ))

            return elems

        pdf_bytes = build_pdf(build_elements)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="prescription_{prescription.id}.pdf"'
        return response


class MedicalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedicalRecord.objects.select_related('patient', 'doctor').all()
    serializer_class = MedicalRecordSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'record_type']
    search_fields = ['title', 'description']
    ordering_fields = ['record_date', 'created_at']
    ordering = ['-record_date']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'by_patient']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminOrDoctor]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'by_patient':
            return MedicalRecordListSerializer
        return MedicalRecordSerializer

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        records = self.get_queryset().filter(patient_id=patient_id)
        page = self.paginate_queryset(records)
        if page is not None:
            serializer = MedicalRecordListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = MedicalRecordListSerializer(records, many=True)
        return Response(serializer.data)


class DrugInteractionViewSet(viewsets.ModelViewSet):
    queryset = DrugInteraction.objects.all()
    serializer_class = DrugInteractionSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['severity']
    search_fields = ['drug_a', 'drug_b', 'description']
    ordering_fields = ['drug_a', 'drug_b', 'severity']
    ordering = ['drug_a', 'drug_b']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'check_interactions']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminOrDoctor]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['post'])
    def check_interactions(self, request):
        """Check drug interactions for a list of medicine names."""
        medicines = request.data.get('medicines', [])
        if len(medicines) < 2:
            return Response({
                'interactions': [],
                'message': 'Need at least 2 medicines',
            })

        interactions = []
        pairs = list(combinations(medicines, 2))
        for a, b in pairs:
            found = DrugInteraction.objects.filter(
                Q(drug_a__icontains=a, drug_b__icontains=b)
                | Q(drug_a__icontains=b, drug_b__icontains=a)
            )
            for interaction in found:
                interactions.append({
                    'id': interaction.id,
                    'drug_a': interaction.drug_a,
                    'drug_b': interaction.drug_b,
                    'severity': interaction.severity,
                    'description': interaction.description,
                    'recommendation': interaction.recommendation,
                })

        return Response({
            'interactions': interactions,
            'checked_count': len(pairs),
        })


class PrescriptionTemplateViewSet(viewsets.ModelViewSet):
    queryset = PrescriptionTemplate.objects.all()
    serializer_class = PrescriptionTemplateSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor', 'is_global']
    search_fields = ['name', 'diagnosis']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'apply_template']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminOrDoctor]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['post'], url_path='apply')
    def apply_template(self, request, pk=None):
        """Create a prescription from a template."""
        template = self.get_object()

        appointment_id = request.data.get('appointment_id')
        patient_id = request.data.get('patient_id')
        doctor_id = request.data.get('doctor_id')
        notes = request.data.get('notes', '')
        follow_up_date = request.data.get('follow_up_date')

        if not all([appointment_id, patient_id, doctor_id]):
            return Response(
                {'error': 'appointment_id, patient_id, and doctor_id are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prescription = Prescription.objects.create(
            appointment_id=appointment_id,
            patient_id=patient_id,
            doctor_id=doctor_id,
            diagnosis=template.diagnosis,
            notes=notes,
            follow_up_date=follow_up_date,
        )

        for item in template.items:
            PrescriptionItem.objects.create(
                prescription=prescription,
                medicine_name=item.get('medicine_name', ''),
                dosage=item.get('dosage', ''),
                frequency=item.get('frequency', ''),
                duration=item.get('duration', ''),
                instructions=item.get('instructions', ''),
            )

        serializer = PrescriptionDetailSerializer(prescription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
