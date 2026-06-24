from rest_framework import serializers
from django.utils import timezone

from .models import (
    LabTestCategory,
    LabTest,
    LabOrder,
    LabOrderItem,
    LabReport,
)
from patients.serializers import PatientListSerializer
from doctors.serializers import DoctorListSerializer


class LabTestCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestCategory
        fields = '__all__'


class LabTestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name', read_only=True
    )

    class Meta:
        model = LabTest
        fields = '__all__'


class LabTestListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name', read_only=True
    )

    class Meta:
        model = LabTest
        fields = [
            'id', 'name', 'code', 'category', 'category_name',
            'price', 'requires_fasting', 'is_active',
        ]


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)
    test_code = serializers.CharField(source='test.code', read_only=True)
    test_normal_range = serializers.CharField(
        source='test.normal_range', read_only=True
    )
    test_unit = serializers.CharField(source='test.unit', read_only=True)

    class Meta:
        model = LabOrderItem
        fields = [
            'id', 'lab_order', 'test', 'test_name', 'test_code',
            'test_normal_range', 'test_unit', 'status',
            'result_value', 'result_unit', 'is_abnormal',
            'remarks', 'completed_at',
        ]
        read_only_fields = ['lab_order']


class LabOrderSerializer(serializers.ModelSerializer):
    items = LabOrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display', read_only=True
    )

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'patient', 'patient_name',
            'doctor', 'doctor_name', 'appointment', 'status',
            'status_display', 'priority', 'priority_display',
            'clinical_notes', 'total_amount', 'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['order_number', 'total_amount']

    def get_patient_name(self, obj):
        return str(obj.patient)

    def get_doctor_name(self, obj):
        return str(obj.doctor)


class LabOrderCreateSerializer(serializers.ModelSerializer):
    test_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
    )

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'patient', 'doctor',
            'appointment', 'priority', 'clinical_notes',
            'test_ids', 'total_amount', 'created_at',
        ]
        read_only_fields = ['order_number', 'total_amount', 'created_at']

    def validate_test_ids(self, value):
        if not value:
            raise serializers.ValidationError(
                "At least one test must be specified."
            )
        tests = LabTest.objects.filter(id__in=value, is_active=True)
        if tests.count() != len(value):
            raise serializers.ValidationError(
                "One or more test IDs are invalid or inactive."
            )
        return value

    def create(self, validated_data):
        test_ids = validated_data.pop('test_ids')
        lab_order = LabOrder.objects.create(**validated_data)

        tests = LabTest.objects.filter(id__in=test_ids)
        items = [
            LabOrderItem(lab_order=lab_order, test=test)
            for test in tests
        ]
        LabOrderItem.objects.bulk_create(items)

        lab_order.calculate_total()
        return lab_order


class LabOrderDetailSerializer(serializers.ModelSerializer):
    patient = PatientListSerializer(read_only=True)
    doctor = DoctorListSerializer(read_only=True)
    items = LabOrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display', read_only=True
    )
    has_report = serializers.SerializerMethodField()

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'patient', 'doctor',
            'appointment', 'status', 'status_display',
            'priority', 'priority_display', 'clinical_notes',
            'total_amount', 'items', 'has_report',
            'created_at', 'updated_at',
        ]

    def get_has_report(self, obj):
        return hasattr(obj, 'report') and obj.report is not None


class LabReportSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(
        source='lab_order.order_number', read_only=True
    )

    class Meta:
        model = LabReport
        fields = [
            'id', 'lab_order', 'order_number', 'report_file',
            'summary', 'reported_by', 'verified_by', 'reported_at',
        ]
        read_only_fields = ['reported_at']
