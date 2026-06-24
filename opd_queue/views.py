from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsClinicalStaff
from .models import QueueEntry, QueueDisplay
from .serializers import (
    QueueEntrySerializer,
    QueueEntryListSerializer,
    QueueDisplaySerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class QueueEntryViewSet(viewsets.ModelViewSet):
    queryset = QueueEntry.objects.all()
    serializer_class = QueueEntrySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'queue_type', 'doctor', 'department', 'date']
    search_fields = ['token_number', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['check_in_time', 'priority', 'position']
    ordering = ['priority', 'check_in_time']
    permission_classes = [IsClinicalStaff]

    def get_serializer_class(self):
        if self.action == 'list':
            return QueueEntryListSerializer
        return QueueEntrySerializer

    @action(detail=False, methods=['get'])
    def today_queue(self, request):
        today = timezone.now().date()
        entries = QueueEntry.objects.filter(date=today).order_by('priority', 'check_in_time')
        serializer = QueueEntryListSerializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_doctor(self, request):
        doctor_id = request.query_params.get('doctor_id', None)
        if not doctor_id:
            return Response(
                {"error": "doctor_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        today = timezone.now().date()
        entries = QueueEntry.objects.filter(
            doctor_id=doctor_id, date=today
        ).order_by('priority', 'check_in_time')
        serializer = QueueEntryListSerializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def call_next(self, request):
        doctor_id = request.data.get('doctor_id', None)
        if not doctor_id:
            return Response(
                {"error": "doctor_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        today = timezone.now().date()
        next_entry = QueueEntry.objects.filter(
            doctor_id=doctor_id,
            date=today,
            status='WAITING',
        ).order_by('priority', 'check_in_time').first()

        if not next_entry:
            return Response(
                {"message": "No patients waiting in queue"},
                status=status.HTTP_404_NOT_FOUND,
            )

        next_entry.status = 'IN_CONSULTATION'
        next_entry.called_time = timezone.now()
        next_entry.consultation_start = timezone.now()
        next_entry.save()

        # Update display if exists
        display = QueueDisplay.objects.filter(doctor_id=doctor_id, is_active=True).first()
        if display:
            display.current_token = next_entry.token_number
            waiting = QueueEntry.objects.filter(
                doctor_id=doctor_id, date=today, status='WAITING'
            ).order_by('priority', 'check_in_time')[:5]
            display.next_tokens = ','.join([e.token_number for e in waiting])
            display.save()

        serializer = QueueEntrySerializer(next_entry)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        entry = self.get_object()
        entry.status = 'COMPLETED'
        entry.consultation_end = timezone.now()
        entry.save()
        serializer = QueueEntrySerializer(entry)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def skip(self, request, pk=None):
        entry = self.get_object()
        entry.status = 'SKIPPED'
        entry.save()
        serializer = QueueEntrySerializer(entry)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estimated_wait(self, request):
        doctor_id = request.query_params.get('doctor_id', None)
        if not doctor_id:
            return Response(
                {"error": "doctor_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        today = timezone.now().date()
        waiting_count = QueueEntry.objects.filter(
            doctor_id=doctor_id, date=today, status='WAITING'
        ).count()
        display = QueueDisplay.objects.filter(doctor_id=doctor_id, is_active=True).first()
        avg_time = display.avg_wait_time_minutes if display else 15
        # M/M/1 Queue Theory: Wq = λ/(μ(μ-λ)) where λ=arrival rate, μ=service rate
        # Simplified: estimate = position * avg_consultation_time * utilization_factor
        from appointments.models import Appointment
        from datetime import date as dt_date

        # Calculate average consultation time from completed appointments
        completed = Appointment.objects.filter(
            doctor_id=doctor_id, status='COMPLETED',
            check_in_time__isnull=False, check_out_time__isnull=False,
            appointment_date__gte=dt_date.today() - timezone.timedelta(days=30),
        )
        consultation_times = []
        for appt in completed[:50]:
            dur = (appt.check_out_time - appt.check_in_time).total_seconds() / 60
            if 0 < dur < 120:
                consultation_times.append(dur)

        avg_consult = round(sum(consultation_times) / len(consultation_times), 1) if consultation_times else avg_time

        # Utilization factor (rho): arrivals per hour / service rate per hour
        in_consultation = QueueEntry.objects.filter(
            doctor_id=doctor_id, date=timezone.now().date(), status='IN_CONSULTATION'
        ).count()
        servers = max(in_consultation, 1)
        rho = min(waiting_count / (servers * 4), 0.95) if servers else 0.5  # Cap at 95%

        # Enhanced wait estimate with utilization
        estimated_minutes = round(waiting_count * avg_consult * (1 + rho), 0)

        return Response({
            "doctor_id": doctor_id,
            "waiting_count": waiting_count,
            "in_consultation": in_consultation,
            "avg_consultation_minutes": avg_consult,
            "utilization_factor": round(rho, 2),
            "estimated_wait_minutes": estimated_minutes,
            "confidence": "High" if len(consultation_times) >= 10 else "Low (insufficient data)",
        })


class QueueDisplayViewSet(viewsets.ModelViewSet):
    queryset = QueueDisplay.objects.all()
    serializer_class = QueueDisplaySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department', 'doctor', 'is_active']
    search_fields = ['display_name']
    ordering_fields = ['updated_at', 'display_name']
    ordering = ['department', 'display_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'active_displays', 'by_department']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsClinicalStaff]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def active_displays(self, request):
        displays = QueueDisplay.objects.filter(is_active=True)
        if displays.exists():
            serializer = QueueDisplaySerializer(displays, many=True)
            return Response(serializer.data)

        # Fallback: auto-generate displays from today's queue entries
        today = timezone.now().date()
        today_entries = QueueEntry.objects.filter(
            date=today,
            status__in=['WAITING', 'IN_CONSULTATION', 'CHECKED_IN'],
        ).select_related('doctor', 'patient', 'department')

        # Group by doctor
        from collections import OrderedDict
        doctor_groups = OrderedDict()
        for entry in today_entries.order_by('doctor_id', 'priority', 'check_in_time'):
            did = entry.doctor_id
            if did not in doctor_groups:
                doctor_groups[did] = {
                    'id': f'auto-{did}',
                    'doctor_name': f"Dr. {entry.doctor.first_name} {entry.doctor.last_name}",
                    'department_name': entry.department.name if entry.department else (
                        entry.doctor.get_specialization_display() if hasattr(entry.doctor, 'get_specialization_display') else ''
                    ),
                    'avg_wait_time_minutes': 15,
                    'average_wait_time': 15,
                    'is_active': True,
                    'queue_entries': [],
                }
            doctor_groups[did]['queue_entries'].append({
                'id': entry.id,
                'token_number': entry.token_number,
                'patient_name': f"{entry.patient.first_name} {entry.patient.last_name}",
                'patient': entry.patient_id,
                'doctor': entry.doctor_id,
                'doctor_name': f"Dr. {entry.doctor.first_name} {entry.doctor.last_name}",
                'queue_type': entry.queue_type,
                'status': entry.status,
                'priority': entry.priority,
                'check_in_time': entry.check_in_time.isoformat() if entry.check_in_time else None,
                'estimated_wait_minutes': entry.estimated_wait_minutes,
                'position': entry.position,
            })

        return Response(list(doctor_groups.values()))

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        department_id = request.query_params.get('department_id', None)
        if not department_id:
            return Response(
                {"error": "department_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        displays = QueueDisplay.objects.filter(
            department_id=department_id, is_active=True
        )
        serializer = QueueDisplaySerializer(displays, many=True)
        return Response(serializer.data)
