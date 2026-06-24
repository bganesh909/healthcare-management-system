from rest_framework import serializers
from .models import (
    Prescription, PrescriptionItem, MedicalRecord,
    DrugInteraction, PrescriptionTemplate,
)


class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = '__all__'


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Prescription
        fields = '__all__'


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'patient', 'doctor', 'diagnosis',
            'notes', 'follow_up_date', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        prescription = Prescription.objects.create(**validated_data)
        for item_data in items_data:
            item_data.pop('prescription', None)
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        return prescription

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                item_data.pop('prescription', None)
                PrescriptionItem.objects.create(prescription=instance, **item_data)

        return instance

    def to_representation(self, instance):
        return PrescriptionDetailSerializer(instance).data


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    doctor = serializers.SerializerMethodField()
    appointment = serializers.SerializerMethodField()
    items = PrescriptionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'patient', 'doctor', 'diagnosis',
            'notes', 'follow_up_date', 'items', 'created_at', 'updated_at',
        ]

    def get_patient(self, obj):
        return {
            'id': obj.patient.id,
            'name': f"{obj.patient.first_name} {obj.patient.last_name}",
        }

    def get_doctor(self, obj):
        return {
            'id': obj.doctor.id,
            'name': f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}",
        }

    def get_appointment(self, obj):
        return {
            'id': obj.appointment.id,
            'date': obj.appointment.appointment_date,
            'time': obj.appointment.appointment_time,
            'status': obj.appointment.status,
        }


class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = '__all__'


class MedicalRecordListSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    record_type_display = serializers.CharField(source='get_record_type_display', read_only=True)

    class Meta:
        model = MedicalRecord
        fields = ['id', 'patient', 'doctor_name', 'record_type', 'record_type_display', 'title', 'record_date']

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"


class DrugInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugInteraction
        fields = '__all__'


class PrescriptionTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionTemplate
        fields = '__all__'
