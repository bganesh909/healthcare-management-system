from rest_framework import serializers
from .models import MedicineCategory, Medicine, MedicineOrder, MedicineOrderItem


class MedicineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineCategory
        fields = '__all__'


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medicine
        fields = '__all__'


class MedicineListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'category', 'category_name',
            'form', 'form_display', 'strength', 'unit_price',
            'stock_quantity', 'requires_prescription', 'is_active',
            'is_low_stock', 'is_expired',
        ]


class MedicineOrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = MedicineOrderItem
        fields = ['id', 'medicine', 'medicine_name', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['total_price']


class MedicineOrderSerializer(serializers.ModelSerializer):
    items = MedicineOrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.__str__', read_only=True)
    prescribed_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MedicineOrder
        fields = '__all__'
        read_only_fields = ['order_number', 'total_amount']

    def get_prescribed_by_name(self, obj):
        if obj.prescribed_by:
            return str(obj.prescribed_by)
        return None


class MedicineOrderItemCreateSerializer(serializers.Serializer):
    medicine = serializers.PrimaryKeyRelatedField(queryset=Medicine.objects.all())
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, data):
        medicine = data['medicine']
        quantity = data['quantity']
        if not medicine.is_active:
            raise serializers.ValidationError(
                f"Medicine '{medicine.name}' is not active."
            )
        if medicine.is_expired:
            raise serializers.ValidationError(
                f"Medicine '{medicine.name}' has expired."
            )
        if medicine.stock_quantity < quantity:
            raise serializers.ValidationError(
                f"Insufficient stock for '{medicine.name}'. "
                f"Available: {medicine.stock_quantity}, Requested: {quantity}."
            )
        return data


class MedicineOrderCreateSerializer(serializers.ModelSerializer):
    items = MedicineOrderItemCreateSerializer(many=True, write_only=True)

    class Meta:
        model = MedicineOrder
        fields = ['patient', 'prescribed_by', 'prescription', 'notes', 'items']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = MedicineOrder.objects.create(**validated_data)
        for item_data in items_data:
            medicine = item_data['medicine']
            quantity = item_data['quantity']
            MedicineOrderItem.objects.create(
                order=order,
                medicine=medicine,
                quantity=quantity,
                unit_price=medicine.unit_price,
                total_price=medicine.unit_price * quantity,
            )
        # Recalculate total
        from django.db.models import Sum
        order.total_amount = order.items.aggregate(
            total=Sum('total_price')
        )['total'] or 0
        order.save(update_fields=['total_amount'])
        return order


class MedicineOrderDetailSerializer(serializers.ModelSerializer):
    items = MedicineOrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.__str__', read_only=True)
    prescribed_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MedicineOrder
        fields = '__all__'
        read_only_fields = ['order_number', 'total_amount']

    def get_prescribed_by_name(self, obj):
        if obj.prescribed_by:
            return str(obj.prescribed_by)
        return None
