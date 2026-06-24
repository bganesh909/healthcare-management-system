from django.contrib import admin
from .models import Appointment, TimeSlot, DoctorLeave


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'doctor', 'appointment_date', 'appointment_time', 'status', 'is_walk_in', 'token_number')
    search_fields = ('patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name')
    list_filter = ('status', 'appointment_date', 'is_walk_in')
    date_hierarchy = 'appointment_date'
    fieldsets = (
        ('Appointment Details', {
            'fields': ('patient', 'doctor', 'appointment_date', 'appointment_time', 'is_walk_in')
        }),
        ('Status and Notes', {
            'fields': ('reason', 'status', 'notes')
        }),
        ('Check-in / Check-out', {
            'fields': ('check_in_time', 'check_out_time', 'token_number'),
            'classes': ('collapse',),
        }),
    )


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'day_of_week', 'start_time', 'end_time', 'slot_duration', 'max_patients', 'is_active')
    list_filter = ('doctor', 'day_of_week', 'is_active')
    search_fields = ('doctor__first_name', 'doctor__last_name')


@admin.register(DoctorLeave)
class DoctorLeaveAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'start_date', 'end_date', 'reason', 'is_approved')
    list_filter = ('is_approved', 'start_date')
    search_fields = ('doctor__first_name', 'doctor__last_name', 'reason')
    date_hierarchy = 'start_date'
