from django.contrib import admin
from .models import (
    Prescription, PrescriptionItem, MedicalRecord,
    DrugInteraction, PrescriptionTemplate,
)


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 1
    fields = ['medicine_name', 'dosage', 'frequency', 'duration', 'instructions']


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    inlines = [PrescriptionItemInline]
    list_display = ['id', 'patient', 'doctor', 'diagnosis_short', 'follow_up_date', 'created_at']
    list_filter = ['doctor', 'follow_up_date', 'created_at']
    search_fields = [
        'patient__first_name', 'patient__last_name',
        'doctor__first_name', 'doctor__last_name',
        'diagnosis',
    ]
    raw_id_fields = ['patient', 'doctor', 'appointment']
    date_hierarchy = 'created_at'

    @admin.display(description='Diagnosis')
    def diagnosis_short(self, obj):
        return obj.diagnosis[:80] + '...' if len(obj.diagnosis) > 80 else obj.diagnosis


@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'doctor', 'record_type', 'title', 'record_date', 'created_at']
    list_filter = ['record_type', 'record_date', 'created_at']
    search_fields = [
        'patient__first_name', 'patient__last_name',
        'doctor__first_name', 'doctor__last_name',
        'title', 'description',
    ]
    raw_id_fields = ['patient', 'doctor']
    date_hierarchy = 'record_date'


@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    list_display = ['drug_a', 'drug_b', 'severity']
    list_filter = ['severity']
    search_fields = ['drug_a', 'drug_b', 'description']


@admin.register(PrescriptionTemplate)
class PrescriptionTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'diagnosis', 'doctor', 'is_global', 'created_at']
    list_filter = ['is_global', 'created_at']
    search_fields = ['name', 'diagnosis']
    raw_id_fields = ['doctor']
