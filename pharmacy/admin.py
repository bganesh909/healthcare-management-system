from django.contrib import admin
from .models import MedicineCategory, Medicine, MedicineOrder, MedicineOrderItem


@admin.register(MedicineCategory)
class MedicineCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)


class MedicineOrderItemInline(admin.TabularInline):
    model = MedicineOrderItem
    extra = 0
    readonly_fields = ('total_price',)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'generic_name', 'category', 'form', 'strength',
        'unit_price', 'stock_quantity', 'reorder_level',
        'requires_prescription', 'is_active', 'expiry_date',
    )
    list_filter = ('category', 'form', 'requires_prescription', 'is_active')
    search_fields = ('name', 'generic_name', 'manufacturer')
    list_editable = ('stock_quantity', 'unit_price', 'is_active')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'generic_name', 'category', 'manufacturer')
        }),
        ('Form & Dosage', {
            'fields': ('form', 'strength')
        }),
        ('Pricing & Stock', {
            'fields': ('unit_price', 'stock_quantity', 'reorder_level')
        }),
        ('Other', {
            'fields': ('expiry_date', 'requires_prescription', 'is_active')
        }),
    )


@admin.register(MedicineOrder)
class MedicineOrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number', 'patient', 'prescribed_by', 'status',
        'total_amount', 'created_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'order_number', 'patient__first_name', 'patient__last_name',
    )
    readonly_fields = ('order_number', 'total_amount', 'created_at', 'updated_at')
    inlines = [MedicineOrderItemInline]


@admin.register(MedicineOrderItem)
class MedicineOrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'medicine', 'quantity', 'unit_price', 'total_price')
    list_filter = ('order__status',)
    search_fields = ('medicine__name', 'order__order_number')
    readonly_fields = ('total_price',)
