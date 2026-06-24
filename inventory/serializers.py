from rest_framework import serializers
from .models import (
    AssetCategory, Asset, MaintenanceLog, Vendor,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceivedNote, GRNItem, VendorPayment,
)


class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['asset_tag']


class AssetListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            'id', 'asset_tag', 'name', 'category', 'asset_type',
            'location', 'status', 'condition', 'department',
        ]


class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = '__all__'


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'


class VendorListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'code', 'vendor_type', 'contact_person', 'phone', 'is_active', 'rating']


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['po_number']


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'vendor', 'department', 'status',
            'order_date', 'total_amount',
        ]


class GRNItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GRNItem
        fields = '__all__'


class GoodsReceivedNoteSerializer(serializers.ModelSerializer):
    items = GRNItemSerializer(many=True, read_only=True)

    class Meta:
        model = GoodsReceivedNote
        fields = '__all__'
        read_only_fields = ['grn_number']


class GoodsReceivedNoteListSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoodsReceivedNote
        fields = [
            'id', 'grn_number', 'purchase_order', 'received_date',
            'status', 'invoice_number', 'invoice_amount',
        ]


class VendorPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorPayment
        fields = '__all__'
        read_only_fields = ['payment_number']


class VendorPaymentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorPayment
        fields = [
            'id', 'payment_number', 'vendor', 'amount',
            'net_amount', 'payment_date', 'status',
        ]
