from django.contrib import admin
from .models import Doctor, DoctorReview


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


@admin.register(DoctorReview)
class DoctorReviewAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'patient', 'rating', 'is_anonymous', 'created_at')
    search_fields = ('doctor__first_name', 'doctor__last_name', 'patient__first_name', 'patient__last_name')
    list_filter = ('rating', 'is_anonymous', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
