from rest_framework import serializers
from .models import Invoice, InvoiceItem, Payment, InsuranceClaim


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'invoice', 'description', 'item_type',
            'quantity', 'unit_price', 'total_price',
        ]
        read_only_fields = ['total_price']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'payment_method', 'amount',
            'transaction_id', 'payment_date', 'notes',
        ]
        read_only_fields = ['payment_date']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    balance_due = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'patient', 'appointment', 'status',
            'issue_date', 'due_date', 'subtotal', 'tax_percentage',
            'tax_amount', 'discount', 'total_amount', 'paid_amount',
            'balance_due', 'notes', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['invoice_number', 'issue_date', 'created_at', 'updated_at']


class InvoiceItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['description', 'item_type', 'quantity', 'unit_price']


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemCreateSerializer(many=True)

    class Meta:
        model = Invoice
        fields = [
            'patient', 'appointment', 'status', 'due_date',
            'subtotal', 'tax_percentage', 'tax_amount', 'discount',
            'total_amount', 'notes', 'items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)

        return instance


class InvoiceDetailSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    balance_due = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    patient_name = serializers.SerializerMethodField()
    appointment_info = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'patient', 'patient_name',
            'appointment', 'appointment_info', 'status', 'issue_date',
            'due_date', 'subtotal', 'tax_percentage', 'tax_amount',
            'discount', 'total_amount', 'paid_amount', 'balance_due',
            'notes', 'items', 'payments', 'created_at', 'updated_at',
        ]
        read_only_fields = ['invoice_number', 'issue_date', 'created_at', 'updated_at']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_appointment_info(self, obj):
        if obj.appointment:
            return {
                'id': obj.appointment.id,
                'doctor': f"Dr. {obj.appointment.doctor.first_name} {obj.appointment.doctor.last_name}",
                'date': str(obj.appointment.appointment_date),
                'time': str(obj.appointment.appointment_time),
                'status': obj.appointment.status,
            }
        return None


class InsuranceClaimSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceClaim
        fields = [
            'id', 'invoice', 'patient', 'insurance_provider',
            'policy_number', 'claim_number', 'status', 'claimed_amount',
            'approved_amount', 'submission_date', 'settlement_date',
            'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['submission_date', 'created_at', 'updated_at']


class InsuranceClaimDetailSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(
        source='invoice.invoice_number', read_only=True
    )

    class Meta:
        model = InsuranceClaim
        fields = [
            'id', 'invoice', 'invoice_number', 'patient', 'patient_name',
            'insurance_provider', 'policy_number', 'claim_number', 'status',
            'claimed_amount', 'approved_amount', 'submission_date',
            'settlement_date', 'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['submission_date', 'created_at', 'updated_at']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
