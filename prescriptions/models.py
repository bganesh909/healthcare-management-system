from django.db import models
from patients.models import Patient
from doctors.models import Doctor
from appointments.models import Appointment


class Prescription(models.Model):
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name='prescription'
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='prescriptions'
    )
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name='prescriptions'
    )
    diagnosis = models.TextField()
    notes = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Prescription for {self.patient} by Dr. {self.doctor.last_name} on {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ['-created_at']


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name='items'
    )
    medicine_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, help_text="e.g., 500mg")
    frequency = models.CharField(max_length=100, help_text="e.g., Twice daily")
    duration = models.CharField(max_length=100, help_text="e.g., 7 days")
    instructions = models.TextField(blank=True, null=True, help_text="e.g., Take after meals")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medicine_name} - {self.dosage} ({self.frequency})"

    class Meta:
        ordering = ['id']


class MedicalRecord(models.Model):
    RECORD_TYPE_CHOICES = (
        ('DIAGNOSIS', 'Diagnosis'),
        ('LAB_RESULT', 'Lab Result'),
        ('IMAGING', 'Imaging'),
        ('PROCEDURE', 'Procedure'),
        ('VACCINATION', 'Vaccination'),
        ('ALLERGY', 'Allergy'),
        ('NOTE', 'Note'),
        ('OTHER', 'Other'),
    )

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='medical_records'
    )
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name='medical_records'
    )
    record_type = models.CharField(max_length=20, choices=RECORD_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    file = models.FileField(upload_to='medical_records/', blank=True, null=True)
    record_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.patient} ({self.get_record_type_display()})"

    class Meta:
        ordering = ['-record_date']


class DrugInteraction(models.Model):
    SEVERITY_CHOICES = (
        ('MILD', 'Mild'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
        ('CONTRAINDICATED', 'Contraindicated'),
    )
    drug_a = models.CharField(max_length=200, db_index=True)
    drug_b = models.CharField(max_length=200, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    description = models.TextField()
    recommendation = models.TextField(blank=True)

    class Meta:
        unique_together = ('drug_a', 'drug_b')
        ordering = ['drug_a', 'drug_b']

    def __str__(self):
        return f"{self.drug_a} + {self.drug_b} ({self.severity})"


class PrescriptionTemplate(models.Model):
    name = models.CharField(max_length=200)
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE,
        related_name='prescription_templates',
        null=True, blank=True,
    )
    diagnosis = models.CharField(max_length=300)
    is_global = models.BooleanField(
        default=False, help_text="Available to all doctors"
    )
    items = models.JSONField(
        default=list,
        help_text="[{medicine_name, dosage, frequency, duration, instructions}]",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({'Global' if self.is_global else 'Personal'})"
