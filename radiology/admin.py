from django.contrib import admin
from .models import ImagingType, ImagingOrder, ImagingReport


@admin.register(ImagingType)
class ImagingTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'base_price', 'turnaround_time', 'requires_contrast', 'is_active')
    search_fields = ('name', 'code')
    list_filter = ('requires_contrast', 'is_active')


@admin.register(ImagingOrder)
class ImagingOrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'patient', 'doctor', 'imaging_type', 'body_part', 'priority', 'status', 'created_at')
    search_fields = ('order_number', 'patient__first_name', 'patient__last_name', 'body_part')
    list_filter = ('status', 'priority', 'imaging_type')
    readonly_fields = ('order_number', 'created_at', 'updated_at')


@admin.register(ImagingReport)
class ImagingReportAdmin(admin.ModelAdmin):
    list_display = ('imaging_order', 'reported_by', 'severity', 'reported_at', 'verified_at')
    search_fields = ('imaging_order__order_number', 'reported_by', 'verified_by')
    list_filter = ('severity', 'reported_at')
    readonly_fields = ('reported_at',)
