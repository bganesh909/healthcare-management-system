import random
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class EmergencyVisit(models.Model):
    TRIAGE_LEVEL_CHOICES = (
        (1, 'Resuscitation'),
        (2, 'Emergent'),
        (3, 'Urgent'),
        (4, 'Less Urgent'),
        (5, 'Non-Urgent'),
    )

    TRIAGE_COLOR_MAP = {
        1: 'Red',
        2: 'Orange',
        3: 'Yellow',
        4: 'Green',
        5: 'Blue',
    }

    ARRIVAL_MODE_CHOICES = (
        ('AMBULANCE', 'Ambulance'),
        ('WALK_IN', 'Walk-In'),
        ('POLICE', 'Police'),
        ('REFERRED', 'Referred'),
        ('OTHER', 'Other'),
    )

    STATUS_CHOICES = (
        ('WAITING', 'Waiting'),
        ('TRIAGED', 'Triaged'),
        ('IN_TREATMENT', 'In Treatment'),
        ('ADMITTED', 'Admitted'),
        ('DISCHARGED', 'Discharged'),
        ('TRANSFERRED', 'Transferred'),
        ('DECEASED', 'Deceased'),
        ('LEFT_AMA', 'Left Against Medical Advice'),
    )

    DISPOSITION_CHOICES = (
        ('DISCHARGED', 'Discharged'),
        ('ADMITTED', 'Admitted'),
        ('TRANSFERRED', 'Transferred'),
        ('DECEASED', 'Deceased'),
        ('LEFT_AMA', 'Left Against Medical Advice'),
        ('OBSERVATION', 'Observation'),
    )

    visit_number = models.CharField(max_length=20, unique=True, editable=False)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='emergency_visits',
    )
    triage_level = models.IntegerField(
        choices=TRIAGE_LEVEL_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    chief_complaint = models.TextField()
    arrival_mode = models.CharField(max_length=15, choices=ARRIVAL_MODE_CHOICES)
    arrival_time = models.DateTimeField()
    triage_time = models.DateTimeField(null=True, blank=True)
    treatment_start_time = models.DateTimeField(null=True, blank=True)
    discharge_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='WAITING')
    attending_doctor = models.ForeignKey(
        'doctors.Doctor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_visits',
    )
    assigned_bed = models.ForeignKey(
        'departments.Bed',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_visits',
    )
    vitals_on_arrival = models.TextField(blank=True)
    disposition = models.CharField(max_length=15, choices=DISPOSITION_CHOICES, blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_notes = models.TextField(blank=True)
    is_critical = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-arrival_time']

    def __str__(self):
        return f"{self.visit_number} - {self.patient} ({self.get_status_display()})"

    @property
    def triage_color(self):
        return self.TRIAGE_COLOR_MAP.get(self.triage_level, 'Unknown')

    def save(self, *args, **kwargs):
        if not self.visit_number:
            self.visit_number = self._generate_visit_number()
        super().save(*args, **kwargs)

    def _generate_visit_number(self):
        while True:
            number = f"ER-{random.randint(100000, 999999)}"
            if not EmergencyVisit.objects.filter(visit_number=number).exists():
                return number


class Ambulance(models.Model):
    AMBULANCE_TYPE_CHOICES = (
        ('BASIC', 'Basic'),
        ('ADVANCED', 'Advanced'),
        ('NEONATAL', 'Neonatal'),
        ('CARDIAC', 'Cardiac'),
    )

    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('ON_CALL', 'On Call'),
        ('EN_ROUTE', 'En Route'),
        ('AT_SCENE', 'At Scene'),
        ('RETURNING', 'Returning'),
        ('MAINTENANCE', 'Maintenance'),
    )

    vehicle_number = models.CharField(max_length=20, unique=True)
    ambulance_type = models.CharField(max_length=15, choices=AMBULANCE_TYPE_CHOICES)
    driver_name = models.CharField(max_length=100)
    driver_phone = models.CharField(max_length=15)
    paramedic_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='AVAILABLE')
    current_location = models.CharField(max_length=255, blank=True)
    gps_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_maintenance_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['vehicle_number']

    def __str__(self):
        return f"{self.vehicle_number} ({self.get_ambulance_type_display()})"


class AmbulanceDispatch(models.Model):
    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    )

    STATUS_CHOICES = (
        ('DISPATCHED', 'Dispatched'),
        ('AT_SCENE', 'At Scene'),
        ('EN_ROUTE_HOSPITAL', 'En Route to Hospital'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    ambulance = models.ForeignKey(
        Ambulance,
        on_delete=models.CASCADE,
        related_name='dispatches',
    )
    emergency_visit = models.ForeignKey(
        EmergencyVisit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ambulance_dispatch',
    )
    dispatch_time = models.DateTimeField()
    arrival_at_scene = models.DateTimeField(null=True, blank=True)
    departure_from_scene = models.DateTimeField(null=True, blank=True)
    arrival_at_hospital = models.DateTimeField(null=True, blank=True)
    pickup_location = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DISPATCHED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-dispatch_time']

    def __str__(self):
        return f"Dispatch {self.ambulance.vehicle_number} - {self.get_status_display()}"


class EmergencyContact(models.Model):
    ROLE_CHOICES = (
        ('ON_CALL_DOCTOR', 'On-Call Doctor'),
        ('SURGEON', 'Surgeon'),
        ('ANESTHESIOLOGIST', 'Anesthesiologist'),
        ('BLOOD_BANK', 'Blood Bank'),
        ('POLICE', 'Police'),
        ('FIRE', 'Fire Department'),
        ('POISON_CONTROL', 'Poison Control'),
    )

    name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone_number = models.CharField(max_length=15)
    alternate_phone = models.CharField(max_length=15, blank=True)
    is_available = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['role', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"
