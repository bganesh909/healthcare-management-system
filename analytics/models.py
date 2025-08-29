from django.db import models
from django.utils import timezone
from patients.models import Patient
from doctors.models import Doctor
from appointments.models import Appointment
class DailyMetrics(models.Model):
    date = models.DateField(unique=True)
    new_patients = models.IntegerField(default=0)
    new_appointments = models.IntegerField(default=0)
    completed_appointments = models.IntegerField(default=0)
    cancelled_appointments = models.IntegerField(default=0)
    no_show_appointments = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    avg_appointment_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-date']
        verbose_name = 'Daily Metric'
        verbose_name_plural = 'Daily Metrics'
    def __str__(self):
        return f"Metrics for {self.date}"
class DoctorPerformance(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='performance_metrics')
    date = models.DateField()
    appointments_count = models.IntegerField(default=0)
    completed_count = models.IntegerField(default=0)
    cancelled_count = models.IntegerField(default=0)
    no_show_count = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-date']
        unique_together = ['doctor', 'date']
    def __str__(self):
        return f"{self.doctor} - {self.date}"
    @property
    def completion_rate(self):
        if self.appointments_count == 0:
            return 0
        return (self.completed_count / self.appointments_count) * 100
class PatientActivity(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='activity_metrics')
    date = models.DateField()
    appointments_count = models.IntegerField(default=0)
    completed_count = models.IntegerField(default=0)
    cancelled_count = models.IntegerField(default=0)
    no_show_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-date']
        unique_together = ['patient', 'date']
    def __str__(self):
        return f"{self.patient} - {self.date}"
    @property
    def attendance_rate(self):
        if self.appointments_count == 0:
            return 0
        return (self.completed_count / self.appointments_count) * 100

