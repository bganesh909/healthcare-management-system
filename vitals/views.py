from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsClinicalStaff
from .models import VitalSign, ClinicalNote, TreatmentPlan, Allergy
from .serializers import (
    VitalSignSerializer, ClinicalNoteSerializer,
    TreatmentPlanSerializer, AllergySerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class VitalSignViewSet(viewsets.ModelViewSet):
    queryset = VitalSign.objects.all()
    serializer_class = VitalSignSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'recorded_by', 'appointment']
    search_fields = ['patient__first_name', 'patient__last_name', 'notes']
    ordering_fields = ['recorded_at', 'temperature', 'pulse_rate', 'blood_pressure_systolic']
    ordering = ['-recorded_at']

    def get_permissions(self):
        if self.action in ['latest_by_patient', 'history']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsClinicalStaff]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def latest_by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        vital = VitalSign.objects.filter(patient_id=patient_id).order_by('-recorded_at').first()
        if vital:
            serializer = self.get_serializer(vital)
            return Response(serializer.data)
        return Response(
            {"error": "No vitals found for this patient"},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=False, methods=['get'])
    def history(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        queryset = VitalSign.objects.filter(patient_id=patient_id)

        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        if date_from:
            queryset = queryset.filter(recorded_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(recorded_at__date__lte=date_to)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.all()
    serializer_class = ClinicalNoteSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'appointment', 'note_type', 'is_confidential']
    search_fields = ['patient__first_name', 'patient__last_name', 'subjective', 'objective', 'assessment', 'plan', 'content']
    ordering_fields = ['created_at', 'updated_at', 'note_type']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        notes = ClinicalNote.objects.filter(patient_id=patient_id)
        page = self.paginate_queryset(notes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_doctor(self, request):
        doctor_id = request.query_params.get('doctor_id', None)
        if not doctor_id:
            return Response(
                {"error": "doctor_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        notes = ClinicalNote.objects.filter(doctor_id=doctor_id)
        page = self.paginate_queryset(notes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)


class TreatmentPlanViewSet(viewsets.ModelViewSet):
    queryset = TreatmentPlan.objects.all()
    serializer_class = TreatmentPlanSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'status']
    search_fields = ['title', 'diagnosis', 'goals', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'status']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        plans = TreatmentPlan.objects.filter(patient_id=patient_id)
        page = self.paginate_queryset(plans)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(plans, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active_plans(self, request):
        patient_id = request.query_params.get('patient_id', None)
        queryset = TreatmentPlan.objects.filter(status='ACTIVE')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class AllergyViewSet(viewsets.ModelViewSet):
    queryset = Allergy.objects.all()
    serializer_class = AllergySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'allergy_type', 'severity', 'is_active']
    search_fields = ['allergen', 'reaction', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['created_at', 'severity', 'allergen']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        allergies = Allergy.objects.filter(patient_id=patient_id)
        page = self.paginate_queryset(allergies)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(allergies, many=True)
        return Response(serializer.data)
