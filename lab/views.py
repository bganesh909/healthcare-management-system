from django.http import HttpResponse as DjangoHttpResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from analytics.pdf_reports import (
    build_pdf, _info_table, _items_table, Paragraph, Spacer,
)
from users.permissions import IsAdminOrDoctor, IsClinicalStaff

from .models import (
    LabTestCategory,
    LabTest,
    LabOrder,
    LabOrderItem,
    LabReport,
)
from .serializers import (
    LabTestCategorySerializer,
    LabTestSerializer,
    LabTestListSerializer,
    LabOrderSerializer,
    LabOrderCreateSerializer,
    LabOrderDetailSerializer,
    LabOrderItemSerializer,
    LabReportSerializer,
)


class LabTestCategoryViewSet(viewsets.ModelViewSet):
    queryset = LabTestCategory.objects.all()
    serializer_class = LabTestCategorySerializer
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminOrDoctor()]


class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.select_related('category').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'requires_fasting', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'price']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminOrDoctor()]

    def get_serializer_class(self):
        if self.action == 'list':
            return LabTestListSerializer
        return LabTestSerializer


class LabOrderViewSet(viewsets.ModelViewSet):
    queryset = LabOrder.objects.select_related(
        'patient', 'doctor', 'appointment'
    ).prefetch_related('items__test').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'status', 'priority']
    search_fields = ['order_number', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['created_at', 'total_amount']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'download_pdf', 'by_patient', 'by_doctor']:
            return [IsAuthenticated()]
        elif self.action in ['create']:
            return [IsAdminOrDoctor()]
        elif self.action in ['update_status', 'add_results']:
            return [IsClinicalStaff()]
        return [IsAdminOrDoctor()]

    def get_serializer_class(self):
        if self.action == 'create':
            return LabOrderCreateSerializer
        if self.action == 'retrieve':
            return LabOrderDetailSerializer
        return LabOrderSerializer

    @action(detail=False, methods=['get'], url_path='by-patient')
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orders = self.get_queryset().filter(patient_id=patient_id)
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = LabOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = LabOrderSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-doctor')
    def by_doctor(self, request):
        doctor_id = request.query_params.get('doctor_id')
        if not doctor_id:
            return Response(
                {'error': 'doctor_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orders = self.get_queryset().filter(doctor_id=doctor_id)
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = LabOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = LabOrderSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')

        valid_statuses = [choice[0] for choice in LabOrder.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])

        serializer = LabOrderDetailSerializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-results')
    def add_results(self, request, pk=None):
        order = self.get_object()
        results = request.data.get('results', [])

        if not results:
            return Response(
                {'error': 'results list is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated_items = []
        for result_data in results:
            item_id = result_data.get('item_id')
            try:
                item = order.items.get(id=item_id)
            except LabOrderItem.DoesNotExist:
                return Response(
                    {'error': f'Order item with id {item_id} not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            item.result_value = result_data.get('result_value', item.result_value)
            item.result_unit = result_data.get('result_unit', item.result_unit)
            item.is_abnormal = result_data.get('is_abnormal', item.is_abnormal)
            item.remarks = result_data.get('remarks', item.remarks)
            item.status = result_data.get('status', 'COMPLETED')
            item.completed_at = timezone.now()
            item.save()
            updated_items.append(item)

        # Auto-update order status if all items are completed
        all_completed = not order.items.exclude(status='COMPLETED').exists()
        if all_completed:
            order.status = 'COMPLETED'
            order.save(update_fields=['status', 'updated_at'])

        serializer = LabOrderDetailSerializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        order = self.get_object()

        def build_elements(styles):
            elems = []
            elems.append(Paragraph("LAB REPORT", styles["heading"]))
            elems.append(Spacer(1, 6))

            # Order info
            info_data = [
                ["Order #:", order.order_number],
                ["Status:", order.get_status_display()],
                ["Priority:", order.get_priority_display()],
                ["Order Date:", order.created_at.strftime('%Y-%m-%d %H:%M')],
            ]
            elems.append(_info_table(info_data))
            elems.append(Spacer(1, 10))

            # Patient info
            patient = order.patient
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
            doctor = order.doctor
            elems.append(Paragraph("Ordering Physician", styles["heading"]))
            doc_data = [
                ["Doctor:", f"Dr. {doctor.first_name} {doctor.last_name}"],
                ["Specialization:", doctor.get_specialization_display()],
            ]
            elems.append(_info_table(doc_data))
            elems.append(Spacer(1, 10))

            if order.clinical_notes:
                elems.append(Paragraph("Clinical Notes", styles["heading"]))
                elems.append(Paragraph(order.clinical_notes, styles["normal"]))
                elems.append(Spacer(1, 10))

            # Test results table
            elems.append(Paragraph("Test Results", styles["heading"]))
            headers = ["#", "Test Name", "Result", "Unit", "Normal Range", "Status"]
            rows = []
            for idx, item in enumerate(order.items.select_related('test').all(), 1):
                test = item.test
                result_display = item.result_value or "Pending"
                unit_display = item.result_unit or test.unit or "-"
                normal_range = test.normal_range or "-"
                flag = "ABNORMAL" if item.is_abnormal else ("Normal" if item.result_value else "Pending")
                rows.append([
                    str(idx),
                    test.name,
                    result_display,
                    unit_display,
                    normal_range,
                    flag,
                ])
            col_widths = [25, 140, 80, 55, 95, 70]
            elems.append(_items_table(headers, rows, col_widths=col_widths))
            elems.append(Spacer(1, 10))

            # Remarks for abnormal results
            abnormal_items = [
                item for item in order.items.select_related('test').all()
                if item.is_abnormal and item.remarks
            ]
            if abnormal_items:
                elems.append(Paragraph("Remarks", styles["heading"]))
                for item in abnormal_items:
                    elems.append(Paragraph(
                        f"<b>{item.test.name}:</b> {item.remarks}",
                        styles["normal"],
                    ))

            # Total
            elems.append(Spacer(1, 10))
            total_data = [
                ["Total Amount:", f"Rs. {order.total_amount:,.2f}"],
            ]
            elems.append(_info_table(total_data))

            return elems

        pdf_bytes = build_pdf(build_elements)
        response = DjangoHttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="lab_report_{order.order_number}.pdf"'
        )
        return response


class LabReportViewSet(viewsets.ModelViewSet):
    queryset = LabReport.objects.select_related('lab_order').all()
    serializer_class = LabReportSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lab_order']
    permission_classes = [IsClinicalStaff]
