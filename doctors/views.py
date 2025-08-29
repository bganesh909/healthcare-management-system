from django.shortcuts import render
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Doctor
from .serializers import DoctorSerializer, DoctorListSerializer
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['specialization', 'experience_years']
    search_fields = ['first_name', 'last_name', 'specialization', 'email']
    ordering_fields = ['last_name', 'first_name', 'experience_years', 'consultation_fee']
    ordering = ['last_name', 'first_name']
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'by_specialization']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    def get_serializer_class(self):
        if self.action == 'list':
            return DoctorListSerializer
        return DoctorSerializer
    @action(detail=False, methods=['get'])
    def by_specialization(self, request):
        specialization = request.query_params.get('specialization', None)
        if specialization:
            doctors = Doctor.objects.filter(specialization=specialization)
            serializer = DoctorListSerializer(doctors, many=True)
            return Response(serializer.data)
        return Response(
            {"error": "Specialization parameter is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )

