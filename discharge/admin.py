from django.contrib import admin
from .models import DischargeSummary, FollowUp, Readmission


@admin.register(DischargeSummary)
class DischargeSummaryAdmin(admin.ModelAdmin):
    list_display = ('summary_number', 'patient', 'doctor', 'admission_date', 'discharge_date', 'discharge_type', 'status')
    search_fields = ('summary_number', 'patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name')
    list_filter = ('discharge_type', 'status', 'discharge_date')
    readonly_fields = ('summary_number', 'created_at', 'updated_at')
    fieldsets = (
        ('General', {
            'fields': ('summary_number', 'patient', 'doctor', 'appointment', 'status', 'approved_by')
        }),
        ('Dates', {
            'fields': ('admission_date', 'discharge_date', 'discharge_type')
        }),
        ('Diagnosis & Treatment', {
            'fields': ('admission_diagnosis', 'discharge_diagnosis', 'procedures_performed',
                       'treatment_given', 'condition_at_discharge')
        }),
        ('Discharge Instructions', {
            'fields': ('medications_on_discharge', 'dietary_instructions', 'activity_restrictions',
                       'follow_up_instructions', 'follow_up_date', 'emergency_instructions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(FollowUp)
class FollowUpAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'scheduled_date', 'follow_up_type', 'status', 'completed_date')
    search_fields = ('patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name')
    list_filter = ('follow_up_type', 'status', 'scheduled_date')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Readmission)
class ReadmissionAdmin(admin.ModelAdmin):
    list_display = ('patient', 'original_discharge', 'readmission_date', 'is_related_to_original', 'days_since_discharge')
    search_fields = ('patient__first_name', 'patient__last_name', 'reason')
    list_filter = ('is_related_to_original', 'readmission_date')
    readonly_fields = ('days_since_discharge', 'created_at')
