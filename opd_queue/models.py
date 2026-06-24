from django.db import models
from django.utils import timezone
from patients.models import Patient
from doctors.models import Doctor
from departments.models import Department
from appointments.models import Appointment


class QueueEntry(models.Model):
    QUEUE_TYPE_CHOICES = (
        ('APPOINTMENT', 'Appointment'),
        ('WALK_IN', 'Walk In'),
        ('FOLLOW_UP', 'Follow Up'),
        ('EMERGENCY', 'Emergency'),
    )

    STATUS_CHOICES = (
        ('WAITING', 'Waiting'),
        ('IN_CONSULTATION', 'In Consultation'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('NO_SHOW', 'No Show'),
        ('SKIPPED', 'Skipped'),
    )

    PRIORITY_CHOICES = (
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('EMERGENCY', 'Emergency'),
    )

    token_number = models.CharField(max_length=20)
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='queue_entries',
    )
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='queue_entries',
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        related_name='queue_entries',
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='queue_entry',
    )
    queue_type = models.CharField(max_length=15, choices=QUEUE_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='WAITING')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='NORMAL')
    check_in_time = models.DateTimeField(auto_now_add=True)
    called_time = models.DateTimeField(null=True, blank=True)
    consultation_start = models.DateTimeField(null=True, blank=True)
    consultation_end = models.DateTimeField(null=True, blank=True)
    estimated_wait_minutes = models.IntegerField(null=True, blank=True)
    position = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['priority', 'check_in_time']
        verbose_name = 'Queue Entry'
        verbose_name_plural = 'Queue Entries'

    def __str__(self):
        return f"{self.token_number} - {self.patient} (Dr. {self.doctor.last_name})"

    def save(self, *args, **kwargs):
        if not self.token_number:
            today = timezone.now().date()
            last_entry = QueueEntry.objects.filter(date=today).order_by('-id').first()
            if last_entry and last_entry.token_number:
                try:
                    last_num = int(last_entry.token_number.split('-')[1])
                except (IndexError, ValueError):
                    last_num = 0
            else:
                last_num = 0
            self.token_number = f"Q-{last_num + 1:03d}"
        super().save(*args, **kwargs)


class QueueDisplay(models.Model):
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='queue_displays',
    )
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='queue_displays',
    )
    display_name = models.CharField(max_length=100)
    current_token = models.CharField(max_length=20, blank=True)
    next_tokens = models.TextField(blank=True)
    avg_wait_time_minutes = models.IntegerField(default=15)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['department', 'display_name']
        verbose_name = 'Queue Display'
        verbose_name_plural = 'Queue Displays'

    def __str__(self):
        return self.display_name
