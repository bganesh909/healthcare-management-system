from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from users.permissions import IsClinicalStaff
from .models import ImagingType, ImagingOrder, ImagingReport
from .serializers import (
    ImagingTypeSerializer,
    ImagingOrderSerializer,
    ImagingReportSerializer,
)


class ImagingTypeViewSet(viewsets.ModelViewSet):
    queryset = ImagingType.objects.all()
    serializer_class = ImagingTypeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['requires_contrast', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'base_price']
    permission_classes = [IsClinicalStaff]


class ImagingOrderViewSet(viewsets.ModelViewSet):
    queryset = ImagingOrder.objects.select_related(
        'patient', 'doctor', 'appointment', 'imaging_type'
    ).all()
    serializer_class = ImagingOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'status', 'priority', 'imaging_type']
    search_fields = ['order_number', 'patient__first_name', 'patient__last_name', 'body_part']
    ordering_fields = ['created_at', 'scheduled_date', 'price']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'], url_path='by-patient')
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orders = self.get_queryset().filter(patient_id=patient_id)
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = ImagingOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ImagingOrderSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-doctor')
    def by_doctor(self, request):
        doctor_id = request.query_params.get('doctor_id')
        if not doctor_id:
            return Response(
                {'error': 'doctor_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orders = self.get_queryset().filter(doctor_id=doctor_id)
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = ImagingOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ImagingOrderSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pending-reports')
    def pending_reports(self, request):
        orders = self.get_queryset().filter(
            status='COMPLETED'
        ).exclude(
            report__isnull=False
        )
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = ImagingOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ImagingOrderSerializer(orders, many=True)
        return Response(serializer.data)


class ImagingReportViewSet(viewsets.ModelViewSet):
    queryset = ImagingReport.objects.select_related('imaging_order').all()
    serializer_class = ImagingReportSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['imaging_order', 'severity']
    ordering_fields = ['reported_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'], url_path='by-severity')
    def by_severity(self, request):
        severity = request.query_params.get('severity')
        if not severity:
            return Response(
                {'error': 'severity query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reports = self.get_queryset().filter(severity=severity.upper())
        page = self.paginate_queryset(reports)
        if page is not None:
            serializer = ImagingReportSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ImagingReportSerializer(reports, many=True)
        return Response(serializer.data)
