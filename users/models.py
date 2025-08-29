from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
class UserManager(BaseUserManager):
    use_in_migrations = True
    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)
    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        if extra_fields.get('role') != 'admin':
            raise ValueError('Superuser must have role=admin.')
        return self._create_user(email, password, **extra_fields)
class User(AbstractUser):
    ADMIN = 'admin'
    DOCTOR = 'doctor'
    PATIENT = 'patient'
    STAFF = 'staff'
    ROLE_CHOICES = (
        (ADMIN, _('Admin')),
        (DOCTOR, _('Doctor')),
        (PATIENT, _('Patient')),
        (STAFF, _('Staff')),
    )
    username = None
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(_('role'), max_length=20, choices=ROLE_CHOICES, default=PATIENT)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    doctor_profile = models.OneToOneField(
        'doctors.Doctor', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='user_account'
    )
    patient_profile = models.OneToOneField(
        'patients.Patient', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='user_account'
    )
    email_verified = models.BooleanField(default=False)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()
    def __str__(self):
        return self.email
    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()
    @property
    def is_admin(self):
        return self.role == self.ADMIN
    @property
    def is_doctor(self):
        return self.role == self.DOCTOR
    @property
    def is_patient(self):
        return self.role == self.PATIENT
    @property
    def is_staff_member(self):
        return self.role == self.STAFF

