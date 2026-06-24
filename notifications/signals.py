import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='appointments.Appointment')
def on_appointment_saved(sender, instance, created, **kwargs):
    """Send notification when an appointment is first created (booked)."""
    if created:
        from .triggers import notify_appointment_booked
        try:
            notify_appointment_booked(instance)
        except Exception:
            logger.exception("Error in notify_appointment_booked for appointment %s", instance.id)


@receiver(post_save, sender='prescriptions.Prescription')
def on_prescription_saved(sender, instance, created, **kwargs):
    """Send notification when a prescription is created."""
    if created:
        from .triggers import notify_prescription_ready
        try:
            notify_prescription_ready(instance)
        except Exception:
            logger.exception("Error in notify_prescription_ready for prescription %s", instance.id)


@receiver(post_save, sender='billing.Payment')
def on_payment_saved(sender, instance, created, **kwargs):
    """Send notification when a payment is recorded."""
    if created:
        from .triggers import notify_payment_received
        try:
            notify_payment_received(instance)
        except Exception:
            logger.exception("Error in notify_payment_received for payment %s", instance.id)


@receiver(post_save, sender='pharmacy.Medicine')
def on_medicine_saved(sender, instance, **kwargs):
    """Send low-stock alert when medicine stock drops to or below the reorder level."""
    if instance.is_low_stock:
        from .triggers import notify_low_stock_alert
        try:
            notify_low_stock_alert(instance)
        except Exception:
            logger.exception("Error in notify_low_stock_alert for medicine %s", instance.id)
