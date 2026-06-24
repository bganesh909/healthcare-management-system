from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True, null=True)
    head_doctor = models.ForeignKey(
        'doctors.Doctor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments',
    )
    phone_extension = models.CharField(max_length=10, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    floor = models.CharField(max_length=10, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Ward(models.Model):
    WARD_TYPE_CHOICES = (
        ('GENERAL', 'General'),
        ('SEMI_PRIVATE', 'Semi Private'),
        ('PRIVATE', 'Private'),
        ('ICU', 'ICU'),
        ('NICU', 'NICU'),
        ('EMERGENCY', 'Emergency'),
        ('OPERATION_THEATER', 'Operation Theater'),
    )

    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='wards',
    )
    ward_type = models.CharField(max_length=20, choices=WARD_TYPE_CHOICES)
    floor = models.CharField(max_length=10)
    total_beds = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.get_ward_type_display()}"

    @property
    def available_beds(self):
        occupied = self.beds.filter(status='OCCUPIED').count()
        return self.total_beds - occupied


class Bed(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('OCCUPIED', 'Occupied'),
        ('MAINTENANCE', 'Maintenance'),
        ('RESERVED', 'Reserved'),
    )

    bed_number = models.CharField(max_length=20)
    ward = models.ForeignKey(
        Ward,
        on_delete=models.CASCADE,
        related_name='beds',
    )
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='AVAILABLE',
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bed_assignment',
    )
    admission_date = models.DateTimeField(blank=True, null=True)
    expected_discharge = models.DateField(blank=True, null=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ['ward', 'bed_number']
        ordering = ['ward', 'bed_number']

    def __str__(self):
        return f"Bed {self.bed_number} - {self.ward.name}"
