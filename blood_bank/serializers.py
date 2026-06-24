from rest_framework import serializers
from .models import BloodDonor, BloodUnit, BloodRequest, CrossMatch


class BloodDonorSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodDonor
        fields = '__all__'


class BloodUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodUnit
        fields = '__all__'


class BloodRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodRequest
        fields = '__all__'


class CrossMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrossMatch
        fields = '__all__'
