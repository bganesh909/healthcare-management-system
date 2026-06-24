from django.contrib import admin
from .models import (
    LabTestCategory,
    LabTest,
    LabOrder,
    LabOrderItem,
    LabReport,
)


@admin.register(LabTestCategory)
class LabTestCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name', 'category', 'price',
        'requires_fasting', 'is_active',
    ]
    list_filter = ['category', 'requires_fasting', 'is_active']
    search_fields = ['name', 'code']
    list_editable = ['is_active']


class LabOrderItemInline(admin.TabularInline):
    model = LabOrderItem
    extra = 0
    readonly_fields = ['completed_at']


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'patient', 'doctor', 'status',
        'priority', 'total_amount', 'created_at',
    ]
    list_filter = ['status', 'priority', 'created_at']
    search_fields = [
        'order_number',
        'patient__first_name', 'patient__last_name',
        'doctor__first_name', 'doctor__last_name',
    ]
    readonly_fields = ['order_number', 'total_amount', 'created_at', 'updated_at']
    inlines = [LabOrderItemInline]
    date_hierarchy = 'created_at'


@admin.register(LabOrderItem)
class LabOrderItemAdmin(admin.ModelAdmin):
    list_display = [
        'lab_order', 'test', 'status',
        'result_value', 'is_abnormal', 'completed_at',
    ]
    list_filter = ['status', 'is_abnormal']
    search_fields = ['lab_order__order_number', 'test__name']


@admin.register(LabReport)
class LabReportAdmin(admin.ModelAdmin):
    list_display = [
        'lab_order', 'reported_by', 'verified_by', 'reported_at',
    ]
    search_fields = [
        'lab_order__order_number', 'reported_by', 'verified_by',
    ]
    readonly_fields = ['reported_at']
