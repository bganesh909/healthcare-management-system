from rest_framework import serializers
from .models import VitalSign, ClinicalNote, TreatmentPlan, Allergy


class VitalSignSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField(read_only=True)
    recorded_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = VitalSign
        fields = '__all__'
        read_only_fields = ['bmi', 'recorded_at']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else None

    def get_recorded_by_name(self, obj):
        return f"Dr. {obj.recorded_by.first_name} {obj.recorded_by.last_name}" if obj.recorded_by else None


class ClinicalNoteSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField(read_only=True)
    doctor_name = serializers.SerializerMethodField(read_only=True)
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)

    class Meta:
        model = ClinicalNote
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else None

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}" if obj.doctor else None


class TreatmentPlanSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField(read_only=True)
    doctor_name = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TreatmentPlan
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else None

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}" if obj.doctor else None


class AllergySerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField(read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    allergy_type_display = serializers.CharField(source='get_allergy_type_display', read_only=True)

    class Meta:
        model = Allergy
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else None
