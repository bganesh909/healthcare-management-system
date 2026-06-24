from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsClinicalStaff
from .models import EmergencyVisit, Ambulance, AmbulanceDispatch, EmergencyContact
from .serializers import (
    EmergencyVisitSerializer,
    AmbulanceSerializer,
    AmbulanceDispatchSerializer,
    EmergencyContactSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmergencyVisitViewSet(viewsets.ModelViewSet):
    queryset = EmergencyVisit.objects.all()
    serializer_class = EmergencyVisitSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'triage_level', 'arrival_mode', 'is_critical', 'attending_doctor']
    search_fields = ['visit_number', 'chief_complaint', 'diagnosis', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['arrival_time', 'triage_level', 'status']
    ordering = ['-arrival_time']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def active_visits(self, request):
        active_statuses = ['WAITING', 'TRIAGED', 'IN_TREATMENT']
        visits = EmergencyVisit.objects.filter(status__in=active_statuses)
        serializer = self.get_serializer(visits, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_triage_level(self, request):
        level = request.query_params.get('level', None)
        if not level:
            return Response(
                {"error": "level parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        visits = EmergencyVisit.objects.filter(triage_level=level)
        serializer = self.get_serializer(visits, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def triage(self, request, pk=None):
        visit = self.get_object()
        triage_level = request.data.get('triage_level')
        if not triage_level:
            return Response(
                {"error": "triage_level is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        visit.triage_level = int(triage_level)
        visit.triage_time = timezone.now()
        visit.status = 'TRIAGED'
        if request.data.get('attending_doctor'):
            visit.attending_doctor_id = request.data['attending_doctor']
        if request.data.get('is_critical') is not None:
            visit.is_critical = request.data['is_critical']
        visit.save()
        serializer = self.get_serializer(visit)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def discharge(self, request, pk=None):
        visit = self.get_object()
        visit.discharge_time = timezone.now()
        visit.status = 'DISCHARGED'
        visit.disposition = request.data.get('disposition', 'DISCHARGED')
        if request.data.get('diagnosis'):
            visit.diagnosis = request.data['diagnosis']
        if request.data.get('treatment_notes'):
            visit.treatment_notes = request.data['treatment_notes']
        visit.save()
        serializer = self.get_serializer(visit)
        return Response(serializer.data)


class AmbulanceViewSet(viewsets.ModelViewSet):
    queryset = Ambulance.objects.all()
    serializer_class = AmbulanceSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ambulance_type', 'status', 'is_active']
    search_fields = ['vehicle_number', 'driver_name', 'paramedic_name']
    ordering_fields = ['vehicle_number', 'ambulance_type']
    ordering = ['vehicle_number']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def available(self, request):
        ambulances = Ambulance.objects.filter(status='AVAILABLE', is_active=True)
        serializer = self.get_serializer(ambulances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        ambulance = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {"error": "status is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valid_statuses = [s[0] for s in Ambulance.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status. Must be one of: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ambulance.status = new_status
        if request.data.get('current_location'):
            ambulance.current_location = request.data['current_location']
        if request.data.get('gps_latitude'):
            ambulance.gps_latitude = request.data['gps_latitude']
        if request.data.get('gps_longitude'):
            ambulance.gps_longitude = request.data['gps_longitude']
        ambulance.save()
        serializer = self.get_serializer(ambulance)
        return Response(serializer.data)


class AmbulanceDispatchViewSet(viewsets.ModelViewSet):
    queryset = AmbulanceDispatch.objects.all()
    serializer_class = AmbulanceDispatchSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ambulance', 'priority', 'status']
    search_fields = ['pickup_location', 'notes']
    ordering_fields = ['dispatch_time', 'priority']
    ordering = ['-dispatch_time']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def active_dispatches(self, request):
        active_statuses = ['DISPATCHED', 'AT_SCENE', 'EN_ROUTE_HOSPITAL']
        dispatches = AmbulanceDispatch.objects.filter(status__in=active_statuses)
        serializer = self.get_serializer(dispatches, many=True)
        return Response(serializer.data)


class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_available']
    search_fields = ['name', 'phone_number']
    ordering_fields = ['name', 'role']
    ordering = ['role', 'name']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def available_contacts(self, request):
        contacts = EmergencyContact.objects.filter(is_available=True)
        role = request.query_params.get('role', None)
        if role:
            contacts = contacts.filter(role=role)
        serializer = self.get_serializer(contacts, many=True)
        return Response(serializer.data)
