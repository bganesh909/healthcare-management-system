from django.contrib import admin
from .models import Appointment
@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'appointment_date', 'appointment_time', 'status')
    search_fields = ('patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name')
    list_filter = ('status', 'appointment_date')
    date_hierarchy = 'appointment_date'
    fieldsets = (
        ('Appointment Details', {
            'fields': ('patient', 'doctor', 'appointment_date', 'appointment_time')
        }),
        ('Status and Notes', {
            'fields': ('reason', 'status', 'notes')
        }),
    )

