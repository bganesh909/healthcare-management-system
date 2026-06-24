from rest_framework import serializers
from .models import QueueEntry, QueueDisplay


class QueueEntrySerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = QueueEntry
        fields = '__all__'

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None


class QueueEntryListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = QueueEntry
        fields = [
            'id', 'token_number', 'patient', 'patient_name',
            'doctor', 'doctor_name', 'queue_type', 'status',
            'priority', 'check_in_time', 'estimated_wait_minutes', 'position',
        ]

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"


class QueueDisplaySerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    queue_entries = serializers.SerializerMethodField()
    average_wait_time = serializers.IntegerField(source='avg_wait_time_minutes', read_only=True)

    class Meta:
        model = QueueDisplay
        fields = '__all__'

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_doctor_name(self, obj):
        if obj.doctor:
            return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
        return None

    def get_queue_entries(self, obj):
        if not obj.doctor:
            return []
        from django.utils import timezone
        today = timezone.now().date()
        entries = QueueEntry.objects.filter(
            doctor=obj.doctor,
            date=today,
            status__in=['WAITING', 'IN_CONSULTATION', 'CHECKED_IN'],
        ).order_by('priority', 'check_in_time')
        return QueueEntryListSerializer(entries, many=True).data
