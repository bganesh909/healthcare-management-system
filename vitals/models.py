from django.db import models
from patients.models import Patient
from doctors.models import Doctor
from appointments.models import Appointment
from decimal import Decimal


class VitalSign(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals')
    recorded_by = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='recorded_vitals')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, help_text='Temperature in Fahrenheit')
    blood_pressure_systolic = models.IntegerField(null=True)
    blood_pressure_diastolic = models.IntegerField(null=True)
    pulse_rate = models.IntegerField(null=True, help_text='Beats per minute')
    respiratory_rate = models.IntegerField(null=True, help_text='Breaths per minute')
    oxygen_saturation = models.DecimalField(max_digits=4, decimal_places=1, null=True, help_text='SpO2 percentage')
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, help_text='Weight in kg')
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, help_text='Height in cm')
    bmi = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text='Auto-calculated BMI')
    blood_sugar = models.DecimalField(max_digits=6, decimal_places=2, null=True, help_text='Blood sugar in mg/dL')
    notes = models.TextField(blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.weight and self.height and self.height > 0:
            height_m = self.height / Decimal('100')
            self.bmi = round(self.weight / (height_m ** 2), 1)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Vitals for {self.patient} at {self.recorded_at}"

    class Meta:
        ordering = ['-recorded_at']

    def check_thresholds(self):
        """Check vitals against critical thresholds and return alerts"""
        alerts = []
        if self.blood_pressure_systolic:
            if self.blood_pressure_systolic >= 180:
                alerts.append({'vital': 'BP Systolic', 'value': self.blood_pressure_systolic, 'severity': 'CRITICAL', 'message': 'Hypertensive Crisis'})
            elif self.blood_pressure_systolic >= 140:
                alerts.append({'vital': 'BP Systolic', 'value': self.blood_pressure_systolic, 'severity': 'HIGH', 'message': 'High Blood Pressure'})
            elif self.blood_pressure_systolic < 90:
                alerts.append({'vital': 'BP Systolic', 'value': self.blood_pressure_systolic, 'severity': 'LOW', 'message': 'Low Blood Pressure'})

        if self.blood_pressure_diastolic:
            if self.blood_pressure_diastolic >= 120:
                alerts.append({'vital': 'BP Diastolic', 'value': self.blood_pressure_diastolic, 'severity': 'CRITICAL', 'message': 'Hypertensive Crisis'})
            elif self.blood_pressure_diastolic >= 90:
                alerts.append({'vital': 'BP Diastolic', 'value': self.blood_pressure_diastolic, 'severity': 'HIGH', 'message': 'High BP Diastolic'})

        if self.pulse_rate:
            if self.pulse_rate > 120:
                alerts.append({'vital': 'Pulse', 'value': self.pulse_rate, 'severity': 'CRITICAL', 'message': 'Tachycardia'})
            elif self.pulse_rate < 50:
                alerts.append({'vital': 'Pulse', 'value': self.pulse_rate, 'severity': 'CRITICAL', 'message': 'Bradycardia'})

        if self.oxygen_saturation:
            if float(self.oxygen_saturation) < 90:
                alerts.append({'vital': 'SpO2', 'value': float(self.oxygen_saturation), 'severity': 'CRITICAL', 'message': 'Hypoxemia - Needs oxygen'})
            elif float(self.oxygen_saturation) < 95:
                alerts.append({'vital': 'SpO2', 'value': float(self.oxygen_saturation), 'severity': 'HIGH', 'message': 'Low oxygen saturation'})

        if self.temperature:
            temp = float(self.temperature)
            if temp >= 104:
                alerts.append({'vital': 'Temperature', 'value': temp, 'severity': 'CRITICAL', 'message': 'Hyperpyrexia'})
            elif temp >= 100.4:
                alerts.append({'vital': 'Temperature', 'value': temp, 'severity': 'HIGH', 'message': 'Fever'})
            elif temp < 95:
                alerts.append({'vital': 'Temperature', 'value': temp, 'severity': 'CRITICAL', 'message': 'Hypothermia'})

        if self.blood_sugar:
            sugar = float(self.blood_sugar)
            if sugar > 300:
                alerts.append({'vital': 'Blood Sugar', 'value': sugar, 'severity': 'CRITICAL', 'message': 'Severe Hyperglycemia'})
            elif sugar > 200:
                alerts.append({'vital': 'Blood Sugar', 'value': sugar, 'severity': 'HIGH', 'message': 'High Blood Sugar'})
            elif sugar < 70:
                alerts.append({'vital': 'Blood Sugar', 'value': sugar, 'severity': 'CRITICAL', 'message': 'Hypoglycemia'})

        if self.respiratory_rate:
            if self.respiratory_rate > 25:
                alerts.append({'vital': 'Respiratory Rate', 'value': self.respiratory_rate, 'severity': 'HIGH', 'message': 'Tachypnea'})
            elif self.respiratory_rate < 10:
                alerts.append({'vital': 'Respiratory Rate', 'value': self.respiratory_rate, 'severity': 'CRITICAL', 'message': 'Bradypnea'})

        return alerts


class VitalsAlert(models.Model):
    SEVERITY_CHOICES = (
        ('LOW', 'Low'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    )
    vital_sign = models.ForeignKey(VitalSign, on_delete=models.CASCADE, related_name='alerts')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals_alerts')
    vital_name = models.CharField(max_length=50)
    value = models.CharField(max_length=50)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    message = models.CharField(max_length=200)
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ALERT: {self.patient} - {self.vital_name} {self.severity}"


class ClinicalNote(models.Model):
    NOTE_TYPE_CHOICES = (
        ('SOAP', 'SOAP Note'),
        ('PROGRESS', 'Progress Note'),
        ('ADMISSION', 'Admission Note'),
        ('DISCHARGE', 'Discharge Note'),
        ('CONSULTATION', 'Consultation Note'),
        ('OPERATIVE', 'Operative Note'),
        ('OTHER', 'Other'),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='clinical_notes')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='clinical_notes')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES)
    subjective = models.TextField(blank=True, null=True, help_text="Patient's complaints")
    objective = models.TextField(blank=True, null=True, help_text='Examination findings')
    assessment = models.TextField(blank=True, null=True, help_text='Diagnosis/assessment')
    plan = models.TextField(blank=True, null=True, help_text='Treatment plan')
    content = models.TextField(blank=True, null=True, help_text='For non-SOAP notes')
    is_confidential = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_note_type_display()} for {self.patient} by Dr. {self.doctor.last_name}"

    class Meta:
        ordering = ['-created_at']


class TreatmentPlan(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
        ('CANCELLED', 'Cancelled'),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='treatment_plans')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='treatment_plans')
    title = models.CharField(max_length=200)
    diagnosis = models.TextField()
    goals = models.TextField()
    interventions = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} for {self.patient}"

    class Meta:
        ordering = ['-created_at']


class Allergy(models.Model):
    SEVERITY_CHOICES = (
        ('MILD', 'Mild'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
        ('LIFE_THREATENING', 'Life Threatening'),
    )

    ALLERGY_TYPE_CHOICES = (
        ('DRUG', 'Drug'),
        ('FOOD', 'Food'),
        ('ENVIRONMENTAL', 'Environmental'),
        ('LATEX', 'Latex'),
        ('OTHER', 'Other'),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='allergy_records')
    allergen = models.CharField(max_length=200)
    allergy_type = models.CharField(max_length=20, choices=ALLERGY_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    reaction = models.TextField()
    first_observed = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.allergen} ({self.get_severity_display()}) - {self.patient}"

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Allergies'
