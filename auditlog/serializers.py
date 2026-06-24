from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default='System')
    user_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_email', 'user_name', 'action', 'action_display',
                  'model_name', 'object_id', 'object_repr', 'changes',
                  'ip_address', 'path', 'method', 'timestamp']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.email
        return 'System'
