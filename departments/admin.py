from django.contrib import admin
from .models import Department, Ward, Bed


class BedInline(admin.TabularInline):
    model = Bed
    extra = 0
    fields = [
        'bed_number', 'status', 'patient', 'admission_date',
        'expected_discharge', 'daily_rate',
    ]
    readonly_fields = ['admission_date']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'head_doctor', 'floor',
        'phone_extension', 'is_active',
    ]
    list_filter = ['is_active', 'floor']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'description'),
        }),
        ('Contact & Location', {
            'fields': ('phone_extension', 'email', 'floor'),
        }),
        ('Management', {
            'fields': ('head_doctor', 'is_active'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'department', 'ward_type', 'floor',
        'total_beds', 'is_active',
    ]
    list_filter = ['ward_type', 'is_active', 'department']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [BedInline]


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = [
        'bed_number', 'ward', 'status', 'patient',
        'admission_date', 'daily_rate',
    ]
    list_filter = ['status', 'ward__department', 'ward']
    search_fields = ['bed_number', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['admission_date']
    raw_id_fields = ['patient']
