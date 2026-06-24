from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrStaff
from .models import (
    AssetCategory, Asset, MaintenanceLog, Vendor,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceivedNote, GRNItem, VendorPayment,
)
from .serializers import (
    AssetCategorySerializer,
    AssetSerializer, AssetListSerializer,
    MaintenanceLogSerializer,
    VendorSerializer, VendorListSerializer,
    PurchaseOrderSerializer, PurchaseOrderListSerializer,
    PurchaseOrderItemSerializer,
    GoodsReceivedNoteSerializer, GoodsReceivedNoteListSerializer,
    GRNItemSerializer,
    VendorPaymentSerializer, VendorPaymentListSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']
    permission_classes = [IsAdminOrStaff]


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['asset_type', 'status', 'condition', 'category', 'department']
    search_fields = ['asset_tag', 'name', 'manufacturer', 'serial_number']
    ordering_fields = ['asset_tag', 'name', 'purchase_date', 'purchase_price']
    ordering = ['asset_tag']
    permission_classes = [IsAdminOrStaff]

    def get_serializer_class(self):
        if self.action == 'list':
            return AssetListSerializer
        return AssetSerializer

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        department_id = request.query_params.get('department_id', None)
        if not department_id:
            return Response(
                {"error": "department_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assets = Asset.objects.filter(department_id=department_id)
        serializer = AssetListSerializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def maintenance_due(self, request):
        today = timezone.now().date()
        assets = Asset.objects.filter(
            next_maintenance_date__lte=today,
            status='ACTIVE',
        )
        serializer = AssetListSerializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def warranty_expiring(self, request):
        today = timezone.now().date()
        from datetime import timedelta
        threshold = today + timedelta(days=30)
        assets = Asset.objects.filter(
            warranty_expiry__lte=threshold,
            warranty_expiry__gte=today,
            status='ACTIVE',
        )
        serializer = AssetListSerializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def depreciation_schedule(self, request):
        """
        For each asset, calculate straight-line depreciation:
        - annual_depreciation = (purchase_price - salvage_value) / useful_life_years
        - accumulated_depreciation = annual_depreciation * years_since_purchase
        - book_value = purchase_price - accumulated_depreciation (floored at salvage)
        Assumes useful_life = 10 years, salvage = 10% of purchase_price.
        """
        from decimal import Decimal, ROUND_HALF_UP

        today = timezone.now().date()
        useful_life_years = 10
        salvage_rate = Decimal('0.10')

        assets = Asset.objects.all().order_by('asset_tag')
        schedule = []

        for asset in assets:
            purchase_price = asset.purchase_price
            salvage_value = (purchase_price * salvage_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            depreciable_amount = purchase_price - salvage_value
            annual_depreciation = (depreciable_amount / useful_life_years).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # Calculate years since purchase (fractional)
            days_since_purchase = (today - asset.purchase_date).days
            years_since_purchase = Decimal(str(days_since_purchase)) / Decimal('365.25')
            years_since_purchase = years_since_purchase.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # Cap at useful life
            effective_years = min(years_since_purchase, Decimal(str(useful_life_years)))
            accumulated_depreciation = (annual_depreciation * effective_years).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # Book value cannot go below salvage value
            book_value = purchase_price - accumulated_depreciation
            if book_value < salvage_value:
                book_value = salvage_value
                accumulated_depreciation = purchase_price - salvage_value

            is_fully_depreciated = years_since_purchase >= Decimal(str(useful_life_years))

            schedule.append({
                'asset_id': asset.id,
                'asset_tag': asset.asset_tag,
                'name': asset.name,
                'purchase_date': asset.purchase_date.isoformat(),
                'purchase_price': str(purchase_price),
                'salvage_value': str(salvage_value),
                'useful_life_years': useful_life_years,
                'annual_depreciation': str(annual_depreciation),
                'years_since_purchase': str(years_since_purchase),
                'accumulated_depreciation': str(accumulated_depreciation),
                'book_value': str(book_value),
                'is_fully_depreciated': is_fully_depreciated,
                'status': asset.status,
                'condition': asset.condition,
            })

        # Summary
        total_purchase = sum(Decimal(a['purchase_price']) for a in schedule)
        total_accumulated = sum(Decimal(a['accumulated_depreciation']) for a in schedule)
        total_book_value = sum(Decimal(a['book_value']) for a in schedule)
        fully_depreciated_count = sum(1 for a in schedule if a['is_fully_depreciated'])

        return Response({
            'generated_date': today.isoformat(),
            'assumptions': {
                'useful_life_years': useful_life_years,
                'salvage_rate_percent': 10,
                'method': 'Straight-Line',
            },
            'summary': {
                'total_assets': len(schedule),
                'total_purchase_value': str(total_purchase),
                'total_accumulated_depreciation': str(total_accumulated),
                'total_book_value': str(total_book_value),
                'fully_depreciated_count': fully_depreciated_count,
            },
            'schedule': schedule,
        })


class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['asset', 'maintenance_type', 'status']
    search_fields = ['description', 'performed_by']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
    permission_classes = [IsAdminOrStaff]


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vendor_type', 'is_active']
    search_fields = ['name', 'code', 'contact_person', 'email']
    ordering_fields = ['name', 'rating', 'created_at']
    ordering = ['name']
    permission_classes = [IsAdminOrStaff]

    def get_serializer_class(self):
        if self.action == 'list':
            return VendorListSerializer
        return VendorSerializer


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'vendor', 'department']
    search_fields = ['po_number', 'vendor__name']
    ordering_fields = ['order_date', 'total_amount', 'created_at']
    ordering = ['-order_date']
    permission_classes = [IsAdminOrStaff]

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseOrderListSerializer
        return PurchaseOrderSerializer

    @action(detail=False, methods=['get'])
    def by_vendor(self, request):
        vendor_id = request.query_params.get('vendor_id', None)
        if not vendor_id:
            return Response(
                {"error": "vendor_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orders = PurchaseOrder.objects.filter(vendor_id=vendor_id)
        serializer = PurchaseOrderListSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        orders = PurchaseOrder.objects.filter(
            status__in=['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED']
        )
        serializer = PurchaseOrderListSerializer(orders, many=True)
        return Response(serializer.data)


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['purchase_order']
    permission_classes = [IsAdminOrStaff]


class GoodsReceivedNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceivedNote.objects.all()
    serializer_class = GoodsReceivedNoteSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['purchase_order', 'status']
    search_fields = ['grn_number', 'invoice_number']
    ordering_fields = ['received_date', 'created_at']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return GoodsReceivedNoteListSerializer
        return GoodsReceivedNoteSerializer

    @action(detail=False, methods=['post'])
    def receive(self, request):
        """Create a GRN and update PO item received quantities."""
        serializer = GoodsReceivedNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grn = serializer.save(received_by=request.user)

        items_data = request.data.get('items', [])
        for item_data in items_data:
            grn_item = GRNItem.objects.create(
                grn=grn,
                po_item_id=item_data['po_item'],
                received_quantity=item_data['received_quantity'],
                accepted_quantity=item_data['accepted_quantity'],
                rejected_quantity=item_data.get('rejected_quantity', 0),
                rejection_reason=item_data.get('rejection_reason', ''),
            )
            # Update PO item received_quantity
            po_item = grn_item.po_item
            po_item.received_quantity += grn_item.accepted_quantity
            po_item.save()

        # Update PO status based on received quantities
        po = grn.purchase_order
        all_received = all(
            item.received_quantity >= item.quantity
            for item in po.items.all()
        )
        any_received = any(
            item.received_quantity > 0
            for item in po.items.all()
        )
        if all_received:
            po.status = 'RECEIVED'
            grn.status = 'COMPLETE'
            grn.save()
        elif any_received:
            po.status = 'PARTIALLY_RECEIVED'
        po.save()

        return Response(
            GoodsReceivedNoteSerializer(grn).data,
            status=status.HTTP_201_CREATED,
        )


class GRNItemViewSet(viewsets.ModelViewSet):
    queryset = GRNItem.objects.all()
    serializer_class = GRNItemSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['grn']
    permission_classes = [IsAuthenticated]


class VendorPaymentViewSet(viewsets.ModelViewSet):
    queryset = VendorPayment.objects.all()
    serializer_class = VendorPaymentSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vendor', 'status', 'purchase_order']
    search_fields = ['payment_number', 'transaction_reference']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return VendorPaymentListSerializer
        return VendorPaymentSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a vendor payment."""
        payment = self.get_object()
        if payment.status != 'DRAFT':
            return Response(
                {"error": "Only DRAFT payments can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payment.status = 'APPROVED'
        payment.approved_by = request.user
        payment.save()
        return Response(VendorPaymentSerializer(payment).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark an approved payment as paid."""
        payment = self.get_object()
        if payment.status != 'APPROVED':
            return Response(
                {"error": "Only APPROVED payments can be marked as paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payment.status = 'PAID'
        payment.transaction_reference = request.data.get(
            'transaction_reference', payment.transaction_reference
        )
        payment.save()
        return Response(VendorPaymentSerializer(payment).data)
