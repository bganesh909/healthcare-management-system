from django.contrib import admin
from .models import Patient, PatientDocument


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'phone_number', 'date_of_birth')
    search_fields = ('first_name', 'last_name', 'email', 'phone_number')
    list_filter = ('gender', 'blood_group')
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'date_of_birth', 'gender', 'email', 'phone_number')
        }),
        ('Medical Information', {
            'fields': ('blood_group', 'medical_history', 'allergies')
        }),
        ('Address & Emergency Contact', {
            'fields': ('address', 'emergency_contact_name', 'emergency_contact_number')
        }),
    )


@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'patient', 'document_type', 'uploaded_at')
    search_fields = ('title', 'patient__first_name', 'patient__last_name')
    list_filter = ('document_type', 'uploaded_at')
    readonly_fields = ('uploaded_at',)
