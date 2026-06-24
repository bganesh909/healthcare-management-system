from rest_framework import serializers
from .models import Department, Ward, Bed


class DepartmentListSerializer(serializers.ModelSerializer):
    head_doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'floor', 'is_active',
            'head_doctor', 'head_doctor_name',
        ]

    def get_head_doctor_name(self, obj):
        if obj.head_doctor:
            return f"Dr. {obj.head_doctor.first_name} {obj.head_doctor.last_name}"
        return None


class DepartmentSerializer(serializers.ModelSerializer):
    head_doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'head_doctor',
            'head_doctor_name', 'phone_extension', 'email', 'floor',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_head_doctor_name(self, obj):
        if obj.head_doctor:
            return f"Dr. {obj.head_doctor.first_name} {obj.head_doctor.last_name}"
        return None


class BedSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )

    class Meta:
        model = Bed
        fields = [
            'id', 'bed_number', 'ward', 'status', 'status_display',
            'patient', 'admission_date', 'expected_discharge',
            'daily_rate', 'notes',
        ]
        read_only_fields = ['id']


class BedDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    patient_name = serializers.SerializerMethodField()
    ward_name = serializers.CharField(source='ward.name', read_only=True)
    department_name = serializers.CharField(
        source='ward.department.name', read_only=True
    )

    class Meta:
        model = Bed
        fields = [
            'id', 'bed_number', 'ward', 'ward_name', 'department_name',
            'status', 'status_display', 'patient', 'patient_name',
            'admission_date', 'expected_discharge', 'daily_rate', 'notes',
        ]
        read_only_fields = ['id']

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}"
        return None


class WardSerializer(serializers.ModelSerializer):
    ward_type_display = serializers.CharField(
        source='get_ward_type_display', read_only=True
    )
    available_beds = serializers.IntegerField(read_only=True)
    department_name = serializers.CharField(
        source='department.name', read_only=True
    )

    class Meta:
        model = Ward
        fields = [
            'id', 'name', 'department', 'department_name',
            'ward_type', 'ward_type_display', 'floor', 'total_beds',
            'available_beds', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class WardDetailSerializer(serializers.ModelSerializer):
    ward_type_display = serializers.CharField(
        source='get_ward_type_display', read_only=True
    )
    available_beds = serializers.IntegerField(read_only=True)
    department_name = serializers.CharField(
        source='department.name', read_only=True
    )
    bed_summary = serializers.SerializerMethodField()
    beds = BedSerializer(many=True, read_only=True)

    class Meta:
        model = Ward
        fields = [
            'id', 'name', 'department', 'department_name',
            'ward_type', 'ward_type_display', 'floor', 'total_beds',
            'available_beds', 'is_active', 'created_at', 'updated_at',
            'bed_summary', 'beds',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_bed_summary(self, obj):
        beds = obj.beds.all()
        return {
            'total': obj.total_beds,
            'available': beds.filter(status='AVAILABLE').count(),
            'occupied': beds.filter(status='OCCUPIED').count(),
            'maintenance': beds.filter(status='MAINTENANCE').count(),
            'reserved': beds.filter(status='RESERVED').count(),
        }
