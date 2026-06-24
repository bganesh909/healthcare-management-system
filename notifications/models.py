from django.db import models
from django.conf import settings


class Notification(models.Model):
    NOTIFICATION_TYPE_CHOICES = (
        ('APPOINTMENT_REMINDER', 'Appointment Reminder'),
        ('APPOINTMENT_CONFIRMED', 'Appointment Confirmed'),
        ('APPOINTMENT_CANCELLED', 'Appointment Cancelled'),
        ('PRESCRIPTION_READY', 'Prescription Ready'),
        ('LAB_RESULT_READY', 'Lab Result Ready'),
        ('PAYMENT_DUE', 'Payment Due'),
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('GENERAL', 'General'),
        ('SYSTEM', 'System'),
    )

    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM',
    )
    link = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.recipient}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
    )
    email_notifications = models.BooleanField(default=True)
    appointment_reminders = models.BooleanField(default=True)
    prescription_alerts = models.BooleanField(default=True)
    lab_result_alerts = models.BooleanField(default=True)
    payment_alerts = models.BooleanField(default=True)
    system_notifications = models.BooleanField(default=True)

    def __str__(self):
        return f"Notification Preferences for {self.user}"
