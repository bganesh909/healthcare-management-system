from django.db import models
from patients.models import Patient
from doctors.models import Doctor
from appointments.models import Appointment


class DischargeSummary(models.Model):
    DISCHARGE_TYPE_CHOICES = (
        ('NORMAL', 'Normal'),
        ('AGAINST_MEDICAL_ADVICE', 'Against Medical Advice'),
        ('TRANSFERRED', 'Transferred'),
        ('EXPIRED', 'Expired'),
        ('ABSCONDED', 'Absconded'),
    )

    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('COMPLETED', 'Completed'),
        ('APPROVED', 'Approved'),
    )

    summary_number = models.CharField(max_length=20, unique=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='discharge_summaries')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='discharge_summaries')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    admission_date = models.DateField()
    discharge_date = models.DateField()
    discharge_type = models.CharField(max_length=30, choices=DISCHARGE_TYPE_CHOICES, default='NORMAL')
    admission_diagnosis = models.TextField()
    discharge_diagnosis = models.TextField()
    procedures_performed = models.TextField(blank=True)
    treatment_given = models.TextField()
    condition_at_discharge = models.TextField()
    medications_on_discharge = models.TextField(blank=True)
    dietary_instructions = models.TextField(blank=True)
    activity_restrictions = models.TextField(blank=True)
    follow_up_instructions = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    emergency_instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    approved_by = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.summary_number:
            last = DischargeSummary.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.summary_number = f"DS-{next_id:06d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.summary_number} - {self.patient}"

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Discharge Summaries'


class FollowUp(models.Model):
    FOLLOW_UP_TYPE_CHOICES = (
        ('POST_SURGERY', 'Post Surgery'),
        ('POST_DISCHARGE', 'Post Discharge'),
        ('ROUTINE', 'Routine'),
        ('LAB_REVIEW', 'Lab Review'),
        ('IMAGING_REVIEW', 'Imaging Review'),
        ('MEDICATION_REVIEW', 'Medication Review'),
    )

    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('COMPLETED', 'Completed'),
        ('MISSED', 'Missed'),
        ('CANCELLED', 'Cancelled'),
        ('RESCHEDULED', 'Rescheduled'),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='follow_ups')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='follow_ups')
    discharge_summary = models.ForeignKey(DischargeSummary, on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_ups')
    scheduled_date = models.DateField()
    follow_up_type = models.CharField(max_length=20, choices=FOLLOW_UP_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    reason = models.TextField()
    notes = models.TextField(blank=True)
    completed_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Follow-up: {self.patient} on {self.scheduled_date}"

    class Meta:
        ordering = ['-scheduled_date']


class Readmission(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='readmissions')
    original_discharge = models.ForeignKey(DischargeSummary, on_delete=models.CASCADE, related_name='readmissions')
    readmission_date = models.DateField()
    reason = models.TextField()
    is_related_to_original = models.BooleanField(default=False)
    days_since_discharge = models.IntegerField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.original_discharge and self.readmission_date:
            delta = self.readmission_date - self.original_discharge.discharge_date
            self.days_since_discharge = delta.days
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Readmission: {self.patient} on {self.readmission_date}"

    class Meta:
        ordering = ['-readmission_date']
