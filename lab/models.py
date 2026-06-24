from django.db import models
from patients.models import Patient
from doctors.models import Doctor
from appointments.models import Appointment


class LabTestCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Lab Test Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class LabTest(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    category = models.ForeignKey(
        LabTestCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tests',
    )
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    normal_range = models.CharField(max_length=200, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    turnaround_time = models.CharField(max_length=50, blank=True, null=True)
    requires_fasting = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"


class LabOrder(models.Model):
    STATUS_CHOICES = (
        ('ORDERED', 'Ordered'),
        ('SAMPLE_COLLECTED', 'Sample Collected'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    PRIORITY_CHOICES = (
        ('ROUTINE', 'Routine'),
        ('URGENT', 'Urgent'),
        ('STAT', 'Stat'),
    )

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='lab_orders',
    )
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='lab_orders',
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_orders',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ORDERED',
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='ROUTINE',
    )
    clinical_notes = models.TextField(blank=True, null=True)
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} - {self.patient}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            last_order = (
                LabOrder.objects.order_by('-id').first()
            )
            if last_order and last_order.order_number.startswith('LAB-'):
                last_number = int(last_order.order_number.split('-')[1])
                new_number = last_number + 1
            else:
                new_number = 1
            self.order_number = f"LAB-{new_number:06d}"
        super().save(*args, **kwargs)

    def calculate_total(self):
        total = self.items.aggregate(
            total=models.Sum('test__price')
        )['total'] or 0
        self.total_amount = total
        self.save(update_fields=['total_amount'])
        return total


class LabOrderItem(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )

    lab_order = models.ForeignKey(
        LabOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    test = models.ForeignKey(
        LabTest,
        on_delete=models.CASCADE,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
    )
    result_value = models.CharField(max_length=200, blank=True, null=True)
    result_unit = models.CharField(max_length=50, blank=True, null=True)
    is_abnormal = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.lab_order.order_number} - {self.test.name}"


class LabReport(models.Model):
    lab_order = models.OneToOneField(
        LabOrder,
        on_delete=models.CASCADE,
        related_name='report',
    )
    report_file = models.FileField(
        upload_to='lab_reports/',
        blank=True,
        null=True,
    )
    summary = models.TextField(blank=True, null=True)
    reported_by = models.CharField(max_length=200)
    verified_by = models.CharField(max_length=200, blank=True, null=True)
    reported_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for {self.lab_order.order_number}"
