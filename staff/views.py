from datetime import date
from django.db.models import Sum
from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.permissions import IsAdminOrStaff
from .models import StaffMember, Attendance, ShiftSchedule, LeaveRequest, Payroll, SalaryStructure, SalaryRevision, StaffLoan, ShiftHandover
from .serializers import (
    StaffMemberSerializer, StaffMemberListSerializer,
    AttendanceSerializer, ShiftScheduleSerializer,
    LeaveRequestSerializer, PayrollSerializer,
    SalaryStructureSerializer, SalaryRevisionSerializer, StaffLoanSerializer,
    ShiftHandoverSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class StaffMemberViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.all()
    serializer_class = StaffMemberSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'department', 'current_shift', 'is_active']
    search_fields = ['first_name', 'last_name', 'employee_id', 'email', 'phone_number']
    ordering_fields = ['employee_id', 'first_name', 'last_name', 'date_of_joining']
    ordering = ['employee_id']
    permission_classes = [IsAdminOrStaff]

    def get_serializer_class(self):
        if self.action == 'list':
            return StaffMemberListSerializer
        return StaffMemberSerializer

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        department_id = request.query_params.get('department_id', None)
        if not department_id:
            return Response(
                {"error": "department_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        staff = StaffMember.objects.filter(department_id=department_id, is_active=True)
        serializer = StaffMemberListSerializer(staff, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_role(self, request):
        role = request.query_params.get('role', None)
        if not role:
            return Response(
                {"error": "role parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        staff = StaffMember.objects.filter(role=role, is_active=True)
        serializer = StaffMemberListSerializer(staff, many=True)
        return Response(serializer.data)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff_member', 'date', 'status']
    ordering_fields = ['date', 'staff_member']
    ordering = ['-date']
    permission_classes = [IsAdminOrStaff]

    @action(detail=False, methods=['get'])
    def by_staff(self, request):
        staff_id = request.query_params.get('staff_id', None)
        if not staff_id:
            return Response(
                {"error": "staff_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        records = Attendance.objects.filter(staff_member_id=staff_id)
        page = self.paginate_queryset(records)
        if page is not None:
            serializer = AttendanceSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AttendanceSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def monthly_report(self, request):
        month = request.query_params.get('month', None)
        year = request.query_params.get('year', None)
        if not month or not year:
            return Response(
                {"error": "Both month and year parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        records = Attendance.objects.filter(
            date__month=int(month),
            date__year=int(year),
        )
        summary = {
            'total_records': records.count(),
            'present': records.filter(status='PRESENT').count(),
            'absent': records.filter(status='ABSENT').count(),
            'half_day': records.filter(status='HALF_DAY').count(),
            'late': records.filter(status='LATE').count(),
            'on_leave': records.filter(status='ON_LEAVE').count(),
            'holiday': records.filter(status='HOLIDAY').count(),
            'total_hours_worked': records.aggregate(
                total=Sum('hours_worked')
            )['total'] or 0,
            'total_overtime': records.aggregate(
                total=Sum('overtime_hours')
            )['total'] or 0,
        }
        serializer = AttendanceSerializer(records, many=True)
        return Response({
            'summary': summary,
            'records': serializer.data,
        })


class ShiftScheduleViewSet(viewsets.ModelViewSet):
    queryset = ShiftSchedule.objects.all()
    serializer_class = ShiftScheduleSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff_member', 'shift']
    ordering_fields = ['start_date', 'end_date']
    ordering = ['-start_date']
    permission_classes = [IsAdminOrStaff]

    @action(detail=False, methods=['get'])
    def current_schedule(self, request):
        today = date.today()
        schedules = ShiftSchedule.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
        )
        serializer = ShiftScheduleSerializer(schedules, many=True)
        return Response(serializer.data)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['staff_member', 'leave_type', 'status']
    search_fields = ['staff_member__first_name', 'staff_member__last_name', 'reason']
    ordering_fields = ['start_date', 'created_at']
    ordering = ['-created_at']
    permission_classes = [IsAdminOrStaff]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != 'PENDING':
            return Response(
                {"error": "Only pending leave requests can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )
        leave_request.status = 'APPROVED'
        leave_request.approved_by = request.user
        leave_request.save()
        serializer = LeaveRequestSerializer(leave_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave_request = self.get_object()
        if leave_request.status != 'PENDING':
            return Response(
                {"error": "Only pending leave requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )
        leave_request.status = 'REJECTED'
        leave_request.approved_by = request.user
        leave_request.save()
        serializer = LeaveRequestSerializer(leave_request)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_leaves(self, request):
        staff_id = request.query_params.get('staff_id', None)
        if not staff_id:
            return Response(
                {"error": "staff_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        leaves = LeaveRequest.objects.filter(staff_member_id=staff_id)
        page = self.paginate_queryset(leaves)
        if page is not None:
            serializer = LeaveRequestSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = LeaveRequestSerializer(leaves, many=True)
        return Response(serializer.data)


class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all()
    serializer_class = PayrollSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff_member', 'month', 'year', 'status']
    ordering_fields = ['year', 'month', 'net_salary']
    ordering = ['-year', '-month']
    permission_classes = [IsAdminOrStaff]

    @action(detail=False, methods=['post'])
    def generate_payroll(self, request):
        from decimal import Decimal
        month = request.data.get('month')
        year = request.data.get('year')
        if not month or not year:
            return Response(
                {"error": "Both month and year are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        month = int(month)
        year = int(year)
        active_staff = StaffMember.objects.filter(is_active=True)
        created = []
        skipped = []
        errors = []

        for staff in active_staff:
            if Payroll.objects.filter(staff_member=staff, month=month, year=year).exists():
                skipped.append(staff.employee_id)
                continue

            # Get attendance data
            attendance = Attendance.objects.filter(
                staff_member=staff, date__month=month, date__year=year,
            )
            present_days = attendance.filter(status__in=['PRESENT', 'LATE']).count()
            half_days = attendance.filter(status='HALF_DAY').count()
            leaves_taken = attendance.filter(status__in=['ABSENT', 'ON_LEAVE']).count()
            total_overtime = attendance.aggregate(total=Sum('overtime_hours'))['total'] or Decimal('0')
            effective_days = present_days + (half_days * Decimal('0.5'))

            # Try salary structure first, fallback to basic salary field
            try:
                ss = staff.salary_structure
                basic = ss.basic_salary
                hra = ss.hra
                da = ss.da
                special = ss.special_allowance
                medical = ss.medical_allowance
                transport = ss.transport_allowance
                food = ss.food_allowance
                other_allow = ss.other_allowance
                gross = ss.gross_salary

                # Deductions
                pf_emp = basic * Decimal('0.12') if ss.pf_deduction else Decimal('0')
                pf_emr = basic * Decimal('0.12') if ss.pf_deduction else Decimal('0')
                esi_emp = gross * Decimal('0.0075') if ss.esi_deduction and gross <= 21000 else Decimal('0')
                esi_emr = gross * Decimal('0.0325') if ss.esi_deduction and gross <= 21000 else Decimal('0')
                prof_tax = Decimal('0')
                if ss.professional_tax:
                    if gross > 15000:
                        prof_tax = Decimal('200')
                    elif gross > 10000:
                        prof_tax = Decimal('150')
                tds = gross * (ss.tds_percentage / 100) if ss.tds_percentage > 0 else Decimal('0')
                loan_emi = ss.loan_emi
                other_ded = ss.other_deduction
            except SalaryStructure.DoesNotExist:
                # Fallback: use the single salary field as basic
                basic = staff.salary
                hra = da = special = medical = transport = food = other_allow = Decimal('0')
                gross = basic
                pf_emp = pf_emr = esi_emp = esi_emr = prof_tax = tds = loan_emi = other_ded = Decimal('0')

            # Overtime calculation
            hourly_rate = basic / 26 / 8
            overtime_pay = total_overtime * hourly_rate

            # Loss of pay deduction
            working_days = 26
            lop_days = max(0, working_days - int(effective_days) - leaves_taken)
            lop_deduction = (basic / working_days) * lop_days if lop_days > 0 else Decimal('0')

            total_earnings = gross + overtime_pay - lop_deduction
            total_deductions = pf_emp + esi_emp + prof_tax + tds + loan_emi + other_ded
            net = total_earnings - total_deductions

            Payroll.objects.create(
                staff_member=staff,
                month=month, year=year,
                basic_salary=basic,
                hra=hra, da=da,
                special_allowance=special,
                medical_allowance=medical,
                transport_allowance=transport,
                food_allowance=food,
                other_allowance=other_allow,
                overtime_pay=round(overtime_pay, 2),
                gross_salary=round(total_earnings, 2),
                pf_employee=round(pf_emp, 2),
                pf_employer=round(pf_emr, 2),
                esi_employee=round(esi_emp, 2),
                esi_employer=round(esi_emr, 2),
                professional_tax=round(prof_tax, 2),
                tds=round(tds, 2),
                loan_emi=round(loan_emi, 2),
                other_deduction=round(other_ded, 2),
                total_deductions=round(total_deductions, 2),
                allowances=round(hra + da + special + medical + transport + food + other_allow, 2),
                deductions=round(total_deductions, 2),
                net_salary=round(net, 2),
                working_days=working_days,
                present_days=int(effective_days),
                leaves_taken=leaves_taken,
                lop_days=lop_days,
                overtime_hours=total_overtime,
                generated_by=request.user,
                status='DRAFT',
            )
            created.append(staff.employee_id)

        return Response({
            'message': f'Payroll generated for {month}/{year}',
            'created': len(created),
            'skipped': len(skipped),
            'created_ids': created,
            'skipped_ids': skipped,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def by_month(self, request):
        month = request.query_params.get('month', None)
        year = request.query_params.get('year', None)
        if not month or not year:
            return Response(
                {"error": "Both month and year parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        records = Payroll.objects.filter(month=int(month), year=int(year))
        total_net = records.aggregate(total=Sum('net_salary'))['total'] or 0
        serializer = PayrollSerializer(records, many=True)
        return Response({
            'total_payroll': total_net,
            'count': records.count(),
            'records': serializer.data,
        })

    @action(detail=False, methods=['get'])
    def payroll_summary(self, request):
        """Summary with total CTC, deductions breakdown"""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        if not month or not year:
            return Response({"error": "month and year required"}, status=status.HTTP_400_BAD_REQUEST)
        records = Payroll.objects.filter(month=int(month), year=int(year))
        return Response({
            'month': month, 'year': year,
            'total_staff': records.count(),
            'total_gross': records.aggregate(t=Sum('gross_salary'))['t'] or 0,
            'total_basic': records.aggregate(t=Sum('basic_salary'))['t'] or 0,
            'total_hra': records.aggregate(t=Sum('hra'))['t'] or 0,
            'total_overtime': records.aggregate(t=Sum('overtime_pay'))['t'] or 0,
            'total_pf_employee': records.aggregate(t=Sum('pf_employee'))['t'] or 0,
            'total_pf_employer': records.aggregate(t=Sum('pf_employer'))['t'] or 0,
            'total_esi_employee': records.aggregate(t=Sum('esi_employee'))['t'] or 0,
            'total_esi_employer': records.aggregate(t=Sum('esi_employer'))['t'] or 0,
            'total_professional_tax': records.aggregate(t=Sum('professional_tax'))['t'] or 0,
            'total_tds': records.aggregate(t=Sum('tds'))['t'] or 0,
            'total_deductions': records.aggregate(t=Sum('total_deductions'))['t'] or 0,
            'total_net': records.aggregate(t=Sum('net_salary'))['t'] or 0,
            'by_status': {
                'draft': records.filter(status='DRAFT').count(),
                'processed': records.filter(status='PROCESSED').count(),
                'paid': records.filter(status='PAID').count(),
            }
        })


    @action(detail=True, methods=['get'], url_path='download-payslip')
    def download_payslip(self, request, pk=None):
        """Generate and download payslip PDF"""
        from analytics.pdf_reports import build_pdf, _info_table, _items_table, Paragraph, Spacer
        payroll = self.get_object()
        staff = payroll.staff_member
        month_names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']

        def build_elements(styles):
            elems = []
            elems.append(Paragraph("PAYSLIP", styles["heading"]))
            elems.append(Paragraph(f"{month_names[payroll.month]} {payroll.year}", styles["normal"]))
            elems.append(Spacer(1, 12))

            # Employee info
            elems.append(Paragraph("Employee Details", styles["heading"]))
            info = [
                ["Employee ID:", staff.employee_id],
                ["Name:", f"{staff.first_name} {staff.last_name}"],
                ["Role:", staff.get_role_display()],
                ["Department:", staff.department.name if staff.department else '-'],
            ]
            elems.append(_info_table(info))
            elems.append(Spacer(1, 12))

            # Earnings
            elems.append(Paragraph("Earnings", styles["heading"]))
            earnings = [
                ["Basic Salary", f"Rs. {payroll.basic_salary:,.2f}"],
                ["HRA", f"Rs. {payroll.hra:,.2f}"],
                ["DA", f"Rs. {payroll.da:,.2f}"],
                ["Special Allowance", f"Rs. {payroll.special_allowance:,.2f}"],
                ["Medical Allowance", f"Rs. {payroll.medical_allowance:,.2f}"],
                ["Transport Allowance", f"Rs. {payroll.transport_allowance:,.2f}"],
                ["Food Allowance", f"Rs. {payroll.food_allowance:,.2f}"],
                ["Overtime Pay", f"Rs. {payroll.overtime_pay:,.2f}"],
                ["Bonus", f"Rs. {payroll.bonus:,.2f}"],
            ]
            # Filter out zero items
            earnings = [e for e in earnings if not e[1].endswith("0.00")]
            earnings.append(["Gross Salary", f"Rs. {payroll.gross_salary:,.2f}"])
            headers_e = ["Component", "Amount"]
            elems.append(_items_table(headers_e, earnings, col_widths=[300, 190]))
            elems.append(Spacer(1, 12))

            # Deductions
            elems.append(Paragraph("Deductions", styles["heading"]))
            deductions = [
                ["PF (Employee)", f"Rs. {payroll.pf_employee:,.2f}"],
                ["ESI (Employee)", f"Rs. {payroll.esi_employee:,.2f}"],
                ["Professional Tax", f"Rs. {payroll.professional_tax:,.2f}"],
                ["TDS", f"Rs. {payroll.tds:,.2f}"],
                ["Loan EMI", f"Rs. {payroll.loan_emi:,.2f}"],
                ["Other Deductions", f"Rs. {payroll.other_deduction:,.2f}"],
            ]
            deductions = [d for d in deductions if not d[1].endswith("0.00")]
            deductions.append(["Total Deductions", f"Rs. {payroll.total_deductions:,.2f}"])
            headers_d = ["Component", "Amount"]
            elems.append(_items_table(headers_d, deductions, col_widths=[300, 190]))
            elems.append(Spacer(1, 12))

            # Employer contributions
            elems.append(Paragraph("Employer Contributions", styles["heading"]))
            employer = [
                ["PF (Employer)", f"Rs. {payroll.pf_employer:,.2f}"],
                ["ESI (Employer)", f"Rs. {payroll.esi_employer:,.2f}"],
            ]
            employer = [e for e in employer if not e[1].endswith("0.00")]
            if employer:
                elems.append(_items_table(["Component", "Amount"], employer, col_widths=[300, 190]))
            elems.append(Spacer(1, 12))

            # Net Pay
            elems.append(Paragraph("Summary", styles["heading"]))
            summary = [
                ["Gross Salary:", f"Rs. {payroll.gross_salary:,.2f}"],
                ["Total Deductions:", f"Rs. {payroll.total_deductions:,.2f}"],
                ["Net Salary:", f"Rs. {payroll.net_salary:,.2f}"],
            ]
            elems.append(_info_table(summary))

            # Attendance
            elems.append(Spacer(1, 12))
            elems.append(Paragraph("Attendance", styles["heading"]))
            att = [
                ["Working Days:", str(payroll.working_days)],
                ["Present Days:", str(payroll.present_days)],
                ["Leaves Taken:", str(payroll.leaves_taken)],
                ["LOP Days:", str(payroll.lop_days)],
                ["Overtime Hours:", str(payroll.overtime_hours)],
            ]
            elems.append(_info_table(att))

            return elems

        pdf_bytes = build_pdf(build_elements)
        filename = f"payslip_{staff.employee_id}_{payroll.month}_{payroll.year}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class SalaryStructureViewSet(viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.all()
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['staff_member']


class SalaryRevisionViewSet(viewsets.ModelViewSet):
    queryset = SalaryRevision.objects.all()
    serializer_class = SalaryRevisionSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff_member']
    ordering = ['-effective_date']


class StaffLoanViewSet(viewsets.ModelViewSet):
    queryset = StaffLoan.objects.all()
    serializer_class = StaffLoanSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['staff_member', 'status']

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        from decimal import Decimal
        loan = self.get_object()
        if loan.status != 'ACTIVE':
            return Response({'error': 'Loan is not active.'}, status=status.HTTP_400_BAD_REQUEST)
        loan.paid_installments += 1
        loan.outstanding_amount -= loan.emi_amount
        if loan.outstanding_amount <= 0:
            loan.outstanding_amount = Decimal('0')
            loan.status = 'CLOSED'
        loan.save()
        return Response(StaffLoanSerializer(loan).data)


class ShiftHandoverViewSet(viewsets.ModelViewSet):
    queryset = ShiftHandover.objects.select_related('from_staff', 'to_staff', 'department').all()
    serializer_class = ShiftHandoverSerializer
    permission_classes = [IsAdminOrStaff]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['from_staff', 'to_staff', 'department', 'date', 'acknowledged']
    ordering = ['-date', '-created_at']

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        from django.utils import timezone
        handover = self.get_object()
        if handover.acknowledged:
            return Response({'error': 'Already acknowledged.'}, status=status.HTTP_400_BAD_REQUEST)
        handover.acknowledged = True
        handover.acknowledged_at = timezone.now()
        handover.save()
        return Response({'detail': 'Handover acknowledged.', 'acknowledged_at': handover.acknowledged_at})

    @action(detail=False, methods=['get'])
    def today(self, request):
        from datetime import date as dt_date
        handovers = ShiftHandover.objects.filter(date=dt_date.today())
        return Response(ShiftHandoverSerializer(handovers, many=True).data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        handovers = ShiftHandover.objects.filter(acknowledged=False)
        return Response(ShiftHandoverSerializer(handovers, many=True).data)
