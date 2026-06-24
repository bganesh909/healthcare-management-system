from rest_framework import serializers
from .models import ImagingType, ImagingOrder, ImagingReport


class ImagingTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingType
        fields = '__all__'


class ImagingReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagingReport
        fields = '__all__'


class ImagingOrderSerializer(serializers.ModelSerializer):
    report = ImagingReportSerializer(read_only=True)

    class Meta:
        model = ImagingOrder
        fields = '__all__'
        read_only_fields = ['order_number']
