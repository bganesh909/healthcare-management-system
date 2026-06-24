from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsClinicalStaff
from .models import OperationTheater, Surgery, SurgicalTeam, PreOpChecklist, PostOpNote
from .serializers import (
    OperationTheaterSerializer,
    SurgerySerializer, SurgeryListSerializer,
    SurgicalTeamSerializer,
    PreOpChecklistSerializer,
    PostOpNoteSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class OperationTheaterViewSet(viewsets.ModelViewSet):
    queryset = OperationTheater.objects.all()
    serializer_class = OperationTheaterSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['theater_type', 'status', 'is_active', 'floor']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']
    ordering = ['code']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def available(self, request):
        theaters = OperationTheater.objects.filter(status='AVAILABLE', is_active=True)
        serializer = OperationTheaterSerializer(theaters, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        theater = self.get_object()
        surgeries = theater.surgeries.filter(
            status__in=['SCHEDULED', 'IN_PROGRESS']
        ).order_by('scheduled_date')
        serializer = SurgeryListSerializer(surgeries, many=True)
        return Response(serializer.data)


class SurgeryViewSet(viewsets.ModelViewSet):
    queryset = Surgery.objects.all()
    serializer_class = SurgerySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'surgery_type', 'anesthesia_type', 'patient', 'primary_surgeon', 'operation_theater']
    search_fields = ['surgery_number', 'procedure_name', 'diagnosis']
    ordering_fields = ['scheduled_date', 'created_at', 'surgery_number']
    ordering = ['-scheduled_date']
    permission_classes = [IsClinicalStaff]

    def get_serializer_class(self):
        if self.action == 'list':
            return SurgeryListSerializer
        return SurgerySerializer

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        surgeries = Surgery.objects.filter(patient_id=patient_id)
        serializer = SurgeryListSerializer(surgeries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_surgeon(self, request):
        surgeon_id = request.query_params.get('surgeon_id', None)
        if not surgeon_id:
            return Response(
                {"error": "surgeon_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        surgeries = Surgery.objects.filter(primary_surgeon_id=surgeon_id)
        serializer = SurgeryListSerializer(surgeries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.now().date()
        surgeries = Surgery.objects.filter(scheduled_date__date=today)
        serializer = SurgeryListSerializer(surgeries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        now = timezone.now()
        surgeries = Surgery.objects.filter(
            scheduled_date__gte=now,
            status='SCHEDULED',
        ).order_by('scheduled_date')
        serializer = SurgeryListSerializer(surgeries, many=True)
        return Response(serializer.data)


class SurgicalTeamViewSet(viewsets.ModelViewSet):
    queryset = SurgicalTeam.objects.all()
    serializer_class = SurgicalTeamSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['surgery', 'role']
    search_fields = ['member_name']
    ordering_fields = ['role']
    ordering = ['surgery', 'role']
    permission_classes = [IsClinicalStaff]


class PreOpChecklistViewSet(viewsets.ModelViewSet):
    queryset = PreOpChecklist.objects.all()
    serializer_class = PreOpChecklistSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['surgery']
    permission_classes = [IsClinicalStaff]


class PostOpNoteViewSet(viewsets.ModelViewSet):
    queryset = PostOpNote.objects.all()
    serializer_class = PostOpNoteSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['surgery', 'recovery_status', 'consciousness_level']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]
