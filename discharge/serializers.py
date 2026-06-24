from rest_framework import serializers
from .models import DischargeSummary, FollowUp, Readmission


class DischargeSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DischargeSummary
        fields = '__all__'


class DischargeSummaryListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = DischargeSummary
        fields = ['id', 'summary_number', 'patient', 'patient_name', 'doctor', 'doctor_name',
                  'admission_date', 'discharge_date', 'discharge_type', 'status']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"


class FollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUp
        fields = '__all__'


class FollowUpListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = FollowUp
        fields = ['id', 'patient', 'patient_name', 'doctor', 'doctor_name',
                  'scheduled_date', 'follow_up_type', 'status', 'reason']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"


class ReadmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Readmission
        fields = '__all__'


class ReadmissionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Readmission
        fields = ['id', 'patient', 'patient_name', 'original_discharge',
                  'readmission_date', 'is_related_to_original', 'days_since_discharge']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
