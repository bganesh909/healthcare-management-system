from django.db import models
from django.conf import settings


class FamilyGroup(models.Model):
    """Group of family members under one primary account"""
    primary_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='family_groups', help_text="The main account holder"
    )
    name = models.CharField(max_length=100, help_text="e.g. 'Sharma Family'")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class FamilyMember(models.Model):
    RELATIONSHIP_CHOICES = (
        ('SELF', 'Self'),
        ('SPOUSE', 'Spouse'),
        ('CHILD', 'Child'),
        ('PARENT', 'Parent'),
        ('SIBLING', 'Sibling'),
        ('OTHER', 'Other'),
    )
    family_group = models.ForeignKey(FamilyGroup, on_delete=models.CASCADE, related_name='members')
    patient = models.ForeignKey('Patient', on_delete=models.CASCADE, related_name='family_links')
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    is_primary = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('family_group', 'patient')
        ordering = ['-is_primary', 'relationship']

    def __str__(self):
        return f"{self.patient} ({self.get_relationship_display()}) in {self.family_group.name}"


class Patient(models.Model):
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(unique=True)
    address = models.TextField()
    medical_history = models.TextField(blank=True, null=True)
    blood_group = models.CharField(max_length=5, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_number = models.CharField(max_length=15, blank=True, null=True)
    # Patient photo - uploaded by staff, confirmed once, not editable by patient
    photo = models.ImageField(upload_to='patient_photos/', blank=True, null=True)
    photo_confirmed = models.BooleanField(default=False, help_text="Photo confirmed by staff, cannot be changed by patient")
    photo_uploaded_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='patient_photos_uploaded'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    class Meta:
        ordering = ['-created_at']


class PatientDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = (
        ('INSURANCE_CARD', 'Insurance Card'),
        ('ID_PROOF', 'ID Proof'),
        ('LAB_REPORT', 'Lab Report'),
        ('PRESCRIPTION', 'Prescription'),
        ('IMAGING', 'Imaging'),
        ('DISCHARGE_SUMMARY', 'Discharge Summary'),
        ('OTHER', 'Other'),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='patient_documents/')
    description = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.patient}"

    class Meta:
        ordering = ['-uploaded_at']

