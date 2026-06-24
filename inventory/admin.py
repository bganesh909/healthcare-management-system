from django.contrib import admin
from .models import AssetCategory, Asset, MaintenanceLog, Vendor, PurchaseOrder, PurchaseOrderItem


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_tag', 'name', 'asset_type', 'status', 'condition', 'department', 'location')
    search_fields = ('asset_tag', 'name', 'manufacturer', 'serial_number')
    list_filter = ('asset_type', 'status', 'condition', 'department')
    readonly_fields = ('asset_tag', 'created_at', 'updated_at')


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ('asset', 'maintenance_type', 'date', 'performed_by', 'status', 'cost')
    search_fields = ('asset__asset_tag', 'asset__name', 'performed_by')
    list_filter = ('maintenance_type', 'status')
    readonly_fields = ('created_at',)


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'vendor_type', 'contact_person', 'phone', 'is_active', 'rating')
    search_fields = ('name', 'code', 'contact_person', 'email')
    list_filter = ('vendor_type', 'is_active')
    readonly_fields = ('created_at',)


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'vendor', 'department', 'status', 'order_date', 'total_amount')
    search_fields = ('po_number', 'vendor__name')
    list_filter = ('status', 'vendor')
    readonly_fields = ('po_number', 'created_at', 'updated_at')
    inlines = [PurchaseOrderItemInline]


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = ('purchase_order', 'description', 'quantity', 'unit_price', 'total_price', 'received_quantity')
    search_fields = ('description', 'purchase_order__po_number')
