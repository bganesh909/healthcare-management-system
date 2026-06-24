from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Sum
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsClinicalStaff
from .models import BloodDonor, BloodUnit, BloodRequest, CrossMatch
from .serializers import (
    BloodDonorSerializer, BloodUnitSerializer,
    BloodRequestSerializer, CrossMatchSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class BloodDonorViewSet(viewsets.ModelViewSet):
    queryset = BloodDonor.objects.all()
    serializer_class = BloodDonorSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['blood_group', 'gender', 'is_eligible']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']
    ordering_fields = ['last_name', 'first_name', 'created_at', 'last_donation_date']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def eligible_donors(self, request):
        donors = BloodDonor.objects.filter(is_eligible=True)
        blood_group = request.query_params.get('blood_group', None)
        if blood_group:
            donors = donors.filter(blood_group=blood_group)
        serializer = BloodDonorSerializer(donors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_blood_group(self, request):
        blood_group = request.query_params.get('blood_group', None)
        if blood_group:
            donors = BloodDonor.objects.filter(blood_group=blood_group)
            serializer = BloodDonorSerializer(donors, many=True)
            return Response(serializer.data)
        return Response(
            {"error": "blood_group parameter is required"},
            status=status.HTTP_400_BAD_REQUEST
        )


class BloodUnitViewSet(viewsets.ModelViewSet):
    queryset = BloodUnit.objects.all()
    serializer_class = BloodUnitSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['blood_group', 'component_type', 'status', 'is_tested']
    search_fields = ['unit_number', 'storage_location', 'tested_by']
    ordering_fields = ['collection_date', 'expiry_date', 'created_at']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def available_units(self, request):
        units = BloodUnit.objects.filter(status='AVAILABLE')
        blood_group = request.query_params.get('blood_group', None)
        component_type = request.query_params.get('component_type', None)
        if blood_group:
            units = units.filter(blood_group=blood_group)
        if component_type:
            units = units.filter(component_type=component_type)
        serializer = BloodUnitSerializer(units, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_blood_group(self, request):
        blood_group = request.query_params.get('blood_group', None)
        if blood_group:
            units = BloodUnit.objects.filter(blood_group=blood_group)
            serializer = BloodUnitSerializer(units, many=True)
            return Response(serializer.data)
        return Response(
            {"error": "blood_group parameter is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        try:
            days = int(request.query_params.get('days', 7))
        except (ValueError, TypeError):
            days = 7
        threshold = timezone.now().date() + timedelta(days=days)
        units = BloodUnit.objects.filter(
            status='AVAILABLE',
            expiry_date__lte=threshold
        )
        serializer = BloodUnitSerializer(units, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stock_summary(self, request):
        summary = BloodUnit.objects.filter(status='AVAILABLE').values(
            'blood_group', 'component_type'
        ).annotate(
            count=Count('id'),
            total_volume=Sum('volume_ml')
        ).order_by('blood_group', 'component_type')
        return Response(list(summary))


class BloodRequestViewSet(viewsets.ModelViewSet):
    queryset = BloodRequest.objects.all()
    serializer_class = BloodRequestSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['blood_group', 'component_type', 'priority', 'status', 'patient', 'doctor']
    search_fields = ['request_number', 'reason', 'approved_by']
    ordering_fields = ['created_at', 'required_date', 'priority']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        blood_request = self.get_object()
        approved_by = request.data.get('approved_by', '')
        if blood_request.status != 'PENDING':
            return Response(
                {"error": "Only pending requests can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )
        blood_request.status = 'APPROVED'
        blood_request.approved_by = approved_by
        blood_request.save()
        serializer = BloodRequestSerializer(blood_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        blood_request = self.get_object()
        if blood_request.status not in ['APPROVED', 'CROSS_MATCHED']:
            return Response(
                {"error": "Only approved or cross-matched requests can be issued"},
                status=status.HTTP_400_BAD_REQUEST
            )
        blood_request.status = 'ISSUED'
        blood_request.save()
        serializer = BloodRequestSerializer(blood_request)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        requests = BloodRequest.objects.filter(patient_id=patient_id)
        serializer = BloodRequestSerializer(requests, many=True)
        return Response(serializer.data)


class CrossMatchViewSet(viewsets.ModelViewSet):
    queryset = CrossMatch.objects.all()
    serializer_class = CrossMatchSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['blood_request', 'blood_unit', 'patient', 'result']
    ordering_fields = ['tested_at']
    ordering = ['-tested_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def by_request(self, request):
        request_id = request.query_params.get('request_id', None)
        if not request_id:
            return Response(
                {"error": "request_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        cross_matches = CrossMatch.objects.filter(blood_request_id=request_id)
        serializer = CrossMatchSerializer(cross_matches, many=True)
        return Response(serializer.data)
