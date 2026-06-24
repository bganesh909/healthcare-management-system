from django.db import models
from patients.models import Patient
from doctors.models import Doctor


# Symptom to specialization mapping
SYMPTOM_SPECIALIZATION_MAP = {
    # Cardiology
    'chest pain': 'CARDIOLOGY', 'heart': 'CARDIOLOGY', 'palpitation': 'CARDIOLOGY',
    'blood pressure': 'CARDIOLOGY', 'bp': 'CARDIOLOGY', 'cardiac': 'CARDIOLOGY',
    'breathlessness': 'CARDIOLOGY', 'heart attack': 'CARDIOLOGY',
    # Neurology
    'headache': 'NEUROLOGY', 'migraine': 'NEUROLOGY', 'seizure': 'NEUROLOGY',
    'numbness': 'NEUROLOGY', 'brain': 'NEUROLOGY', 'memory loss': 'NEUROLOGY',
    'dizziness': 'NEUROLOGY', 'paralysis': 'NEUROLOGY', 'stroke': 'NEUROLOGY',
    # Orthopedics
    'bone': 'ORTHOPEDICS', 'fracture': 'ORTHOPEDICS', 'joint pain': 'ORTHOPEDICS',
    'back pain': 'ORTHOPEDICS', 'knee pain': 'ORTHOPEDICS', 'spine': 'ORTHOPEDICS',
    'shoulder pain': 'ORTHOPEDICS', 'arthritis': 'ORTHOPEDICS', 'sprain': 'ORTHOPEDICS',
    # Dermatology
    'skin': 'DERMATOLOGY', 'rash': 'DERMATOLOGY', 'acne': 'DERMATOLOGY',
    'itching': 'DERMATOLOGY', 'eczema': 'DERMATOLOGY', 'hair loss': 'DERMATOLOGY',
    'allergy skin': 'DERMATOLOGY', 'psoriasis': 'DERMATOLOGY',
    # Gastroenterology
    'stomach': 'GASTROENTEROLOGY', 'digestion': 'GASTROENTEROLOGY', 'abdomen': 'GASTROENTEROLOGY',
    'vomiting': 'GASTROENTEROLOGY', 'diarrhea': 'GASTROENTEROLOGY', 'acidity': 'GASTROENTEROLOGY',
    'liver': 'GASTROENTEROLOGY', 'constipation': 'GASTROENTEROLOGY', 'ulcer': 'GASTROENTEROLOGY',
    # Pediatrics
    'child': 'PEDIATRICS', 'baby': 'PEDIATRICS', 'infant': 'PEDIATRICS',
    'vaccination': 'PEDIATRICS', 'growth': 'PEDIATRICS',
    # Gynecology
    'pregnancy': 'GYNECOLOGY', 'menstrual': 'GYNECOLOGY', 'period': 'GYNECOLOGY',
    'pcos': 'GYNECOLOGY', 'fertility': 'GYNECOLOGY', 'ovary': 'GYNECOLOGY',
    # Psychiatry
    'depression': 'PSYCHIATRY', 'anxiety': 'PSYCHIATRY', 'stress': 'PSYCHIATRY',
    'sleep disorder': 'PSYCHIATRY', 'insomnia': 'PSYCHIATRY', 'mental health': 'PSYCHIATRY',
    # Endocrinology
    'diabetes': 'ENDOCRINOLOGY', 'thyroid': 'ENDOCRINOLOGY', 'hormonal': 'ENDOCRINOLOGY',
    'sugar': 'ENDOCRINOLOGY', 'insulin': 'ENDOCRINOLOGY',
    # Oncology
    'cancer': 'ONCOLOGY', 'tumor': 'ONCOLOGY', 'lump': 'ONCOLOGY', 'chemotherapy': 'ONCOLOGY',
    # General
    'fever': 'GENERAL', 'cold': 'GENERAL', 'cough': 'GENERAL', 'flu': 'GENERAL',
    'infection': 'GENERAL', 'fatigue': 'GENERAL', 'weakness': 'GENERAL',
    'body pain': 'GENERAL', 'general checkup': 'GENERAL', 'health checkup': 'GENERAL',
}


def get_specializations_for_symptoms(symptoms_text):
    """Given symptom text, return list of matching specializations"""
    if not symptoms_text:
        return ['GENERAL']
    text = symptoms_text.lower()
    specializations = set()
    for keyword, spec in SYMPTOM_SPECIALIZATION_MAP.items():
        if keyword in text:
            specializations.add(spec)
    return list(specializations) if specializations else ['GENERAL']


class Appointment(models.Model):
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('CHECKED_IN', 'Checked In'),
        ('VITALS_RECORDED', 'Vitals Recorded'),
        ('FEES_PAID', 'Fees Paid'),
        ('READY', 'Ready for Consultation'),
        ('IN_CONSULTATION', 'In Consultation'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('NO_SHOW', 'No Show'),
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    # Patient's problem/symptoms - used for doctor suggestion
    symptoms = models.TextField(blank=True, help_text="Patient's symptoms or health problem")
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    notes = models.TextField(blank=True, null=True)
    check_in_time = models.DateTimeField(blank=True, null=True)
    check_out_time = models.DateTimeField(blank=True, null=True)
    token_number = models.PositiveIntegerField(blank=True, null=True)
    is_walk_in = models.BooleanField(default=False)
    # Mandatory workflow flags
    vitals_recorded = models.BooleanField(default=False, help_text="Staff has recorded BP, height, weight")
    fees_paid = models.BooleanField(default=False, help_text="Consulting fees have been paid")
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fee_receipt_number = models.CharField(max_length=50, blank=True)
    prescription_uploaded = models.BooleanField(default=False, help_text="Doctor has uploaded prescription")
    lab_ordered = models.BooleanField(default=False)
    lab_results_uploaded = models.BooleanField(default=False)
    # Staff who processed
    checked_in_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='checkins_processed'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.patient} with Dr. {self.doctor.last_name} on {self.appointment_date}"

    class Meta:
        ordering = ['-appointment_date', '-appointment_time']
        unique_together = ['doctor', 'appointment_date', 'appointment_time']

    @property
    def is_ready_for_consultation(self):
        return self.vitals_recorded and self.fees_paid

    @property
    def suggested_specializations(self):
        return get_specializations_for_symptoms(self.symptoms)


class TimeSlot(models.Model):
    DAY_CHOICES = (
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    )
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='time_slots')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.IntegerField(default=30, help_text='Duration in minutes per slot')
    max_patients = models.IntegerField(default=1, help_text='Maximum patients per slot')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Dr. {self.doctor.last_name} - {self.get_day_of_week_display()} {self.start_time}-{self.end_time}"

    class Meta:
        ordering = ['doctor', 'day_of_week', 'start_time']
        unique_together = ['doctor', 'day_of_week', 'start_time']


class DoctorLeave(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='leaves')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=200, blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dr. {self.doctor.last_name} leave: {self.start_date} to {self.end_date}"

    class Meta:
        ordering = ['-start_date']


class ConsentForm(models.Model):
    CONSENT_TYPES = (
        ('GENERAL', 'General Treatment Consent'),
        ('SURGERY', 'Surgical Consent'),
        ('ANESTHESIA', 'Anesthesia Consent'),
        ('BLOOD_TRANSFUSION', 'Blood Transfusion Consent'),
        ('IMAGING', 'Radiology/Imaging Consent'),
        ('PROCEDURE', 'Procedure Consent'),
        ('DISCHARGE_AMA', 'Discharge Against Medical Advice'),
        ('COVID_SCREENING', 'COVID Screening Consent'),
    )
    appointment = models.ForeignKey('Appointment', on_delete=models.CASCADE, related_name='consent_forms')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='consent_forms')
    consent_type = models.CharField(max_length=30, choices=CONSENT_TYPES)
    description = models.TextField()
    risks_explained = models.TextField(blank=True)
    patient_signature = models.TextField(blank=True, help_text="Base64 encoded signature image")
    witness_name = models.CharField(max_length=100, blank=True)
    witness_signature = models.TextField(blank=True)
    consented = models.BooleanField(default=False)
    consented_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_consent_type_display()} - {self.patient}"


class PatientFeedback(models.Model):
    """NPS / Patient Satisfaction Survey after consultation"""
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='feedback')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='feedbacks')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='feedbacks')
    # NPS Score: 0-10 (0-6 Detractor, 7-8 Passive, 9-10 Promoter)
    overall_rating = models.IntegerField(help_text="0-10 NPS score")
    # Specific ratings 1-5
    doctor_rating = models.IntegerField(default=0, help_text="Doctor consultation quality 1-5")
    staff_rating = models.IntegerField(default=0, help_text="Staff behavior 1-5")
    cleanliness_rating = models.IntegerField(default=0, help_text="Hospital cleanliness 1-5")
    wait_time_rating = models.IntegerField(default=0, help_text="Wait time satisfaction 1-5")
    billing_rating = models.IntegerField(default=0, help_text="Billing transparency 1-5")
    # Text feedback
    liked = models.TextField(blank=True, help_text="What did you like?")
    improvement = models.TextField(blank=True, help_text="What can be improved?")
    recommend = models.BooleanField(default=True, help_text="Would you recommend this hospital?")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback by {self.patient} - NPS: {self.overall_rating}"

    @property
    def nps_category(self):
        if self.overall_rating >= 9:
            return 'Promoter'
        elif self.overall_rating >= 7:
            return 'Passive'
        return 'Detractor'
