from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'),
        ('DELETE', 'Deleted'),
        ('VIEW', 'Viewed'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('LOGIN_FAILED', 'Login Failed'),
        ('PASSWORD_CHANGE', 'Password Changed'),
        ('EXPORT', 'Data Exported'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=50, blank=True)
    object_repr = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(null=True, blank=True, help_text="Field changes: {field: [old, new]}")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    path = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', 'action']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {user_str} {self.action} {self.model_name} #{self.object_id}"

    @classmethod
    def log(cls, user=None, action='UPDATE', model_name='', object_id='',
            object_repr='', changes=None, request=None):
        ip = ''
        ua = ''
        path = ''
        method = ''
        if request:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
            if ip and ',' in ip:
                ip = ip.split(',')[0].strip()
            ua = request.META.get('HTTP_USER_AGENT', '')[:500]
            path = request.path[:500]
            method = request.method

        return cls.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            object_repr=str(object_repr)[:255],
            changes=changes,
            ip_address=ip or None,
            user_agent=ua,
            path=path,
            method=method,
        )
