from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsAdminOrStaff
from .models import Department, Ward, Bed
from .serializers import (
    DepartmentSerializer,
    DepartmentListSerializer,
    WardSerializer,
    WardDetailSerializer,
    BedSerializer,
    BedDetailSerializer,
)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related('head_doctor').all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'with_stats']:
            return [AllowAny()]
        return [IsAdminOrStaff()]

    def get_serializer_class(self):
        if self.action == 'list':
            return DepartmentListSerializer
        return DepartmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    @action(detail=False, methods=['get'])
    def with_stats(self, request):
        departments = self.get_queryset().annotate(
            doctor_count=Count('head_doctor'),
            ward_count=Count('wards', distinct=True),
            total_beds=Count('wards__beds', distinct=True),
            occupied_beds=Count(
                'wards__beds',
                filter=Q(wards__beds__status='OCCUPIED'),
                distinct=True,
            ),
            available_beds_count=Count(
                'wards__beds',
                filter=Q(wards__beds__status='AVAILABLE'),
                distinct=True,
            ),
        )
        data = []
        for dept in departments:
            serializer = DepartmentSerializer(dept)
            dept_data = serializer.data
            dept_data['stats'] = {
                'doctor_count': dept.doctor_count,
                'ward_count': dept.ward_count,
                'total_beds': dept.total_beds,
                'occupied_beds': dept.occupied_beds,
                'available_beds': dept.available_beds_count,
            }
            data.append(dept_data)
        return Response(data)


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.select_related('department').all()

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'bed_availability']:
            return [AllowAny()]
        return [IsAdminOrStaff()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WardDetailSerializer
        return WardSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        department = self.request.query_params.get('department')
        ward_type = self.request.query_params.get('ward_type')
        if department:
            queryset = queryset.filter(department_id=department)
        if ward_type:
            queryset = queryset.filter(ward_type=ward_type)
        return queryset

    @action(detail=True, methods=['get'])
    def bed_availability(self, request, pk=None):
        ward = self.get_object()
        beds = ward.beds.all()
        serializer = WardDetailSerializer(ward)
        return Response(serializer.data)


class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.select_related('ward', 'ward__department', 'patient').all()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BedDetailSerializer
        return BedSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminOrStaff()]

    def get_queryset(self):
        queryset = super().get_queryset()
        ward = self.request.query_params.get('ward')
        bed_status = self.request.query_params.get('status')
        if ward:
            queryset = queryset.filter(ward_id=ward)
        if bed_status:
            queryset = queryset.filter(status=bed_status)
        return queryset

    @action(detail=True, methods=['post'])
    def admit_patient(self, request, pk=None):
        bed = self.get_object()
        if bed.status == 'OCCUPIED':
            return Response(
                {'error': 'Bed is already occupied.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bed.patient_id = patient_id
        bed.status = 'OCCUPIED'
        bed.admission_date = timezone.now()
        bed.expected_discharge = request.data.get('expected_discharge')
        bed.daily_rate = request.data.get('daily_rate', bed.daily_rate)
        bed.notes = request.data.get('notes', bed.notes)
        bed.save()

        serializer = BedDetailSerializer(bed)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def discharge_patient(self, request, pk=None):
        bed = self.get_object()
        if bed.status != 'OCCUPIED':
            return Response(
                {'error': 'Bed is not currently occupied.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bed.patient = None
        bed.status = 'AVAILABLE'
        bed.admission_date = None
        bed.expected_discharge = None
        bed.notes = request.data.get('notes', '')
        bed.save()

        serializer = BedDetailSerializer(bed)
        return Response(serializer.data, status=status.HTTP_200_OK)
