from django.db import models
from patients.models import Patient
from doctors.models import Doctor
from appointments.models import Appointment


class ImagingType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    preparation_instructions = models.TextField(blank=True)
    turnaround_time = models.CharField(max_length=50)
    requires_contrast = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"


class ImagingOrder(models.Model):
    PRIORITY_CHOICES = (
        ('ROUTINE', 'Routine'),
        ('URGENT', 'Urgent'),
        ('STAT', 'Stat'),
    )
    STATUS_CHOICES = (
        ('ORDERED', 'Ordered'),
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='imaging_orders',
    )
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='imaging_orders',
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imaging_orders',
    )
    imaging_type = models.ForeignKey(
        ImagingType,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    body_part = models.CharField(max_length=100)
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='ROUTINE',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ORDERED',
    )
    scheduled_date = models.DateTimeField(null=True, blank=True)
    clinical_indication = models.TextField()
    special_instructions = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} - {self.patient}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            last_order = (
                ImagingOrder.objects.order_by('-id').first()
            )
            if last_order and last_order.order_number.startswith('IMG-'):
                last_number = int(last_order.order_number.split('-')[1])
                new_number = last_number + 1
            else:
                new_number = 1
            self.order_number = f"IMG-{new_number:06d}"
        super().save(*args, **kwargs)


class ImagingReport(models.Model):
    SEVERITY_CHOICES = (
        ('NORMAL', 'Normal'),
        ('MILD', 'Mild'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
        ('CRITICAL', 'Critical'),
    )

    imaging_order = models.OneToOneField(
        ImagingOrder,
        on_delete=models.CASCADE,
        related_name='report',
    )
    findings = models.TextField()
    impression = models.TextField()
    recommendation = models.TextField(blank=True)
    reported_by = models.CharField(max_length=200)
    verified_by = models.CharField(max_length=200, blank=True)
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default='NORMAL',
    )
    report_file = models.FileField(
        upload_to='radiology_reports/',
        blank=True,
        null=True,
    )
    images = models.FileField(
        upload_to='radiology_images/',
        blank=True,
        null=True,
    )
    reported_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Report for {self.imaging_order.order_number}"
