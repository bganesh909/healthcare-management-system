from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(
        source='get_notification_type_display', read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display', read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'notification_type', 'notification_type_display',
            'title', 'message', 'is_read', 'priority', 'priority_display',
            'link', 'created_at', 'read_at',
        ]
        read_only_fields = [
            'id', 'recipient', 'notification_type', 'title', 'message',
            'priority', 'link', 'created_at', 'read_at',
        ]


class NotificationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'notification_type', 'is_read', 'priority', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user', 'email_notifications', 'appointment_reminders',
            'prescription_alerts', 'lab_result_alerts', 'payment_alerts',
            'system_notifications',
        ]
        read_only_fields = ['id', 'user']
