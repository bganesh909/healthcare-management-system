from rest_framework import serializers
from .models import StaffMember, Attendance, ShiftSchedule, LeaveRequest, Payroll, SalaryStructure, SalaryRevision, StaffLoan, ShiftHandover


class StaffMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    shift_display = serializers.CharField(source='get_current_shift_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = StaffMember
        fields = '__all__'


class StaffMemberListSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = StaffMember
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'role',
            'role_display', 'department', 'department_name', 'phone_number',
            'email', 'current_shift', 'is_active',
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'

    def get_staff_member_name(self, obj):
        return f"{obj.staff_member.first_name} {obj.staff_member.last_name}"


class ShiftScheduleSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField(read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)

    class Meta:
        model = ShiftSchedule
        fields = '__all__'

    def get_staff_member_name(self, obj):
        return f"{obj.staff_member.first_name} {obj.staff_member.last_name}"


class LeaveRequestSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField(read_only=True)
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = '__all__'

    def get_staff_member_name(self, obj):
        return f"{obj.staff_member.first_name} {obj.staff_member.last_name}"


class PayrollSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employee_id = serializers.CharField(source='staff_member.employee_id', read_only=True)
    ctc = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Payroll
        fields = '__all__'

    def get_staff_member_name(self, obj):
        return f"{obj.staff_member.first_name} {obj.staff_member.last_name}"


class SalaryStructureSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField(read_only=True)
    employee_id = serializers.CharField(source='staff_member.employee_id', read_only=True)
    gross_salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_deductions = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SalaryStructure
        fields = '__all__'

    def get_staff_member_name(self, obj):
        return f"{obj.staff_member.first_name} {obj.staff_member.last_name}"


class SalaryRevisionSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SalaryRevision
        fields = '__all__'

    def get_staff_member_name(self, obj):
        return f"{obj.staff_member.first_name} {obj.staff_member.last_name}"


class StaffLoanSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StaffLoan
        fields = '__all__'
        read_only_fields = ('loan_number',)

    def get_staff_member_name(self, obj):
        return f"{obj.staff_member.first_name} {obj.staff_member.last_name}"


class ShiftHandoverSerializer(serializers.ModelSerializer):
    from_staff_name = serializers.SerializerMethodField()
    to_staff_name = serializers.SerializerMethodField()
    from_shift_display = serializers.CharField(source='get_from_shift_display', read_only=True)
    to_shift_display = serializers.CharField(source='get_to_shift_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)

    class Meta:
        model = ShiftHandover
        fields = '__all__'

    def get_from_staff_name(self, obj):
        return f"{obj.from_staff.first_name} {obj.from_staff.last_name}"

    def get_to_staff_name(self, obj):
        if obj.to_staff:
            return f"{obj.to_staff.first_name} {obj.to_staff.last_name}"
        return None
