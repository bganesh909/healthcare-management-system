from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Doctor(models.Model):
    SPECIALIZATION_CHOICES = (
        ('CARDIOLOGY', 'Cardiology'),
        ('DERMATOLOGY', 'Dermatology'),
        ('ENDOCRINOLOGY', 'Endocrinology'),
        ('GASTROENTEROLOGY', 'Gastroenterology'),
        ('NEUROLOGY', 'Neurology'),
        ('ONCOLOGY', 'Oncology'),
        ('PEDIATRICS', 'Pediatrics'),
        ('PSYCHIATRY', 'Psychiatry'),
        ('ORTHOPEDICS', 'Orthopedics'),
        ('GYNECOLOGY', 'Gynecology'),
        ('GENERAL', 'General Medicine'),
        ('OTHER', 'Other'),
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialization = models.CharField(max_length=20, choices=SPECIALIZATION_CHOICES)
    license_number = models.CharField(max_length=50, unique=True)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(unique=True)
    qualification = models.CharField(max_length=255)
    experience_years = models.PositiveIntegerField()
    bio = models.TextField(blank=True, null=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    available_days = models.CharField(max_length=100, help_text="Comma separated days")
    available_hours_start = models.TimeField()
    available_hours_end = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name} ({self.get_specialization_display()})"
    class Meta:
        ordering = ['last_name', 'first_name']


class DoctorReview(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='reviews')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='doctor_reviews')
    appointment = models.ForeignKey(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='review'
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, null=True)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Review by {self.patient} for Dr. {self.doctor.last_name} - {self.rating}/5"

    class Meta:
        unique_together = ['doctor', 'patient', 'appointment']
        ordering = ['-created_at']

