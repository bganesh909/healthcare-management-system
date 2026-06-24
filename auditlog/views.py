from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from django.db.models.functions import TruncDate
from users.permissions import IsAdminOrStaff
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for audit logs — admin/staff only"""
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'model_name']
    search_fields = ['object_repr', 'model_name', 'user__email']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        qs = super().get_queryset()
        # Date range filters
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if start:
            qs = qs.filter(timestamp__date__gte=start)
        if end:
            qs = qs.filter(timestamp__date__lte=end)
        return qs

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Summary of audit activity"""
        qs = self.get_queryset()
        return Response({
            'total_entries': qs.count(),
            'by_action': list(qs.values('action').annotate(count=Count('id')).order_by('-count')),
            'by_model': list(qs.values('model_name').annotate(count=Count('id')).order_by('-count')[:15]),
            'by_user': list(qs.values('user__email').annotate(count=Count('id')).order_by('-count')[:10]),
            'daily_activity': list(
                qs.annotate(day=TruncDate('timestamp'))
                .values('day').annotate(count=Count('id'))
                .order_by('-day')[:30]
            ),
        })

    @action(detail=False, methods=['get'])
    def by_object(self, request):
        """Get audit trail for a specific object"""
        model = request.query_params.get('model')
        obj_id = request.query_params.get('id')
        if not model or not obj_id:
            return Response({'error': 'model and id parameters required.'}, status=400)
        logs = AuditLog.objects.filter(model_name=model, object_id=str(obj_id)).order_by('-timestamp')
        return Response(AuditLogSerializer(logs, many=True).data)
