from django.contrib import admin
from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'notification_type', 'priority', 'is_read', 'created_at')
    list_filter = ('notification_type', 'priority', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'recipient__email')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'read_at')
    fieldsets = (
        ('Notification Details', {
            'fields': ('recipient', 'notification_type', 'title', 'message'),
        }),
        ('Status', {
            'fields': ('is_read', 'priority', 'link', 'created_at', 'read_at'),
        }),
    )


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'email_notifications', 'appointment_reminders',
        'prescription_alerts', 'lab_result_alerts', 'payment_alerts',
        'system_notifications',
    )
    list_filter = (
        'email_notifications', 'appointment_reminders',
        'prescription_alerts', 'lab_result_alerts',
        'payment_alerts', 'system_notifications',
    )
    search_fields = ('user__email',)
