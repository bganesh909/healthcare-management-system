from django.db import models, transaction
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrStaff, IsClinicalStaff
from .models import MedicineCategory, Medicine, MedicineOrder, MedicineOrderItem
from .serializers import (
    MedicineCategorySerializer,
    MedicineSerializer,
    MedicineListSerializer,
    MedicineOrderSerializer,
    MedicineOrderCreateSerializer,
    MedicineOrderDetailSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class MedicineCategoryViewSet(viewsets.ModelViewSet):
    queryset = MedicineCategory.objects.all()
    serializer_class = MedicineCategorySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsClinicalStaff]
        else:
            permission_classes = [IsAdminOrStaff]
        return [permission() for permission in permission_classes]


class MedicineViewSet(viewsets.ModelViewSet):
    queryset = Medicine.objects.select_related('category').all()
    serializer_class = MedicineSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'form', 'requires_prescription', 'is_active']
    search_fields = ['name', 'generic_name', 'manufacturer']
    ordering_fields = ['name', 'unit_price', 'stock_quantity', 'expiry_date', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'low_stock', 'expired']:
            permission_classes = [IsClinicalStaff]
        else:
            permission_classes = [IsAdminOrStaff]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicineListSerializer
        return MedicineSerializer

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Return medicines where stock_quantity <= reorder_level."""
        medicines = Medicine.objects.select_related('category').filter(
            stock_quantity__lte=models.F('reorder_level'),
            is_active=True,
        )
        page = self.paginate_queryset(medicines)
        if page is not None:
            serializer = MedicineListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = MedicineListSerializer(medicines, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Return medicines that have expired."""
        today = timezone.now().date()
        medicines = Medicine.objects.select_related('category').filter(
            expiry_date__lt=today,
            is_active=True,
        )
        page = self.paginate_queryset(medicines)
        if page is not None:
            serializer = MedicineListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = MedicineListSerializer(medicines, many=True)
        return Response(serializer.data)


class MedicineOrderViewSet(viewsets.ModelViewSet):
    queryset = MedicineOrder.objects.select_related(
        'patient', 'prescribed_by', 'prescription'
    ).prefetch_related('items__medicine').all()
    serializer_class = MedicineOrderSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'status', 'prescribed_by']
    search_fields = ['order_number', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['created_at', 'total_amount', 'status']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'by_patient']:
            permission_classes = [IsClinicalStaff]
        elif self.action == 'dispense':
            permission_classes = [IsClinicalStaff]
        else:
            permission_classes = [IsAdminOrStaff]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return MedicineOrderCreateSerializer
        if self.action == 'retrieve':
            return MedicineOrderDetailSerializer
        return MedicineOrderSerializer

    @action(detail=True, methods=['post'])
    def dispense(self, request, pk=None):
        """Mark order as DISPENSED and deduct stock for each item."""
        order = self.get_object()

        if order.status == 'DISPENSED':
            return Response(
                {"error": "Order has already been dispensed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.status == 'CANCELLED':
            return Response(
                {"error": "Cannot dispense a cancelled order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate stock availability before dispensing
        for item in order.items.select_related('medicine').all():
            if item.medicine.stock_quantity < item.quantity:
                return Response(
                    {
                        "error": (
                            f"Insufficient stock for '{item.medicine.name}'. "
                            f"Available: {item.medicine.stock_quantity}, "
                            f"Required: {item.quantity}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            for item in order.items.select_related('medicine').all():
                medicine = item.medicine
                medicine.stock_quantity -= item.quantity
                medicine.save(update_fields=['stock_quantity'])
            order.status = 'DISPENSED'
            order.save(update_fields=['status', 'updated_at'])

        serializer = MedicineOrderDetailSerializer(order)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Return orders filtered by patient ID."""
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orders = self.get_queryset().filter(patient_id=patient_id)
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = MedicineOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = MedicineOrderSerializer(orders, many=True)
        return Response(serializer.data)
