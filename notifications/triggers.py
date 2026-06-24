import logging
from django.conf import settings
from django.core.mail import send_mail
from django.utils.html import strip_tags

from .views import create_notification

logger = logging.getLogger(__name__)


def _build_email_html(title, greeting, body_lines, footer=None):
    """Build a simple HTML email template."""
    body_html = ''.join(f'<p style="margin: 8px 0; color: #333;">{line}</p>' for line in body_lines)
    footer_text = footer or 'Thank you for choosing our healthcare services.'
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">{title}</h1>
        </div>
        <div style="padding: 24px;">
            <p style="font-size: 16px; color: #111;">{greeting}</p>
            {body_html}
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center;
                    font-size: 13px; color: #6b7280;">
            <p style="margin: 0;">{footer_text}</p>
            <p style="margin: 4px 0 0;">This is an automated message. Please do not reply directly.</p>
        </div>
    </div>
    """


def _send_email_safe(subject, html_message, recipient_email):
    """Send an email, catching and logging any errors so callers never crash."""
    try:
        send_mail(
            subject=subject,
            message=strip_tags(html_message),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Email sent: '%s' to %s", subject, recipient_email)
    except Exception:
        logger.exception("Failed to send email: '%s' to %s", subject, recipient_email)


def _get_patient_user(patient):
    """Return the User linked to a Patient, or None."""
    try:
        return patient.user_account
    except Exception:
        return None


def _get_doctor_user(doctor):
    """Return the User linked to a Doctor, or None."""
    try:
        return doctor.user_account
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Trigger functions
# ---------------------------------------------------------------------------

def notify_appointment_booked(appointment):
    """When appointment is booked - notify patient."""
    patient = appointment.patient
    doctor = appointment.doctor
    user = _get_patient_user(patient)

    title = 'Appointment Confirmed'
    message = (
        f'Your appointment with Dr. {doctor.first_name} {doctor.last_name} '
        f'({doctor.get_specialization_display()}) has been confirmed for '
        f'{appointment.appointment_date.strftime("%B %d, %Y")} at '
        f'{appointment.appointment_time.strftime("%I:%M %p")}.'
    )

    if user:
        create_notification(
            recipient=user,
            notification_type='APPOINTMENT_CONFIRMED',
            title=title,
            message=message,
            priority='MEDIUM',
            link=f'/appointments/{appointment.id}',
        )

    html = _build_email_html(
        title='Appointment Confirmation',
        greeting=f'Dear {patient.first_name},',
        body_lines=[
            message,
            f'<strong>Doctor:</strong> Dr. {doctor.first_name} {doctor.last_name}',
            f'<strong>Specialization:</strong> {doctor.get_specialization_display()}',
            f'<strong>Date:</strong> {appointment.appointment_date.strftime("%B %d, %Y")}',
            f'<strong>Time:</strong> {appointment.appointment_time.strftime("%I:%M %p")}',
            'Please arrive 15 minutes before your scheduled time.',
        ],
    )
    _send_email_safe(f'Appointment Confirmed - {appointment.appointment_date}', html, patient.email)


def notify_appointment_reminder(appointment):
    """24hr before appointment - notify patient."""
    patient = appointment.patient
    doctor = appointment.doctor
    user = _get_patient_user(patient)

    title = 'Appointment Reminder'
    message = (
        f'Reminder: You have an appointment tomorrow with '
        f'Dr. {doctor.first_name} {doctor.last_name} at '
        f'{appointment.appointment_time.strftime("%I:%M %p")}.'
    )

    if user:
        create_notification(
            recipient=user,
            notification_type='APPOINTMENT_REMINDER',
            title=title,
            message=message,
            priority='HIGH',
            link=f'/appointments/{appointment.id}',
        )

    html = _build_email_html(
        title='Appointment Reminder',
        greeting=f'Dear {patient.first_name},',
        body_lines=[
            message,
            f'<strong>Doctor:</strong> Dr. {doctor.first_name} {doctor.last_name}',
            f'<strong>Date:</strong> {appointment.appointment_date.strftime("%B %d, %Y")}',
            f'<strong>Time:</strong> {appointment.appointment_time.strftime("%I:%M %p")}',
            'Please remember to bring any relevant medical records or reports.',
        ],
    )
    _send_email_safe(f'Appointment Reminder - Tomorrow at {appointment.appointment_time.strftime("%I:%M %p")}', html, patient.email)


def notify_vitals_recorded(appointment):
    """When staff records vitals - notify doctor."""
    patient = appointment.patient
    doctor = appointment.doctor
    user = _get_doctor_user(doctor)

    title = 'Vitals Recorded'
    message = (
        f'Vitals have been recorded for patient {patient.first_name} {patient.last_name}. '
        f'Appointment on {appointment.appointment_date.strftime("%B %d, %Y")} at '
        f'{appointment.appointment_time.strftime("%I:%M %p")}.'
    )

    if user:
        create_notification(
            recipient=user,
            notification_type='GENERAL',
            title=title,
            message=message,
            priority='MEDIUM',
            link=f'/appointments/{appointment.id}',
        )

    html = _build_email_html(
        title='Patient Vitals Recorded',
        greeting=f'Dear Dr. {doctor.first_name} {doctor.last_name},',
        body_lines=[
            message,
            f'<strong>Patient:</strong> {patient.first_name} {patient.last_name}',
            f'<strong>Date:</strong> {appointment.appointment_date.strftime("%B %d, %Y")}',
            f'<strong>Time:</strong> {appointment.appointment_time.strftime("%I:%M %p")}',
            'The patient is being prepared for consultation.',
        ],
    )
    _send_email_safe(f'Vitals Recorded - {patient.first_name} {patient.last_name}', html, doctor.email)


def notify_consultation_completed(appointment):
    """When doctor completes consultation - notify patient."""
    patient = appointment.patient
    doctor = appointment.doctor
    user = _get_patient_user(patient)

    title = 'Consultation Completed'
    message = (
        f'Your consultation with Dr. {doctor.first_name} {doctor.last_name} '
        f'has been completed. Please check your prescription and follow-up details.'
    )

    if user:
        create_notification(
            recipient=user,
            notification_type='GENERAL',
            title=title,
            message=message,
            priority='MEDIUM',
            link=f'/appointments/{appointment.id}',
        )

    html = _build_email_html(
        title='Consultation Completed',
        greeting=f'Dear {patient.first_name},',
        body_lines=[
            message,
            f'<strong>Doctor:</strong> Dr. {doctor.first_name} {doctor.last_name}',
            f'<strong>Date:</strong> {appointment.appointment_date.strftime("%B %d, %Y")}',
            'You can view your prescription and any follow-up instructions in your patient portal.',
        ],
    )
    _send_email_safe(f'Consultation Completed - Dr. {doctor.last_name}', html, patient.email)


def notify_prescription_ready(prescription):
    """When prescription is created - notify patient."""
    patient = prescription.patient
    doctor = prescription.doctor
    user = _get_patient_user(patient)

    title = 'Prescription Ready'
    message = (
        f'A new prescription has been issued by Dr. {doctor.first_name} {doctor.last_name}. '
        f'Diagnosis: {prescription.diagnosis[:100]}.'
    )

    follow_up_line = ''
    if prescription.follow_up_date:
        follow_up_line = (
            f'<strong>Follow-up Date:</strong> '
            f'{prescription.follow_up_date.strftime("%B %d, %Y")}'
        )

    if user:
        create_notification(
            recipient=user,
            notification_type='PRESCRIPTION_READY',
            title=title,
            message=message,
            priority='HIGH',
            link=f'/prescriptions/{prescription.id}',
        )

    body_lines = [
        message,
        f'<strong>Doctor:</strong> Dr. {doctor.first_name} {doctor.last_name}',
        f'<strong>Date:</strong> {prescription.created_at.strftime("%B %d, %Y")}',
    ]
    if follow_up_line:
        body_lines.append(follow_up_line)
    body_lines.append('Please visit the pharmacy to collect your medications.')

    html = _build_email_html(
        title='Your Prescription is Ready',
        greeting=f'Dear {patient.first_name},',
        body_lines=body_lines,
    )
    _send_email_safe(f'Prescription Ready - Dr. {doctor.last_name}', html, patient.email)


def notify_lab_result_ready(lab_order):
    """When lab results are uploaded - notify patient."""
    patient = lab_order.patient
    doctor = lab_order.doctor
    user = _get_patient_user(patient)

    title = 'Lab Results Ready'
    message = (
        f'Your lab results for order {lab_order.order_number} are now available. '
        f'Ordered by Dr. {doctor.first_name} {doctor.last_name}.'
    )

    if user:
        create_notification(
            recipient=user,
            notification_type='LAB_RESULT_READY',
            title=title,
            message=message,
            priority='HIGH',
            link=f'/lab-results/{lab_order.id}',
        )

    html = _build_email_html(
        title='Lab Results Available',
        greeting=f'Dear {patient.first_name},',
        body_lines=[
            message,
            f'<strong>Order Number:</strong> {lab_order.order_number}',
            f'<strong>Doctor:</strong> Dr. {doctor.first_name} {doctor.last_name}',
            'Please log in to your patient portal to view the full results, '
            'or consult with your doctor for further guidance.',
        ],
    )
    _send_email_safe(f'Lab Results Ready - {lab_order.order_number}', html, patient.email)


def notify_payment_received(payment):
    """When payment is received - notify patient."""
    invoice = payment.invoice
    patient = invoice.patient
    user = _get_patient_user(patient)

    title = 'Payment Received'
    message = (
        f'Your payment of Rs. {payment.amount} for invoice {invoice.invoice_number} '
        f'has been received via {payment.get_payment_method_display()}. '
        f'Balance due: Rs. {invoice.balance_due}.'
    )

    if user:
        create_notification(
            recipient=user,
            notification_type='PAYMENT_RECEIVED',
            title=title,
            message=message,
            priority='MEDIUM',
            link=f'/billing/invoices/{invoice.id}',
        )

    html = _build_email_html(
        title='Payment Confirmation',
        greeting=f'Dear {patient.first_name},',
        body_lines=[
            message,
            f'<strong>Invoice:</strong> {invoice.invoice_number}',
            f'<strong>Amount Paid:</strong> Rs. {payment.amount}',
            f'<strong>Payment Method:</strong> {payment.get_payment_method_display()}',
            f'<strong>Total Invoice Amount:</strong> Rs. {invoice.total_amount}',
            f'<strong>Balance Due:</strong> Rs. {invoice.balance_due}',
        ],
    )
    _send_email_safe(f'Payment Received - {invoice.invoice_number}', html, patient.email)


def notify_low_stock_alert(medicine):
    """When medicine goes below reorder level - notify admin/staff."""
    from users.models import User

    title = 'Low Stock Alert'
    message = (
        f'Medicine "{medicine.name} ({medicine.strength})" is running low. '
        f'Current stock: {medicine.stock_quantity}, '
        f'Reorder level: {medicine.reorder_level}.'
    )

    # Notify all admin and staff users
    admin_staff_users = User.objects.filter(role__in=['admin', 'staff'], is_active=True)

    for user in admin_staff_users:
        create_notification(
            recipient=user,
            notification_type='SYSTEM',
            title=title,
            message=message,
            priority='URGENT',
            link='/pharmacy/inventory',
        )

    # Send email to all admin/staff
    html = _build_email_html(
        title='Low Stock Alert',
        greeting='Dear Admin/Staff,',
        body_lines=[
            message,
            f'<strong>Medicine:</strong> {medicine.name}',
            f'<strong>Strength:</strong> {medicine.strength}',
            f'<strong>Form:</strong> {medicine.get_form_display()}',
            f'<strong>Current Stock:</strong> {medicine.stock_quantity}',
            f'<strong>Reorder Level:</strong> {medicine.reorder_level}',
            'Please arrange to restock this medicine as soon as possible.',
        ],
        footer='This is an automated inventory alert from the Healthcare Management System.',
    )

    for user in admin_staff_users:
        _send_email_safe(f'Low Stock Alert - {medicine.name}', html, user.email)
