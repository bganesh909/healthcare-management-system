from django.shortcuts import render
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Appointment
from .serializers import AppointmentSerializer, AppointmentListSerializer
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'appointment_date', 'status']
    search_fields = ['patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name', 'reason']
    ordering_fields = ['appointment_date', 'appointment_time', 'created_at']
    ordering = ['appointment_date', 'appointment_time']
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'upcoming']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'upcoming':
            return AppointmentListSerializer
        return AppointmentSerializer
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        from datetime import date
        today = date.today()
        upcoming = self.get_queryset().filter(
            appointment_date__gte=today,
            status='SCHEDULED'
        ).order_by('appointment_date', 'appointment_time')
        page = self.paginate_queryset(upcoming)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)

