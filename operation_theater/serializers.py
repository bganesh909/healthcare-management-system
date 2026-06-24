from rest_framework import serializers
from .models import OperationTheater, Surgery, SurgicalTeam, PreOpChecklist, PostOpNote


class OperationTheaterSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationTheater
        fields = '__all__'


class SurgicalTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurgicalTeam
        fields = '__all__'


class PreOpChecklistSerializer(serializers.ModelSerializer):
    is_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = PreOpChecklist
        fields = '__all__'


class PostOpNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostOpNote
        fields = '__all__'


class SurgerySerializer(serializers.ModelSerializer):
    team_members = SurgicalTeamSerializer(many=True, read_only=True)

    class Meta:
        model = Surgery
        fields = '__all__'
        read_only_fields = ['surgery_number']


class SurgeryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Surgery
        fields = [
            'id', 'surgery_number', 'patient', 'primary_surgeon',
            'operation_theater', 'surgery_type', 'procedure_name',
            'scheduled_date', 'status', 'estimated_duration',
        ]
