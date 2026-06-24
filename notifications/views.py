from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer,
    NotificationListSerializer,
    NotificationPreferenceSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for listing and retrieving notifications for the current user."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def get_serializer_class(self):
        if self.action in ['list', 'unread']:
            return NotificationListSerializer
        return NotificationSerializer

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """List all unread notifications for the current user."""
        unread_notifications = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(unread_notifications)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Return the count of unread notifications for the current user."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        serializer = NotificationSerializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user."""
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return Response({'status': 'success', 'updated_count': updated})


class NotificationPreferenceViewSet(viewsets.GenericViewSet):
    """ViewSet for retrieving and updating notification preferences."""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = NotificationPreference.objects.get_or_create(user=self.request.user)
        return obj

    def list(self, request):
        """Get the current user's notification preferences."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        """Update the current user's notification preferences."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


def create_notification(recipient, notification_type, title, message, priority='MEDIUM', link=None):
    """
    Utility function to create a notification.

    Args:
        recipient: User instance who will receive the notification.
        notification_type: One of Notification.NOTIFICATION_TYPE_CHOICES values.
        title: Short title for the notification.
        message: Full notification message text.
        priority: One of 'LOW', 'MEDIUM', 'HIGH', 'URGENT'. Defaults to 'MEDIUM'.
        link: Optional frontend URL the notification should link to.

    Returns:
        The created Notification instance.
    """
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        priority=priority,
        link=link,
    )
