from django.db import models


class BloodDonor(models.Model):
    BLOOD_GROUP_CHOICES = (
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    )

    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField()
    address = models.TextField()
    last_donation_date = models.DateField(null=True, blank=True)
    total_donations = models.IntegerField(default=0)
    is_eligible = models.BooleanField(default=True)
    medical_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.blood_group})"

    class Meta:
        ordering = ['-created_at']


class BloodUnit(models.Model):
    BLOOD_GROUP_CHOICES = BloodDonor.BLOOD_GROUP_CHOICES

    COMPONENT_CHOICES = (
        ('WHOLE_BLOOD', 'Whole Blood'),
        ('PACKED_RBC', 'Packed RBC'),
        ('PLATELETS', 'Platelets'),
        ('FRESH_FROZEN_PLASMA', 'Fresh Frozen Plasma'),
        ('CRYOPRECIPITATE', 'Cryoprecipitate'),
    )

    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('RESERVED', 'Reserved'),
        ('ISSUED', 'Issued'),
        ('EXPIRED', 'Expired'),
        ('DISCARDED', 'Discarded'),
        ('TESTING', 'Testing'),
    )

    unit_number = models.CharField(max_length=20, unique=True)
    donor = models.ForeignKey(
        BloodDonor, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='donations'
    )
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES)
    component_type = models.CharField(max_length=25, choices=COMPONENT_CHOICES)
    collection_date = models.DateField()
    expiry_date = models.DateField()
    volume_ml = models.IntegerField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='TESTING')
    storage_location = models.CharField(max_length=50)
    tested_by = models.CharField(max_length=200, blank=True)
    is_tested = models.BooleanField(default=False)
    test_results = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.unit_number} - {self.blood_group} ({self.get_status_display()})"

    class Meta:
        ordering = ['-created_at']


class BloodRequest(models.Model):
    BLOOD_GROUP_CHOICES = BloodDonor.BLOOD_GROUP_CHOICES
    COMPONENT_CHOICES = BloodUnit.COMPONENT_CHOICES

    PRIORITY_CHOICES = (
        ('ROUTINE', 'Routine'),
        ('URGENT', 'Urgent'),
        ('EMERGENCY', 'Emergency'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('CROSS_MATCHED', 'Cross Matched'),
        ('ISSUED', 'Issued'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    request_number = models.CharField(max_length=20, unique=True)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE, related_name='blood_requests'
    )
    doctor = models.ForeignKey(
        'doctors.Doctor', on_delete=models.CASCADE, related_name='blood_requests'
    )
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES)
    component_type = models.CharField(max_length=25, choices=COMPONENT_CHOICES)
    units_required = models.IntegerField()
    priority = models.CharField(max_length=15, choices=PRIORITY_CHOICES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    reason = models.TextField()
    required_date = models.DateField()
    approved_by = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.request_number} - {self.patient} ({self.get_status_display()})"

    class Meta:
        ordering = ['-created_at']


class CrossMatch(models.Model):
    RESULT_CHOICES = (
        ('COMPATIBLE', 'Compatible'),
        ('INCOMPATIBLE', 'Incompatible'),
        ('PENDING', 'Pending'),
    )

    blood_request = models.ForeignKey(
        BloodRequest, on_delete=models.CASCADE, related_name='cross_matches'
    )
    blood_unit = models.ForeignKey(
        BloodUnit, on_delete=models.CASCADE
    )
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE
    )
    result = models.CharField(max_length=15, choices=RESULT_CHOICES, default='PENDING')
    tested_by = models.CharField(max_length=200)
    tested_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"CrossMatch: {self.blood_request.request_number} - {self.get_result_display()}"

    class Meta:
        ordering = ['-tested_at']
