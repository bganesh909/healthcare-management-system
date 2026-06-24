from django.shortcuts import render
from django.utils import timezone
from django.db.models import Max
from datetime import date, datetime, timedelta
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrDoctor, IsClinicalStaff
from .models import Appointment, TimeSlot, DoctorLeave, PatientFeedback, ConsentForm, get_specializations_for_symptoms
from doctors.models import Doctor
from .serializers import (
    AppointmentSerializer, AppointmentListSerializer, AppointmentDetailSerializer,
    AppointmentCheckInSerializer, TimeSlotSerializer, DoctorLeaveSerializer,
    PatientFeedbackSerializer, ConsentFormSerializer
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'appointment_date', 'status']
    search_fields = ['patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name', 'reason']
    ordering_fields = ['appointment_date', 'appointment_time', 'created_at']
    ordering = ['appointment_date', 'appointment_time']

    def get_permissions(self):
        if self.action in ['walk_in', 'check_in', 'check_out', 'record_vitals', 'record_payment']:
            permission_classes = [IsClinicalStaff]
        elif self.action in ['start_consultation', 'complete_consultation']:
            permission_classes = [IsAdminOrDoctor]
        elif self.action in ['suggest_doctors']:
            from rest_framework.permissions import AllowAny
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ['list', 'upcoming', 'today']:
            return AppointmentListSerializer
        if self.action == 'retrieve':
            return AppointmentDetailSerializer
        if self.action == 'check_in':
            return AppointmentCheckInSerializer
        return AppointmentSerializer

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        today = date.today()
        upcoming = self.get_queryset().filter(
            appointment_date__gte=today,
            status='SCHEDULED'
        ).order_by('appointment_date', 'appointment_time')
        page = self.paginate_queryset(upcoming)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        appointment = self.get_object()
        if appointment.check_in_time:
            return Response(
                {'error': 'Patient has already checked in.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.check_in_time = timezone.now()
        # Generate token number: max token for this doctor on this date + 1
        max_token = Appointment.objects.filter(
            doctor=appointment.doctor,
            appointment_date=appointment.appointment_date,
            token_number__isnull=False
        ).aggregate(Max('token_number'))['token_number__max']
        appointment.token_number = (max_token or 0) + 1
        appointment.save()
        serializer = AppointmentCheckInSerializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        appointment = self.get_object()
        if not appointment.check_in_time:
            return Response(
                {'error': 'Patient has not checked in yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if appointment.check_out_time:
            return Response(
                {'error': 'Patient has already checked out.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.check_out_time = timezone.now()
        appointment.status = 'COMPLETED'
        appointment.save()
        return Response({'check_out_time': appointment.check_out_time, 'status': appointment.status})

    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        doctor_id = request.query_params.get('doctor_id')
        date_str = request.query_params.get('date')
        if not doctor_id or not date_str:
            return Response(
                {'error': 'Both doctor_id and date query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if doctor is on approved leave
        on_leave = DoctorLeave.objects.filter(
            doctor_id=doctor_id,
            start_date__lte=target_date,
            end_date__gte=target_date,
            is_approved=True
        ).exists()
        if on_leave:
            return Response({'slots': [], 'message': 'Doctor is on leave on this date.'})

        # Get time slots for this day of week
        day_of_week = target_date.weekday()
        time_slots = TimeSlot.objects.filter(
            doctor_id=doctor_id,
            day_of_week=day_of_week,
            is_active=True
        )

        available = []
        for slot in time_slots:
            # Generate individual slots based on duration
            current_time = datetime.combine(target_date, slot.start_time)
            end_time = datetime.combine(target_date, slot.end_time)
            while current_time + timedelta(minutes=slot.slot_duration) <= end_time:
                slot_time = current_time.time()
                # Count existing appointments at this time
                booked_count = Appointment.objects.filter(
                    doctor_id=doctor_id,
                    appointment_date=target_date,
                    appointment_time=slot_time,
                    status__in=['SCHEDULED', 'COMPLETED']
                ).count()
                if booked_count < slot.max_patients:
                    available.append({
                        'time': slot_time.strftime('%H:%M'),
                        'available_spots': slot.max_patients - booked_count,
                        'max_patients': slot.max_patients,
                    })
                current_time += timedelta(minutes=slot.slot_duration)

        return Response({'slots': available})

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = date.today()
        queryset = self.get_queryset().filter(appointment_date=today)

        # If user is authenticated and has a doctor profile, filter by that doctor
        if request.user.is_authenticated and hasattr(request.user, 'doctor_profile'):
            queryset = queryset.filter(doctor=request.user.doctor_profile)

        queryset = queryset.order_by('appointment_time')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def walk_in(self, request):
        data = request.data.copy()
        data['is_walk_in'] = True
        data['appointment_date'] = date.today().isoformat()
        if 'status' not in data:
            data['status'] = 'SCHEDULED'
        serializer = AppointmentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def suggest_doctors(self, request):
        """Given symptoms text, suggest matching doctors by specialization"""
        symptoms = request.data.get('symptoms', '')
        if not symptoms:
            return Response({'error': 'symptoms field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        specializations = get_specializations_for_symptoms(symptoms)
        doctors = Doctor.objects.filter(specialization__in=specializations)

        if not doctors.exists():
            doctors = Doctor.objects.filter(specialization='GENERAL')

        doctor_data = []
        for doc in doctors:
            doctor_data.append({
                'id': doc.id,
                'name': f"Dr. {doc.first_name} {doc.last_name}",
                'specialization': doc.specialization,
                'specialization_display': doc.get_specialization_display(),
                'consultation_fee': float(doc.consultation_fee) if doc.consultation_fee else 0,
                'experience_years': doc.experience_years or 0,
                'qualification': doc.qualification or '',
            })

        return Response({
            'symptoms': symptoms,
            'matched_specializations': specializations,
            'doctors': doctor_data,
        })

    @action(detail=True, methods=['post'])
    def record_vitals(self, request, pk=None):
        """Staff records vitals for a checked-in patient - MANDATORY before consultation"""
        appointment = self.get_object()
        if appointment.status not in ('SCHEDULED', 'CHECKED_IN'):
            return Response({'error': 'Appointment is not in a valid state for recording vitals.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate required vitals
        required = ['blood_pressure_systolic', 'blood_pressure_diastolic', 'height', 'weight']
        missing = [f for f in required if not request.data.get(f)]
        if missing:
            return Response({'error': f'Missing mandatory vitals: {", ".join(missing)}'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Create vitals record
        from vitals.models import VitalSign
        VitalSign.objects.create(
            patient=appointment.patient,
            appointment=appointment,
            blood_pressure_systolic=request.data.get('blood_pressure_systolic'),
            blood_pressure_diastolic=request.data.get('blood_pressure_diastolic'),
            weight=request.data.get('weight'),
            height=request.data.get('height'),
            temperature=request.data.get('temperature', None),
            pulse_rate=request.data.get('pulse_rate', None),
            oxygen_saturation=request.data.get('oxygen_saturation', None),
            notes=request.data.get('physical_condition', ''),
        )

        appointment.vitals_recorded = True
        if not appointment.check_in_time:
            appointment.check_in_time = timezone.now()
            max_token = Appointment.objects.filter(
                doctor=appointment.doctor,
                appointment_date=appointment.appointment_date,
                token_number__isnull=False
            ).aggregate(Max('token_number'))['token_number__max']
            appointment.token_number = (max_token or 0) + 1
        appointment.status = 'VITALS_RECORDED'
        appointment.checked_in_by = request.user
        if appointment.fees_paid:
            appointment.status = 'READY'
        appointment.save()

        return Response({
            'detail': 'Vitals recorded successfully.',
            'status': appointment.status,
            'vitals_recorded': True,
            'is_ready': appointment.is_ready_for_consultation,
        })

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Staff records consulting fee payment - MANDATORY before consultation"""
        appointment = self.get_object()
        if appointment.fees_paid:
            return Response({'error': 'Fees already paid.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = request.data.get('amount', appointment.doctor.consultation_fee)
        payment_method = request.data.get('payment_method', 'CASH')
        receipt = request.data.get('receipt_number', '')

        appointment.fees_paid = True
        appointment.fee_amount = amount
        appointment.fee_receipt_number = receipt
        if appointment.vitals_recorded:
            appointment.status = 'READY'
        else:
            appointment.status = 'FEES_PAID'
        appointment.save()

        return Response({
            'detail': f'Payment of {amount} recorded.',
            'status': appointment.status,
            'fees_paid': True,
            'is_ready': appointment.is_ready_for_consultation,
        })

    @action(detail=True, methods=['post'])
    def start_consultation(self, request, pk=None):
        """Doctor starts consultation - only if vitals + fees are done"""
        appointment = self.get_object()
        if not appointment.is_ready_for_consultation:
            errors = []
            if not appointment.vitals_recorded:
                errors.append('Vitals not recorded')
            if not appointment.fees_paid:
                errors.append('Consulting fees not paid')
            return Response({
                'error': 'Cannot start consultation. Mandatory steps pending.',
                'pending': errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = 'IN_CONSULTATION'
        appointment.save()
        return Response({'detail': 'Consultation started.', 'status': appointment.status})

    @action(detail=True, methods=['post'])
    def complete_consultation(self, request, pk=None):
        """Doctor completes consultation - prescription must be uploaded"""
        appointment = self.get_object()
        if appointment.status != 'IN_CONSULTATION':
            return Response({'error': 'Consultation has not started.'}, status=status.HTTP_400_BAD_REQUEST)

        if not appointment.prescription_uploaded:
            # Check if a prescription exists for this appointment
            from prescriptions.models import Prescription
            has_prescription = Prescription.objects.filter(appointment=appointment).exists()
            if not has_prescription:
                return Response({
                    'error': 'Prescription is mandatory. Please upload prescription before completing.',
                }, status=status.HTTP_400_BAD_REQUEST)
            appointment.prescription_uploaded = True

        appointment.status = 'COMPLETED'
        appointment.check_out_time = timezone.now()
        appointment.save()
        return Response({
            'detail': 'Consultation completed.',
            'status': appointment.status,
            'prescription_uploaded': appointment.prescription_uploaded,
        })

    @action(detail=True, methods=['get'])
    def workflow_status(self, request, pk=None):
        """Get the current workflow status of an appointment"""
        appointment = self.get_object()
        from prescriptions.models import Prescription
        has_prescription = Prescription.objects.filter(appointment=appointment).exists()

        return Response({
            'appointment_id': appointment.id,
            'status': appointment.status,
            'status_display': appointment.get_status_display(),
            'steps': {
                'booked': True,
                'checked_in': appointment.check_in_time is not None,
                'vitals_recorded': appointment.vitals_recorded,
                'fees_paid': appointment.fees_paid,
                'ready_for_consultation': appointment.is_ready_for_consultation,
                'in_consultation': appointment.status == 'IN_CONSULTATION',
                'prescription_uploaded': has_prescription,
                'completed': appointment.status == 'COMPLETED',
            },
            'token_number': appointment.token_number,
            'fee_amount': appointment.fee_amount,
            'doctor_name': f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}",
            'doctor_fee': appointment.doctor.consultation_fee,
        })


class TimeSlotViewSet(viewsets.ModelViewSet):
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['doctor', 'day_of_week', 'is_active']
    ordering_fields = ['day_of_week', 'start_time']
    ordering = ['day_of_week', 'start_time']
    permission_classes = [IsAdminOrDoctor]


class DoctorLeaveViewSet(viewsets.ModelViewSet):
    queryset = DoctorLeave.objects.all()
    serializer_class = DoctorLeaveSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['doctor', 'is_approved']
    ordering_fields = ['start_date', 'created_at']
    ordering = ['-start_date']
    permission_classes = [IsAdminOrDoctor]


class PatientFeedbackViewSet(viewsets.ModelViewSet):
    queryset = PatientFeedback.objects.select_related('patient', 'doctor', 'appointment').all()
    serializer_class = PatientFeedbackSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'appointment']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def nps_score(self, request):
        """Calculate Net Promoter Score"""
        from django.db.models import Avg
        qs = PatientFeedback.objects.all()
        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date')
        doctor_id = request.query_params.get('doctor_id')
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)

        total = qs.count()
        if total == 0:
            return Response({'nps': 0, 'total': 0, 'message': 'No feedback data'})

        promoters = qs.filter(overall_rating__gte=9).count()
        detractors = qs.filter(overall_rating__lte=6).count()
        nps = round(((promoters - detractors) / total) * 100)

        averages = qs.aggregate(
            avg_overall=Avg('overall_rating'),
            avg_doctor=Avg('doctor_rating'),
            avg_staff=Avg('staff_rating'),
            avg_cleanliness=Avg('cleanliness_rating'),
            avg_wait=Avg('wait_time_rating'),
            avg_billing=Avg('billing_rating'),
        )

        return Response({
            'nps': nps,
            'total_responses': total,
            'promoters': promoters,
            'passives': total - promoters - detractors,
            'detractors': detractors,
            'recommend_pct': round((qs.filter(recommend=True).count() / total) * 100),
            'averages': {k: round(v or 0, 1) for k, v in averages.items()},
        })

    @action(detail=False, methods=['get'])
    def by_doctor(self, request):
        from django.db.models import Avg, Count
        return Response(list(
            PatientFeedback.objects.values('doctor__id', 'doctor__first_name', 'doctor__last_name')
            .annotate(avg_rating=Avg('overall_rating'), total=Count('id'))
            .order_by('-avg_rating')
        ))


class ConsentFormViewSet(viewsets.ModelViewSet):
    """CRUD viewset for digital consent forms with a sign action."""
    queryset = ConsentForm.objects.select_related('appointment', 'patient', 'created_by').all()
    serializer_class = ConsentFormSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['appointment', 'patient', 'consent_type', 'consented']
    search_fields = ['description', 'witness_name']
    ordering_fields = ['created_at', 'consented_at']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """
        Sign a consent form. Expects:
        - patient_signature (base64 string)
        - witness_name (optional)
        - witness_signature (optional, base64 string)
        """
        consent = self.get_object()
        if consent.consented:
            return Response(
                {"error": "This consent form has already been signed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient_signature = request.data.get('patient_signature')
        if not patient_signature:
            return Response(
                {"error": "patient_signature is required to sign the consent form."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consent.patient_signature = patient_signature
        consent.witness_name = request.data.get('witness_name', consent.witness_name)
        consent.witness_signature = request.data.get('witness_signature', consent.witness_signature)
        consent.consented = True
        consent.consented_at = timezone.now()
        consent.save()

        serializer = self.get_serializer(consent)
        return Response(serializer.data)
