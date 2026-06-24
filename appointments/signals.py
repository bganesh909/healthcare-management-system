from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from decimal import Decimal

from .models import Appointment
from billing.models import Invoice, InvoiceItem
from notifications.models import Notification


@receiver(pre_save, sender=Appointment)
def track_status_change(sender, instance, **kwargs):
    """Track appointment status changes to trigger workflows."""
    if instance.pk:
        try:
            old = Appointment.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except Appointment.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Appointment)
def appointment_workflow(sender, instance, created, **kwargs):
    """Handle appointment lifecycle events."""
    appointment = instance
    old_status = getattr(appointment, '_old_status', None)

    if created:
        _notify_appointment_scheduled(appointment)

    elif old_status != appointment.status:
        if appointment.status == 'COMPLETED' and old_status != 'COMPLETED':
            _generate_invoice_for_appointment(appointment)
            _notify_appointment_completed(appointment)

        elif appointment.status == 'CANCELLED' and old_status != 'CANCELLED':
            _notify_appointment_cancelled(appointment)


def _generate_invoice_for_appointment(appointment):
    """Auto-generate an invoice when appointment is completed."""
    # Check if invoice already exists
    if hasattr(appointment, 'invoice') and appointment.invoice:
        return

    doctor = appointment.doctor
    invoice = Invoice(
        patient=appointment.patient,
        appointment=appointment,
        status='PENDING',
        due_date=appointment.appointment_date,
        subtotal=doctor.consultation_fee,
        tax_percentage=Decimal('0'),
        tax_amount=Decimal('0'),
        discount=Decimal('0'),
        total_amount=doctor.consultation_fee,
        paid_amount=Decimal('0'),
        notes=f'Consultation with Dr. {doctor.first_name} {doctor.last_name}',
    )
    invoice.save()  # auto-generates invoice_number

    InvoiceItem.objects.create(
        invoice=invoice,
        description=f'Consultation - Dr. {doctor.first_name} {doctor.last_name} ({doctor.get_specialization_display()})',
        item_type='CONSULTATION',
        quantity=1,
        unit_price=doctor.consultation_fee,
        total_price=doctor.consultation_fee,
    )


def _notify_appointment_scheduled(appointment):
    """Notify patient about new appointment."""
    from users.models import User
    patient_user = User.objects.filter(
        patient_profile=appointment.patient
    ).first()
    if patient_user:
        Notification.objects.create(
            recipient=patient_user,
            notification_type='APPOINTMENT',
            title='Appointment Scheduled',
            message=f'Your appointment with Dr. {appointment.doctor.first_name} '
                    f'{appointment.doctor.last_name} is scheduled for '
                    f'{appointment.appointment_date} at {appointment.appointment_time}.',
            priority='MEDIUM',
            link=f'/appointments/{appointment.id}',
        )


def _notify_appointment_completed(appointment):
    """Notify patient about completed appointment and invoice."""
    from users.models import User
    patient_user = User.objects.filter(
        patient_profile=appointment.patient
    ).first()
    if patient_user:
        Notification.objects.create(
            recipient=patient_user,
            notification_type='PAYMENT',
            title='Appointment Completed - Invoice Generated',
            message=f'Your consultation with Dr. {appointment.doctor.first_name} '
                    f'{appointment.doctor.last_name} is complete. '
                    f'An invoice has been generated. Please check your billing section.',
            priority='MEDIUM',
            link=f'/billing',
        )


def _notify_appointment_cancelled(appointment):
    """Notify patient about cancelled appointment."""
    from users.models import User
    patient_user = User.objects.filter(
        patient_profile=appointment.patient
    ).first()
    if patient_user:
        Notification.objects.create(
            recipient=patient_user,
            notification_type='APPOINTMENT',
            title='Appointment Cancelled',
            message=f'Your appointment with Dr. {appointment.doctor.first_name} '
                    f'{appointment.doctor.last_name} on {appointment.appointment_date} '
                    f'has been cancelled.',
            priority='HIGH',
            link=f'/appointments',
        )
