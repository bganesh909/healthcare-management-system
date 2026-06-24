from django.shortcuts import render
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count, Avg
from datetime import date
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from analytics.pdf_reports import (
    build_pdf, _info_table, Paragraph, Spacer,
)
from users.permissions import IsClinicalStaff
from .models import DischargeSummary, FollowUp, Readmission
from .serializers import (
    DischargeSummarySerializer, DischargeSummaryListSerializer,
    FollowUpSerializer, FollowUpListSerializer,
    ReadmissionSerializer, ReadmissionListSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class DischargeSummaryViewSet(viewsets.ModelViewSet):
    queryset = DischargeSummary.objects.all()
    serializer_class = DischargeSummarySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'discharge_type', 'status']
    search_fields = ['summary_number', 'patient__first_name', 'patient__last_name',
                     'admission_diagnosis', 'discharge_diagnosis']
    ordering_fields = ['admission_date', 'discharge_date', 'created_at']
    ordering = ['-created_at']
    permission_classes = [IsClinicalStaff]

    def get_serializer_class(self):
        if self.action in ['list', 'by_patient']:
            return DischargeSummaryListSerializer
        return DischargeSummarySerializer

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        summaries = DischargeSummary.objects.filter(patient_id=patient_id)
        serializer = self.get_serializer(summaries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        summary = self.get_object()
        if summary.status == 'APPROVED':
            return Response(
                {'error': 'This discharge summary is already approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        approved_by = request.data.get('approved_by', '')
        if not approved_by:
            return Response(
                {'error': 'approved_by field is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        summary.status = 'APPROVED'
        summary.approved_by = approved_by
        summary.save()
        serializer = DischargeSummarySerializer(summary)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        summary = self.get_object()

        def build_elements(styles):
            elems = []
            elems.append(Paragraph("DISCHARGE SUMMARY", styles["heading"]))
            elems.append(Spacer(1, 6))

            # Summary info
            info_data = [
                ["Summary #:", summary.summary_number],
                ["Status:", summary.get_status_display()],
                ["Discharge Type:", summary.get_discharge_type_display()],
                ["Admission Date:", str(summary.admission_date)],
                ["Discharge Date:", str(summary.discharge_date)],
            ]
            if summary.approved_by:
                info_data.append(["Approved By:", summary.approved_by])
            elems.append(_info_table(info_data))
            elems.append(Spacer(1, 10))

            # Patient info
            patient = summary.patient
            elems.append(Paragraph("Patient Information", styles["heading"]))
            patient_data = [
                ["Name:", f"{patient.first_name} {patient.last_name}"],
                ["Date of Birth:", str(patient.date_of_birth)],
                ["Gender:", patient.get_gender_display()],
                ["Phone:", patient.phone_number],
            ]
            if patient.blood_group:
                patient_data.append(["Blood Group:", patient.blood_group])
            elems.append(_info_table(patient_data))
            elems.append(Spacer(1, 10))

            # Doctor info
            doctor = summary.doctor
            elems.append(Paragraph("Attending Doctor", styles["heading"]))
            doc_data = [
                ["Doctor:", f"Dr. {doctor.first_name} {doctor.last_name}"],
                ["Specialization:", doctor.get_specialization_display()],
            ]
            elems.append(_info_table(doc_data))
            elems.append(Spacer(1, 10))

            # Clinical sections
            sections = [
                ("Admission Diagnosis", summary.admission_diagnosis),
                ("Discharge Diagnosis", summary.discharge_diagnosis),
                ("Treatment Given", summary.treatment_given),
                ("Condition at Discharge", summary.condition_at_discharge),
            ]
            optional_sections = [
                ("Procedures Performed", summary.procedures_performed),
                ("Medications on Discharge", summary.medications_on_discharge),
                ("Dietary Instructions", summary.dietary_instructions),
                ("Activity Restrictions", summary.activity_restrictions),
                ("Follow-up Instructions", summary.follow_up_instructions),
                ("Emergency Instructions", summary.emergency_instructions),
            ]

            for title, content in sections:
                elems.append(Paragraph(title, styles["heading"]))
                elems.append(Paragraph(content, styles["normal"]))

            for title, content in optional_sections:
                if content:
                    elems.append(Paragraph(title, styles["heading"]))
                    elems.append(Paragraph(content, styles["normal"]))

            if summary.follow_up_date:
                elems.append(Spacer(1, 6))
                elems.append(Paragraph("Follow-up Date", styles["heading"]))
                elems.append(Paragraph(str(summary.follow_up_date), styles["normal"]))

            return elems

        pdf_bytes = build_pdf(build_elements)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="discharge_summary_{summary.summary_number}.pdf"'
        )
        return response


class FollowUpViewSet(viewsets.ModelViewSet):
    queryset = FollowUp.objects.all()
    serializer_class = FollowUpSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'follow_up_type', 'status']
    search_fields = ['patient__first_name', 'patient__last_name', 'reason']
    ordering_fields = ['scheduled_date', 'created_at']
    ordering = ['-scheduled_date']
    permission_classes = [IsClinicalStaff]

    def get_serializer_class(self):
        if self.action in ['list', 'upcoming', 'overdue', 'by_patient']:
            return FollowUpListSerializer
        return FollowUpSerializer

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        today = date.today()
        upcoming = self.get_queryset().filter(
            scheduled_date__gte=today,
            status='SCHEDULED'
        ).order_by('scheduled_date')
        page = self.paginate_queryset(upcoming)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        today = date.today()
        overdue = self.get_queryset().filter(
            scheduled_date__lt=today,
            status='SCHEDULED'
        ).order_by('scheduled_date')
        page = self.paginate_queryset(overdue)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(overdue, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        follow_ups = FollowUp.objects.filter(patient_id=patient_id)
        serializer = self.get_serializer(follow_ups, many=True)
        return Response(serializer.data)


class ReadmissionViewSet(viewsets.ModelViewSet):
    queryset = Readmission.objects.all()
    serializer_class = ReadmissionSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'is_related_to_original']
    search_fields = ['patient__first_name', 'patient__last_name', 'reason']
    ordering_fields = ['readmission_date', 'days_since_discharge', 'created_at']
    ordering = ['-readmission_date']
    permission_classes = [IsClinicalStaff]

    def get_serializer_class(self):
        if self.action in ['list', 'by_patient']:
            return ReadmissionListSerializer
        return ReadmissionSerializer

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id', None)
        if not patient_id:
            return Response(
                {"error": "patient_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        readmissions = Readmission.objects.filter(patient_id=patient_id)
        serializer = self.get_serializer(readmissions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        total = Readmission.objects.count()
        related = Readmission.objects.filter(is_related_to_original=True).count()
        avg_days = Readmission.objects.aggregate(avg_days=Avg('days_since_discharge'))['avg_days']
        within_30_days = Readmission.objects.filter(days_since_discharge__lte=30).count()
        return Response({
            'total_readmissions': total,
            'related_to_original': related,
            'unrelated': total - related,
            'average_days_since_discharge': round(avg_days, 1) if avg_days else 0,
            'within_30_days': within_30_days,
        })
