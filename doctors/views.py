from django.shortcuts import render
from django.db.models import Avg
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrStaff
from .models import Doctor, DoctorReview
from .serializers import (
    DoctorSerializer, DoctorListSerializer,
    DoctorReviewSerializer, DoctorReviewCreateSerializer,
)


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
        if self.action in ['list', 'retrieve', 'by_specialization']:
            permission_classes = [AllowAny]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminOrStaff]
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


class DoctorReviewViewSet(viewsets.ModelViewSet):
    queryset = DoctorReview.objects.all()
    serializer_class = DoctorReviewSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['doctor', 'patient', 'rating']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'by_doctor']:
            permission_classes = [AllowAny]
        else:
            # create, update, delete reviews require authentication
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DoctorReviewCreateSerializer
        return DoctorReviewSerializer

    @action(detail=False, methods=['get'])
    def by_doctor(self, request):
        doctor_id = request.query_params.get('doctor_id', None)
        if not doctor_id:
            return Response(
                {"error": "doctor_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        reviews = DoctorReview.objects.filter(doctor_id=doctor_id)
        avg_rating = reviews.aggregate(avg=Avg('rating'))['avg']
        serializer = DoctorReviewSerializer(reviews, many=True)
        return Response({
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
            "review_count": reviews.count(),
            "reviews": serializer.data,
        })
