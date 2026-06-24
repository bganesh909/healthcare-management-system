import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from appointments.models import Appointment
from notifications.triggers import notify_appointment_reminder

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Send reminder notifications to patients who have appointments tomorrow. '
        'Intended to be run daily via cron, e.g.: '
        'python manage.py send_appointment_reminders'
    )

    def handle(self, *args, **options):
        tomorrow = timezone.now().date() + timedelta(days=1)

        appointments = Appointment.objects.filter(
            appointment_date=tomorrow,
            status='SCHEDULED',
        ).select_related('patient', 'doctor')

        total = appointments.count()
        self.stdout.write(
            f"Found {total} appointment(s) scheduled for {tomorrow}."
        )

        success_count = 0
        error_count = 0

        for appointment in appointments:
            try:
                notify_appointment_reminder(appointment)
                success_count += 1
                self.stdout.write(
                    f"  Reminder sent to {appointment.patient.first_name} "
                    f"{appointment.patient.last_name} for appointment with "
                    f"Dr. {appointment.doctor.last_name} at "
                    f"{appointment.appointment_time.strftime('%I:%M %p')}."
                )
            except Exception as exc:
                error_count += 1
                logger.exception(
                    "Failed to send reminder for appointment %s", appointment.id
                )
                self.stderr.write(
                    self.style.ERROR(
                        f"  ERROR sending reminder for appointment {appointment.id}: {exc}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Sent {success_count} reminder(s), {error_count} error(s)."
            )
        )
