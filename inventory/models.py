import random
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class AssetCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'asset categories'

    def __str__(self):
        return self.name


class Asset(models.Model):
    ASSET_TYPE_CHOICES = (
        ('EQUIPMENT', 'Equipment'),
        ('FURNITURE', 'Furniture'),
        ('IT_HARDWARE', 'IT Hardware'),
        ('VEHICLE', 'Vehicle'),
        ('INSTRUMENT', 'Instrument'),
        ('OTHER', 'Other'),
    )

    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('IN_REPAIR', 'In Repair'),
        ('RETIRED', 'Retired'),
        ('DISPOSED', 'Disposed'),
        ('IN_STORAGE', 'In Storage'),
    )

    CONDITION_CHOICES = (
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor'),
    )

    asset_tag = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(
        AssetCategory,
        on_delete=models.CASCADE,
        related_name='assets',
    )
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    manufacturer = models.CharField(max_length=200, blank=True)
    model_number = models.CharField(max_length=100, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateField()
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    warranty_expiry = models.DateField(null=True, blank=True)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets',
    )
    location = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    last_maintenance_date = models.DateField(null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['asset_tag']

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.asset_tag:
            self.asset_tag = f"AST-{random.randint(100000, 999999)}"
            while Asset.objects.filter(asset_tag=self.asset_tag).exists():
                self.asset_tag = f"AST-{random.randint(100000, 999999)}"
        super().save(*args, **kwargs)


class MaintenanceLog(models.Model):
    MAINTENANCE_TYPE_CHOICES = (
        ('PREVENTIVE', 'Preventive'),
        ('CORRECTIVE', 'Corrective'),
        ('EMERGENCY', 'Emergency'),
        ('CALIBRATION', 'Calibration'),
    )

    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='maintenance_logs',
    )
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPE_CHOICES)
    description = models.TextField()
    performed_by = models.CharField(max_length=200)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date = models.DateField()
    next_due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.asset.asset_tag} - {self.get_maintenance_type_display()} ({self.date})"


class Vendor(models.Model):
    VENDOR_TYPE_CHOICES = (
        ('MEDICAL_EQUIPMENT', 'Medical Equipment'),
        ('PHARMACEUTICALS', 'Pharmaceuticals'),
        ('IT', 'IT'),
        ('GENERAL_SUPPLIES', 'General Supplies'),
        ('FOOD', 'Food'),
        ('LAUNDRY', 'Laundry'),
        ('OTHER', 'Other'),
    )

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    contact_person = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    address = models.TextField()
    gst_number = models.CharField(max_length=20, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    vendor_type = models.CharField(max_length=20, choices=VENDOR_TYPE_CHOICES)
    is_active = models.BooleanField(default=True)
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class PurchaseOrder(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('ORDERED', 'Ordered'),
        ('PARTIALLY_RECEIVED', 'Partially Received'),
        ('RECEIVED', 'Received'),
        ('CANCELLED', 'Cancelled'),
    )

    po_number = models.CharField(max_length=20, unique=True)
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.CASCADE,
        related_name='purchase_orders',
    )
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_orders',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    order_date = models.DateField()
    expected_delivery = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    approved_by = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order_date']

    def __str__(self):
        return f"{self.po_number} - {self.vendor.name}"

    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = f"PO-{random.randint(100000, 999999)}"
            while PurchaseOrder.objects.filter(po_number=self.po_number).exists():
                self.po_number = f"PO-{random.randint(100000, 999999)}"
        super().save(*args, **kwargs)


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    description = models.CharField(max_length=300)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    received_quantity = models.IntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.description} (x{self.quantity})"


class GoodsReceivedNote(models.Model):
    STATUS_CHOICES = (
        ('PARTIAL', 'Partial'),
        ('COMPLETE', 'Complete'),
        ('REJECTED', 'Rejected'),
    )

    grn_number = models.CharField(max_length=20, unique=True)
    purchase_order = models.ForeignKey(
        'PurchaseOrder', on_delete=models.CASCADE, related_name='grns'
    )
    received_date = models.DateField()
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PARTIAL')
    invoice_number = models.CharField(max_length=100, blank=True)
    invoice_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.grn_number

    def save(self, *args, **kwargs):
        if not self.grn_number:
            last = GoodsReceivedNote.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.grn_number = f"GRN-{num:06d}"
        super().save(*args, **kwargs)


class GRNItem(models.Model):
    grn = models.ForeignKey(
        GoodsReceivedNote, on_delete=models.CASCADE, related_name='items'
    )
    po_item = models.ForeignKey(
        'PurchaseOrderItem', on_delete=models.CASCADE, related_name='grn_items'
    )
    received_quantity = models.PositiveIntegerField()
    accepted_quantity = models.PositiveIntegerField()
    rejected_quantity = models.PositiveIntegerField(default=0)
    rejection_reason = models.TextField(blank=True)

    def __str__(self):
        return f"GRN Item {self.id} - {self.po_item.description}"


class VendorPayment(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('APPROVED', 'Approved'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    )

    payment_number = models.CharField(max_length=20, unique=True)
    vendor = models.ForeignKey(
        'Vendor', on_delete=models.CASCADE, related_name='payments'
    )
    purchase_order = models.ForeignKey(
        'PurchaseOrder', on_delete=models.SET_NULL, null=True, blank=True
    )
    grn = models.ForeignKey(
        'GoodsReceivedNote', on_delete=models.SET_NULL, null=True, blank=True
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, default='BANK_TRANSFER')
    payment_date = models.DateField()
    transaction_reference = models.CharField(max_length=100, blank=True)
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tds_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_vendor_payments'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.payment_number

    def save(self, *args, **kwargs):
        if not self.payment_number:
            last = VendorPayment.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.payment_number = f"VP-{num:06d}"
        if not self.net_amount:
            self.net_amount = self.amount - self.tds_amount
        super().save(*args, **kwargs)
