from rest_framework import serializers
from .models import Patient, PatientDocument, FamilyGroup, FamilyMember


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'


class PatientListSerializer(serializers.ModelSerializer):
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    age = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone_number',
            'gender', 'gender_display', 'date_of_birth', 'blood_group',
            'address', 'age', 'created_at',
        ]

    def get_age(self, obj):
        if not obj.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        return today.year - obj.date_of_birth.year - (
            (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
        )


class PatientDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientDocument
        fields = '__all__'


class FamilyMemberSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    relationship_display = serializers.CharField(source='get_relationship_display', read_only=True)

    class Meta:
        model = FamilyMember
        fields = '__all__'

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"


class FamilyGroupSerializer(serializers.ModelSerializer):
    members = FamilyMemberSerializer(many=True, read_only=True)
    primary_user_email = serializers.CharField(source='primary_user.email', read_only=True)

    class Meta:
        model = FamilyGroup
        fields = '__all__'
        read_only_fields = ('primary_user',)
