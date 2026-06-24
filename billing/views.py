from datetime import timedelta

from django.db import models
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from analytics.pdf_reports import (
    build_pdf, _info_table, _items_table, Paragraph, Spacer,
)
from appointments.models import Appointment
from users.permissions import IsAdminOrStaff
from .models import Invoice, InvoiceItem, Payment, InsuranceClaim
from .serializers import (
    InvoiceSerializer,
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    PaymentSerializer,
    InsuranceClaimSerializer,
    InsuranceClaimDetailSerializer,
)


class BillingPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('patient', 'appointment').prefetch_related('items', 'payments')
    pagination_class = BillingPagination

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return InvoiceDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def get_permissions(self):
        if self.action == 'download_pdf':
            return [IsAuthenticated()]
        if self.action in ('list', 'retrieve', 'create', 'update', 'partial_update',
                           'destroy', 'by_patient', 'mark_paid', 'generate_for_appointment'):
            return [IsAdminOrStaff()]
        return [IsAdminOrStaff()]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        patient = params.get('patient')
        if patient:
            queryset = queryset.filter(patient_id=patient)

        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(issue_date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(issue_date__lte=date_to)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search)
            )

        return queryset

    @action(detail=False, methods=['get'], url_path='by-patient')
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invoices = self.get_queryset().filter(patient_id=patient_id)
        page = self.paginate_queryset(invoices)
        if page is not None:
            serializer = InvoiceSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'PAID'
        invoice.paid_amount = invoice.total_amount
        invoice.save()
        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='generate-for-appointment')
    def generate_for_appointment(self, request):
        appointment_id = request.data.get('appointment_id')
        if not appointment_id:
            return Response(
                {'error': 'appointment_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = Appointment.objects.select_related(
                'patient', 'doctor'
            ).get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if hasattr(appointment, 'invoice'):
            return Response(
                {'error': 'Invoice already exists for this appointment.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        consultation_fee = appointment.doctor.consultation_fee
        due_date = timezone.now().date() + timedelta(days=30)

        invoice = Invoice.objects.create(
            patient=appointment.patient,
            appointment=appointment,
            due_date=due_date,
            subtotal=consultation_fee,
            total_amount=consultation_fee,
            status='PENDING',
        )

        InvoiceItem.objects.create(
            invoice=invoice,
            description=f"Consultation with Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}",
            item_type='CONSULTATION',
            quantity=1,
            unit_price=consultation_fee,
        )

        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        invoice = self.get_object()

        def build_elements(styles):
            elems = []
            elems.append(Paragraph("INVOICE", styles["heading"]))
            elems.append(Spacer(1, 6))

            # Invoice info
            info_data = [
                ["Invoice #:", invoice.invoice_number],
                ["Issue Date:", str(invoice.issue_date)],
                ["Due Date:", str(invoice.due_date)],
                ["Status:", invoice.get_status_display()],
            ]
            elems.append(_info_table(info_data))
            elems.append(Spacer(1, 12))

            # Patient info
            patient = invoice.patient
            elems.append(Paragraph("Patient Information", styles["heading"]))
            patient_data = [
                ["Name:", f"{patient.first_name} {patient.last_name}"],
                ["Phone:", patient.phone_number],
                ["Email:", patient.email],
                ["Address:", patient.address],
            ]
            elems.append(_info_table(patient_data))
            elems.append(Spacer(1, 12))

            # Line items
            elems.append(Paragraph("Items", styles["heading"]))
            headers = ["#", "Description", "Type", "Qty", "Unit Price", "Total"]
            rows = []
            for idx, item in enumerate(invoice.items.all(), 1):
                rows.append([
                    str(idx),
                    item.description,
                    item.get_item_type_display(),
                    str(item.quantity),
                    f"Rs. {item.unit_price:,.2f}",
                    f"Rs. {item.total_price:,.2f}",
                ])
            col_widths = [30, 180, 80, 40, 80, 80]
            elems.append(_items_table(headers, rows, col_widths=col_widths))
            elems.append(Spacer(1, 12))

            # GST Breakup
            has_gst = invoice.cgst_amount or invoice.sgst_amount or invoice.igst_amount
            if has_gst:
                elems.append(Paragraph("GST Details", styles["heading"]))
                gst_data = []
                if invoice.hsn_sac_code:
                    gst_data.append(["HSN/SAC Code:", invoice.hsn_sac_code])
                if invoice.is_igst:
                    gst_data.append([f"IGST ({invoice.gst_percentage}%):", f"Rs. {invoice.igst_amount:,.2f}"])
                else:
                    half_rate = invoice.gst_percentage / 2
                    gst_data.append([f"CGST ({half_rate}%):", f"Rs. {invoice.cgst_amount:,.2f}"])
                    gst_data.append([f"SGST ({half_rate}%):", f"Rs. {invoice.sgst_amount:,.2f}"])
                elems.append(_info_table(gst_data))
                elems.append(Spacer(1, 12))

            # Totals
            totals_data = [
                ["Subtotal:", f"Rs. {invoice.subtotal:,.2f}"],
            ]
            if has_gst:
                if invoice.is_igst:
                    totals_data.append(["IGST:", f"Rs. {invoice.igst_amount:,.2f}"])
                else:
                    totals_data.append(["CGST:", f"Rs. {invoice.cgst_amount:,.2f}"])
                    totals_data.append(["SGST:", f"Rs. {invoice.sgst_amount:,.2f}"])
            else:
                totals_data.append(["Tax:", f"Rs. {invoice.tax_amount:,.2f}"])
            totals_data.extend([
                ["Discount:", f"Rs. {invoice.discount:,.2f}"],
                ["Total Amount:", f"Rs. {invoice.total_amount:,.2f}"],
                ["Paid Amount:", f"Rs. {invoice.paid_amount:,.2f}"],
                ["Balance Due:", f"Rs. {invoice.balance_due:,.2f}"],
            ])
            elems.append(_info_table(totals_data))

            if invoice.notes:
                elems.append(Spacer(1, 12))
                elems.append(Paragraph("Notes", styles["heading"]))
                elems.append(Paragraph(invoice.notes, styles["normal"]))

            return elems

        pdf_bytes = build_pdf(build_elements)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
        return response


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice')
    serializer_class = PaymentSerializer
    pagination_class = BillingPagination
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        invoice = params.get('invoice')
        if invoice:
            queryset = queryset.filter(invoice_id=invoice)

        payment_method = params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        return queryset


class BillEstimatorView(APIView):
    """Estimate bill before visiting the hospital"""
    permission_classes = []  # Public access

    def get(self, request):
        from doctors.models import Doctor
        from lab.models import LabTest

        doctor_id = request.query_params.get('doctor_id')
        services = request.query_params.getlist('services', [])  # consultation, lab, room, etc.
        days = int(request.query_params.get('days', 1))

        estimate = {
            'items': [],
            'subtotal': 0,
            'gst_estimate': 0,
            'total_estimate': 0,
        }

        # Consultation fee
        if doctor_id:
            try:
                doctor = Doctor.objects.get(id=doctor_id)
                fee = float(doctor.consultation_fee)
                estimate['items'].append({
                    'description': f'Consultation - Dr. {doctor.first_name} {doctor.last_name}',
                    'amount': fee,
                })
                estimate['subtotal'] += fee
            except Doctor.DoesNotExist:
                pass

        # Lab tests
        lab_test_ids = request.query_params.getlist('lab_tests', [])
        if lab_test_ids:
            tests = LabTest.objects.filter(id__in=lab_test_ids, is_active=True)
            for test in tests:
                amt = float(test.price)
                estimate['items'].append({
                    'description': f'Lab: {test.name}',
                    'amount': amt,
                })
                estimate['subtotal'] += amt

        # Room charges
        if 'room' in services:
            from departments.models import Bed
            bed_type = request.query_params.get('bed_type', 'GENERAL')
            avg_rate = Bed.objects.filter(
                ward__ward_type=bed_type, status='AVAILABLE'
            ).aggregate(avg=models.Avg('daily_rate'))['avg']
            if avg_rate:
                room_cost = float(avg_rate) * days
                estimate['items'].append({
                    'description': f'Room ({bed_type}) x {days} days',
                    'amount': round(room_cost, 2),
                })
                estimate['subtotal'] += room_cost

        # Pharmacy estimate (average)
        if 'pharmacy' in services:
            estimate['items'].append({
                'description': 'Medicines (estimated)',
                'amount': 500.00,
            })
            estimate['subtotal'] += 500

        # GST (18% on healthcare services — note: many healthcare services are exempt)
        gst_rate = float(request.query_params.get('gst_rate', 0))
        estimate['gst_estimate'] = round(estimate['subtotal'] * gst_rate / 100, 2)
        estimate['total_estimate'] = round(estimate['subtotal'] + estimate['gst_estimate'], 2)
        estimate['subtotal'] = round(estimate['subtotal'], 2)

        estimate['note'] = 'This is an estimate only. Actual charges may vary based on treatment.'

        return Response(estimate)


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    queryset = InsuranceClaim.objects.select_related('invoice', 'patient')
    pagination_class = BillingPagination
    permission_classes = [IsAdminOrStaff]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return InsuranceClaimDetailSerializer
        return InsuranceClaimSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        patient = params.get('patient')
        if patient:
            queryset = queryset.filter(patient_id=patient)

        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset
