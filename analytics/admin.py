from django.contrib import admin
from .models import DailyMetrics, DoctorPerformance, PatientActivity
@admin.register(DailyMetrics)
class DailyMetricsAdmin(admin.ModelAdmin):
    list_display = ('date', 'new_patients', 'new_appointments', 'completed_appointments', 
                   'cancelled_appointments', 'no_show_appointments', 'total_revenue')
    list_filter = ('date',)
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'updated_at')
@admin.register(DoctorPerformance)
class DoctorPerformanceAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'date', 'appointments_count', 'completed_count', 
                   'cancelled_count', 'no_show_count', 'revenue')
    list_filter = ('date', 'doctor')
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'updated_at')
@admin.register(PatientActivity)
class PatientActivityAdmin(admin.ModelAdmin):
    list_display = ('patient', 'date', 'appointments_count', 'completed_count', 
                   'cancelled_count', 'no_show_count')
    list_filter = ('date', 'patient')
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'updated_at')

