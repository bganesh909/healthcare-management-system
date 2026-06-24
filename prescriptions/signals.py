from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal

from .models import Prescription
from pharmacy.models import Medicine, MedicineOrder, MedicineOrderItem
from notifications.models import Notification


@receiver(post_save, sender=Prescription)
def create_pharmacy_order_from_prescription(sender, instance, created, **kwargs):
    """When a prescription is created, auto-generate a pharmacy order for dispensing."""
    if not created:
        return

    prescription = instance
    items = prescription.items.all()
    if not items.exists():
        return

    # Create the pharmacy order
    order = MedicineOrder(
        patient=prescription.patient,
        prescribed_by=prescription.doctor,
        prescription=prescription,
        status='PENDING',
        notes=f'Auto-generated from prescription for: {prescription.diagnosis}',
    )
    order.save()  # auto-generates order_number

    total = Decimal('0')
    for item in items:
        # Try to find the medicine in inventory
        medicine = Medicine.objects.filter(
            name__icontains=item.medicine_name,
            is_active=True,
        ).first()

        if medicine:
            unit_price = medicine.unit_price
            qty = 1  # Default quantity
            # Try to parse duration for quantity estimate
            duration = item.duration.lower()
            if 'week' in duration:
                try:
                    weeks = int(''.join(c for c in duration if c.isdigit()) or '1')
                    qty = weeks * 7
                except ValueError:
                    qty = 7
            elif 'day' in duration:
                try:
                    qty = int(''.join(c for c in duration if c.isdigit()) or '1')
                except ValueError:
                    qty = 1
            elif 'month' in duration:
                try:
                    months = int(''.join(c for c in duration if c.isdigit()) or '1')
                    qty = months * 30
                except ValueError:
                    qty = 30

            item_total = unit_price * qty
            MedicineOrderItem.objects.create(
                order=order,
                medicine=medicine,
                quantity=qty,
                unit_price=unit_price,
                total_price=item_total,
            )
            total += item_total

    order.total_amount = total
    order.save(update_fields=['total_amount'])

    # Create notification for pharmacy staff
    from users.models import User
    staff_users = User.objects.filter(role='staff')
    for staff_user in staff_users[:5]:  # Limit notifications
        Notification.objects.create(
            recipient=staff_user,
            notification_type='PRESCRIPTION',
            title='New Pharmacy Order',
            message=f'New pharmacy order {order.order_number} for patient '
                    f'{prescription.patient.first_name} {prescription.patient.last_name}. '
                    f'Prescribed by Dr. {prescription.doctor.first_name} {prescription.doctor.last_name}.',
            priority='MEDIUM',
            link=f'/pharmacy',
        )
