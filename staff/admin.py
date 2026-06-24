from django.contrib import admin
from .models import StaffMember, Attendance, ShiftSchedule, LeaveRequest, Payroll


@admin.register(StaffMember)
class StaffMemberAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'first_name', 'last_name', 'role', 'department', 'current_shift', 'is_active')
    search_fields = ('employee_id', 'first_name', 'last_name', 'email', 'phone_number')
    list_filter = ('role', 'department', 'current_shift', 'is_active')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Personal Information', {
            'fields': ('user', 'employee_id', 'first_name', 'last_name', 'email', 'phone_number', 'address')
        }),
        ('Professional Information', {
            'fields': ('role', 'department', 'qualification', 'date_of_joining', 'current_shift', 'salary', 'is_active')
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_number')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('staff_member', 'date', 'status', 'check_in', 'check_out', 'hours_worked', 'overtime_hours')
    search_fields = ('staff_member__employee_id', 'staff_member__first_name', 'staff_member__last_name')
    list_filter = ('status', 'date')
    date_hierarchy = 'date'


@admin.register(ShiftSchedule)
class ShiftScheduleAdmin(admin.ModelAdmin):
    list_display = ('staff_member', 'shift', 'start_date', 'end_date')
    search_fields = ('staff_member__employee_id', 'staff_member__first_name', 'staff_member__last_name')
    list_filter = ('shift', 'start_date')
    readonly_fields = ('created_at',)


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('staff_member', 'leave_type', 'start_date', 'end_date', 'status', 'approved_by')
    search_fields = ('staff_member__employee_id', 'staff_member__first_name', 'staff_member__last_name')
    list_filter = ('leave_type', 'status', 'start_date')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ('staff_member', 'month', 'year', 'basic_salary', 'net_salary', 'status', 'paid_date')
    search_fields = ('staff_member__employee_id', 'staff_member__first_name', 'staff_member__last_name')
    list_filter = ('status', 'month', 'year')
    readonly_fields = ('created_at', 'updated_at')
