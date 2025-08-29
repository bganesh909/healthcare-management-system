from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.conf import settings
from django.apps import apps
from doctors.models import Doctor
from patients.models import Patient
@receiver(post_save, sender=Doctor)
def create_or_update_doctor_user(sender, instance, created, **kwargs):
    if kwargs.get('raw', False):
        return
    if not hasattr(instance, 'user_account') or instance.user_account is None:
        User = apps.get_model(settings.AUTH_USER_MODEL)         
        try:
            user = User.objects.get(email=instance.email)
            user.role = User.DOCTOR
            user.doctor_profile = instance
            user.save()
        except User.DoesNotExist:
            user = User.objects.create(
                email=instance.email,
                first_name=instance.first_name,
                last_name=instance.last_name,
                phone_number=instance.phone_number,
                role=User.DOCTOR,
                doctor_profile=instance
            )
            user.set_unusable_password()
            user.save()
@receiver(post_save, sender=Patient)
def create_or_update_patient_user(sender, instance, created, **kwargs):
    if kwargs.get('raw', False):
        return
    if not hasattr(instance, 'user_account') or instance.user_account is None:
        User = apps.get_model(settings.AUTH_USER_MODEL)
        try:
            user = User.objects.get(email=instance.email)
            user.role = User.PATIENT
            user.patient_profile = instance
            user.save()
        except User.DoesNotExist:
            user = User.objects.create(
                email=instance.email,
                first_name=instance.first_name,
                last_name=instance.last_name,
                phone_number=instance.phone_number,
                role=User.PATIENT,
                patient_profile=instance
            )
            user.set_unusable_password()
            user.save()
@receiver(post_delete, sender=Doctor)
def disconnect_doctor_user(sender, instance, **kwargs):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    try:
        user = User.objects.get(doctor_profile=instance)
        user.doctor_profile = None
        if user.patient_profile is None:
            user.role = User.PATIENT
        user.save()
    except User.DoesNotExist:
        pass
@receiver(post_delete, sender=Patient)
def disconnect_patient_user(sender, instance, **kwargs):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    try:
        user = User.objects.get(patient_profile=instance)
        user.patient_profile = None
        if user.doctor_profile is None:
            user.role = User.PATIENT
        user.save()
    except User.DoesNotExist:
        pass

