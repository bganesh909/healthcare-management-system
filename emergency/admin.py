from django.contrib import admin
from .models import EmergencyVisit, Ambulance, AmbulanceDispatch, EmergencyContact


@admin.register(EmergencyVisit)
class EmergencyVisitAdmin(admin.ModelAdmin):
    list_display = ('visit_number', 'patient', 'triage_level', 'status', 'arrival_mode', 'arrival_time', 'is_critical')
    search_fields = ('visit_number', 'patient__first_name', 'patient__last_name', 'chief_complaint')
    list_filter = ('status', 'triage_level', 'arrival_mode', 'is_critical')
    readonly_fields = ('visit_number', 'created_at', 'updated_at')
    fieldsets = (
        ('Visit Information', {
            'fields': ('visit_number', 'patient', 'chief_complaint', 'arrival_mode', 'arrival_time')
        }),
        ('Triage', {
            'fields': ('triage_level', 'triage_time', 'is_critical', 'vitals_on_arrival')
        }),
        ('Treatment', {
            'fields': ('status', 'attending_doctor', 'assigned_bed', 'treatment_start_time', 'treatment_notes')
        }),
        ('Disposition', {
            'fields': ('disposition', 'diagnosis', 'discharge_time')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Ambulance)
class AmbulanceAdmin(admin.ModelAdmin):
    list_display = ('vehicle_number', 'ambulance_type', 'driver_name', 'status', 'is_active')
    search_fields = ('vehicle_number', 'driver_name', 'paramedic_name')
    list_filter = ('ambulance_type', 'status', 'is_active')


@admin.register(AmbulanceDispatch)
class AmbulanceDispatchAdmin(admin.ModelAdmin):
    list_display = ('ambulance', 'emergency_visit', 'priority', 'status', 'dispatch_time')
    search_fields = ('ambulance__vehicle_number', 'pickup_location')
    list_filter = ('priority', 'status')
    readonly_fields = ('created_at',)


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'phone_number', 'is_available')
    search_fields = ('name', 'phone_number')
    list_filter = ('role', 'is_available')
