from django.contrib import admin
from .models import Doctor
@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'specialization', 'experience_years', 'email')
    search_fields = ('first_name', 'last_name', 'email', 'specialization')
    list_filter = ('specialization', 'experience_years')
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'email', 'phone_number')
        }),
        ('Professional Information', {
            'fields': ('specialization', 'license_number', 'qualification', 'experience_years', 'consultation_fee', 'bio')
        }),
        ('Availability', {
            'fields': ('available_days', 'available_hours_start', 'available_hours_end')
        }),
    )

