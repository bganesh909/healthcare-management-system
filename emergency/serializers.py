from rest_framework import serializers
from .models import EmergencyVisit, Ambulance, AmbulanceDispatch, EmergencyContact


class EmergencyVisitSerializer(serializers.ModelSerializer):
    triage_color = serializers.ReadOnlyField()
    triage_level_display = serializers.CharField(source='get_triage_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    arrival_mode_display = serializers.CharField(source='get_arrival_mode_display', read_only=True)

    class Meta:
        model = EmergencyVisit
        fields = '__all__'
        read_only_fields = ['visit_number']


class AmbulanceSerializer(serializers.ModelSerializer):
    ambulance_type_display = serializers.CharField(source='get_ambulance_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Ambulance
        fields = '__all__'


class AmbulanceDispatchSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AmbulanceDispatch
        fields = '__all__'


class EmergencyContactSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = EmergencyContact
        fields = '__all__'
