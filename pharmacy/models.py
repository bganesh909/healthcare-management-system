from django.db import models
from django.utils import timezone
from patients.models import Patient
from doctors.models import Doctor


class MedicineCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Medicine Categories'


class Medicine(models.Model):
    FORM_CHOICES = (
        ('TABLET', 'Tablet'),
        ('CAPSULE', 'Capsule'),
        ('SYRUP', 'Syrup'),
        ('INJECTION', 'Injection'),
        ('CREAM', 'Cream'),
        ('DROPS', 'Drops'),
        ('INHALER', 'Inhaler'),
        ('OTHER', 'Other'),
    )

    name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True, null=True)
    category = models.ForeignKey(
        MedicineCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='medicines'
    )
    manufacturer = models.CharField(max_length=200, blank=True, null=True)
    form = models.CharField(max_length=20, choices=FORM_CHOICES, default='TABLET')
    strength = models.CharField(max_length=50, help_text="e.g., 500mg, 10ml")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=10)
    expiry_date = models.DateField(blank=True, null=True)
    requires_prescription = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_level

    @property
    def is_expired(self):
        return self.expiry_date and self.expiry_date < timezone.now().date()

    def __str__(self):
        return f"{self.name} ({self.strength}) - {self.get_form_display()}"

    class Meta:
        ordering = ['name']


class MedicineOrder(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('DISPENSED', 'Dispensed'),
        ('CANCELLED', 'Cancelled'),
    )

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='medicine_orders'
    )
    prescribed_by = models.ForeignKey(
        Doctor, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='medicine_orders'
    )
    prescription = models.ForeignKey(
        'prescriptions.Prescription', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='medicine_order'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            last_order = MedicineOrder.objects.order_by('-id').first()
            if last_order and last_order.order_number.startswith('ORD-'):
                last_number = int(last_order.order_number.split('-')[1])
                new_number = last_number + 1
            else:
                new_number = 1
            self.order_number = f"ORD-{new_number:06d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number} - {self.patient}"

    class Meta:
        ordering = ['-created_at']


class MedicineOrderItem(models.Model):
    order = models.ForeignKey(
        MedicineOrder, on_delete=models.CASCADE, related_name='items'
    )
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)
        # Update the order total
        order_total = self.order.items.aggregate(
            total=models.Sum('total_price')
        )['total'] or 0
        self.order.total_amount = order_total
        self.order.save(update_fields=['total_amount'])

    def __str__(self):
        return f"{self.medicine.name} x {self.quantity}"

    class Meta:
        ordering = ['id']
