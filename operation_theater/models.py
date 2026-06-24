import random
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class OperationTheater(models.Model):
    THEATER_TYPE_CHOICES = (
        ('MAJOR', 'Major'),
        ('MINOR', 'Minor'),
        ('CARDIAC', 'Cardiac'),
        ('NEURO', 'Neuro'),
        ('ORTHOPEDIC', 'Orthopedic'),
        ('OPHTHALMIC', 'Ophthalmic'),
        ('EMERGENCY', 'Emergency'),
    )

    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('IN_USE', 'In Use'),
        ('UNDER_MAINTENANCE', 'Under Maintenance'),
        ('RESERVED', 'Reserved'),
    )

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    floor = models.CharField(max_length=10)
    theater_type = models.CharField(max_length=20, choices=THEATER_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    equipment_list = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Surgery(models.Model):
    SURGERY_TYPE_CHOICES = (
        ('ELECTIVE', 'Elective'),
        ('EMERGENCY', 'Emergency'),
        ('DAY_CASE', 'Day Case'),
    )

    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('POSTPONED', 'Postponed'),
    )

    ANESTHESIA_TYPE_CHOICES = (
        ('GENERAL', 'General'),
        ('SPINAL', 'Spinal'),
        ('EPIDURAL', 'Epidural'),
        ('LOCAL', 'Local'),
        ('REGIONAL', 'Regional'),
        ('SEDATION', 'Sedation'),
    )

    surgery_number = models.CharField(max_length=20, unique=True)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='surgeries',
    )
    primary_surgeon = models.ForeignKey(
        'doctors.Doctor',
        on_delete=models.CASCADE,
        related_name='surgeries_as_primary',
    )
    operation_theater = models.ForeignKey(
        OperationTheater,
        on_delete=models.CASCADE,
        related_name='surgeries',
    )
    surgery_type = models.CharField(max_length=20, choices=SURGERY_TYPE_CHOICES)
    procedure_name = models.CharField(max_length=300)
    diagnosis = models.TextField()
    scheduled_date = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    anesthesia_type = models.CharField(max_length=20, choices=ANESTHESIA_TYPE_CHOICES)
    pre_op_diagnosis = models.TextField(blank=True)
    post_op_diagnosis = models.TextField(blank=True)
    procedure_notes = models.TextField(blank=True)
    complications = models.TextField(blank=True)
    estimated_duration = models.IntegerField(help_text='Duration in minutes')
    actual_duration = models.IntegerField(null=True, blank=True)
    blood_loss_ml = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_date']
        verbose_name_plural = 'surgeries'

    def __str__(self):
        return f"{self.surgery_number} - {self.procedure_name}"

    def save(self, *args, **kwargs):
        if not self.surgery_number:
            self.surgery_number = f"SURG-{random.randint(100000, 999999)}"
            while Surgery.objects.filter(surgery_number=self.surgery_number).exists():
                self.surgery_number = f"SURG-{random.randint(100000, 999999)}"
        super().save(*args, **kwargs)


class SurgicalTeam(models.Model):
    ROLE_CHOICES = (
        ('SURGEON', 'Surgeon'),
        ('ASSISTANT_SURGEON', 'Assistant Surgeon'),
        ('ANESTHESIOLOGIST', 'Anesthesiologist'),
        ('SCRUB_NURSE', 'Scrub Nurse'),
        ('CIRCULATING_NURSE', 'Circulating Nurse'),
        ('TECHNICIAN', 'Technician'),
    )

    surgery = models.ForeignKey(
        Surgery,
        on_delete=models.CASCADE,
        related_name='team_members',
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    member_name = models.CharField(max_length=200)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['surgery', 'role']

    def __str__(self):
        return f"{self.member_name} - {self.get_role_display()} ({self.surgery.surgery_number})"


class PreOpChecklist(models.Model):
    surgery = models.OneToOneField(
        Surgery,
        on_delete=models.CASCADE,
        related_name='pre_op_checklist',
    )
    patient_identity_confirmed = models.BooleanField(default=False)
    consent_signed = models.BooleanField(default=False)
    site_marked = models.BooleanField(default=False)
    allergies_checked = models.BooleanField(default=False)
    blood_type_confirmed = models.BooleanField(default=False)
    blood_units_available = models.BooleanField(default=False)
    npo_status_confirmed = models.BooleanField(default=False)
    pre_op_medications_given = models.BooleanField(default=False)
    imaging_available = models.BooleanField(default=False)
    lab_results_reviewed = models.BooleanField(default=False)
    anesthesia_assessment_done = models.BooleanField(default=False)
    equipment_checked = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    completed_by = models.CharField(max_length=200)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Pre-Op Checklist'
        verbose_name_plural = 'Pre-Op Checklists'

    def __str__(self):
        return f"Pre-Op Checklist for {self.surgery.surgery_number}"

    @property
    def is_complete(self):
        return all([
            self.patient_identity_confirmed,
            self.consent_signed,
            self.site_marked,
            self.allergies_checked,
            self.blood_type_confirmed,
            self.blood_units_available,
            self.npo_status_confirmed,
            self.pre_op_medications_given,
            self.imaging_available,
            self.lab_results_reviewed,
            self.anesthesia_assessment_done,
            self.equipment_checked,
        ])


class PostOpNote(models.Model):
    RECOVERY_STATUS_CHOICES = (
        ('STABLE', 'Stable'),
        ('GUARDED', 'Guarded'),
        ('CRITICAL', 'Critical'),
        ('GOOD', 'Good'),
    )

    CONSCIOUSNESS_LEVEL_CHOICES = (
        ('ALERT', 'Alert'),
        ('DROWSY', 'Drowsy'),
        ('RESPONSIVE_TO_PAIN', 'Responsive to Pain'),
        ('UNRESPONSIVE', 'Unresponsive'),
    )

    surgery = models.OneToOneField(
        Surgery,
        on_delete=models.CASCADE,
        related_name='post_op_note',
    )
    recovery_status = models.CharField(max_length=20, choices=RECOVERY_STATUS_CHOICES)
    pain_level = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)]
    )
    vitals_stable = models.BooleanField(default=True)
    consciousness_level = models.CharField(max_length=30, choices=CONSCIOUSNESS_LEVEL_CHOICES)
    instructions = models.TextField()
    diet_instructions = models.TextField(blank=True)
    activity_restrictions = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    complications = models.TextField(blank=True)
    created_by = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Post-Op Note for {self.surgery.surgery_number}"
