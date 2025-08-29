from rest_framework import serializers
from .models import Doctor
class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'
class DoctorListSerializer(serializers.ModelSerializer):
    specialization_display = serializers.CharField(source='get_specialization_display', read_only=True)
    class Meta:
        model = Doctor
        fields = ['id', 'first_name', 'last_name', 'specialization', 'specialization_display', 'consultation_fee']

