from django.contrib import admin
from .models import VitalSign, ClinicalNote, TreatmentPlan, Allergy


@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    list_display = ('patient', 'recorded_by', 'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'pulse_rate', 'oxygen_saturation', 'bmi', 'recorded_at')
    search_fields = ('patient__first_name', 'patient__last_name', 'notes')
    list_filter = ('recorded_at', 'recorded_by')
    readonly_fields = ('bmi', 'recorded_at')


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'note_type', 'is_confidential', 'created_at', 'updated_at')
    search_fields = ('patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name', 'subjective', 'objective', 'assessment', 'plan', 'content')
    list_filter = ('note_type', 'is_confidential', 'created_at')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TreatmentPlan)
class TreatmentPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'patient', 'doctor', 'status', 'start_date', 'end_date', 'review_date', 'created_at')
    search_fields = ('title', 'diagnosis', 'patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name')
    list_filter = ('status', 'start_date', 'created_at')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    list_display = ('patient', 'allergen', 'allergy_type', 'severity', 'is_active', 'first_observed', 'created_at')
    search_fields = ('allergen', 'reaction', 'patient__first_name', 'patient__last_name')
    list_filter = ('allergy_type', 'severity', 'is_active', 'created_at')
    readonly_fields = ('created_at',)
