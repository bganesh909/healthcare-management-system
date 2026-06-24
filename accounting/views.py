from django.db.models import Sum, Q, F, Case, When, DecimalField, Count, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

from .models import (
    FiscalYear, FiscalPeriod, AccountGroup, Account,
    JournalEntry, JournalEntryLine, Expense, Budget,
    TaxConfiguration, PatientAdvance, DailyCollection,
)
from .serializers import (
    FiscalYearSerializer, FiscalPeriodSerializer,
    AccountGroupSerializer, AccountSerializer,
    JournalEntrySerializer, JournalEntryCreateSerializer,
    ExpenseSerializer, BudgetSerializer,
    TaxConfigurationSerializer, PatientAdvanceSerializer,
    DailyCollectionSerializer,
)


class IsAdminOrStaff:
    """Checks user is admin or staff role"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'staff')


class FiscalYearViewSet(viewsets.ModelViewSet):
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        fy = FiscalYear.objects.filter(is_active=True).first()
        if fy:
            return Response(FiscalYearSerializer(fy).data)
        return Response({'detail': 'No active fiscal year.'}, status=404)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        fy = self.get_object()
        if fy.is_closed:
            return Response({'detail': 'Already closed.'}, status=400)
        fy.is_closed = True
        fy.closed_by = request.user
        fy.closed_at = timezone.now()
        fy.save()
        fy.periods.update(is_closed=True)
        return Response({'detail': f'Fiscal year {fy.name} closed.'})

    @action(detail=True, methods=['post'])
    def generate_periods(self, request, pk=None):
        fy = self.get_object()
        if fy.periods.exists():
            return Response({'detail': 'Periods already exist.'}, status=400)
        import calendar
        from dateutil.relativedelta import relativedelta
        current = fy.start_date
        for i in range(1, 13):
            last_day = calendar.monthrange(current.year, current.month)[1]
            end = current.replace(day=last_day)
            if end > fy.end_date:
                end = fy.end_date
            FiscalPeriod.objects.create(
                fiscal_year=fy,
                name=current.strftime('%B %Y'),
                start_date=current,
                end_date=end,
                period_number=i,
            )
            current = current + relativedelta(months=1)
            current = current.replace(day=1)
            if current > fy.end_date:
                break
        return Response({'detail': f'Generated {fy.periods.count()} periods.'})


class AccountGroupViewSet(viewsets.ModelViewSet):
    queryset = AccountGroup.objects.filter(is_active=True)
    serializer_class = AccountGroupSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def tree(self, request):
        roots = AccountGroup.objects.filter(parent__isnull=True, is_active=True)
        serializer = self.get_serializer(roots, many=True)
        return Response(serializer.data)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.filter(is_active=True)
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def by_group(self, request):
        group_type = request.query_params.get('group_type')
        if group_type:
            accounts = Account.objects.filter(account_group__group_type=group_type, is_active=True)
            return Response(AccountSerializer(accounts, many=True).data)
        return Response({'detail': 'group_type parameter required.'}, status=400)

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        account = self.get_object()
        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date')

        lines = JournalEntryLine.objects.filter(
            account=account,
            journal_entry__status='POSTED'
        ).select_related('journal_entry')

        if start:
            lines = lines.filter(journal_entry__date__gte=start)
        if end:
            lines = lines.filter(journal_entry__date__lte=end)

        lines = lines.order_by('journal_entry__date', 'journal_entry__id')

        entries = []
        running_balance = account.opening_balance
        for line in lines:
            if account.account_group.nature == 'DEBIT':
                running_balance += line.debit - line.credit
            else:
                running_balance += line.credit - line.debit

            entries.append({
                'date': line.journal_entry.date,
                'entry_number': line.journal_entry.entry_number,
                'description': line.description or line.journal_entry.description,
                'debit': line.debit,
                'credit': line.credit,
                'balance': running_balance,
            })

        return Response({
            'account': AccountSerializer(account).data,
            'opening_balance': account.opening_balance,
            'closing_balance': running_balance,
            'entries': entries,
        })


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return JournalEntryCreateSerializer
        return JournalEntrySerializer

    @action(detail=True, methods=['post'])
    def post_entry(self, request, pk=None):
        entry = self.get_object()
        try:
            entry.post(user=request.user)
            return Response({'detail': f'Journal entry {entry.entry_number} posted.'})
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def reverse_entry(self, request, pk=None):
        entry = self.get_object()
        try:
            reverse = entry.reverse(user=request.user)
            return Response({
                'detail': f'Entry {entry.entry_number} reversed.',
                'reverse_entry': JournalEntrySerializer(reverse).data,
            })
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def by_source(self, request):
        source = request.query_params.get('source')
        if source:
            entries = JournalEntry.objects.filter(source=source)
            return Response(JournalEntrySerializer(entries, many=True).data)
        return Response({'detail': 'source parameter required.'}, status=400)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        expense = self.get_object()
        if expense.status != 'SUBMITTED':
            return Response({'detail': 'Only submitted expenses can be approved.'}, status=400)
        expense.status = 'APPROVED'
        expense.approved_by = request.user
        expense.save()
        return Response({'detail': 'Expense approved.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        expense = self.get_object()
        expense.status = 'REJECTED'
        expense.save()
        return Response({'detail': 'Expense rejected.'})

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        expense = self.get_object()
        if expense.status != 'APPROVED':
            return Response({'detail': 'Only approved expenses can be marked paid.'}, status=400)
        expense.status = 'PAID'
        expense.save()
        return Response({'detail': 'Expense marked as paid.'})

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        start = request.query_params.get('start_date', (date.today() - timedelta(days=30)).isoformat())
        end = request.query_params.get('end_date', date.today().isoformat())
        expenses = Expense.objects.filter(
            date__gte=start, date__lte=end, status__in=['APPROVED', 'PAID']
        ).values('category').annotate(
            total=Sum('total_amount'),
            count=Count('id'),
        ).order_by('-total')
        return Response(list(expenses))

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        start = request.query_params.get('start_date', (date.today() - timedelta(days=30)).isoformat())
        end = request.query_params.get('end_date', date.today().isoformat())
        from django.db import models as db_models
        expenses = Expense.objects.filter(
            date__gte=start, date__lte=end, status__in=['APPROVED', 'PAID']
        ).values('department__name').annotate(
            total=Sum('total_amount'),
            count=db_models.Count('id'),
        ).order_by('-total')
        return Response(list(expenses))

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        from django.db.models.functions import TruncMonth
        months = request.query_params.get('months', 12)
        expenses = Expense.objects.filter(
            status__in=['APPROVED', 'PAID'],
            date__gte=date.today() - timedelta(days=int(months) * 30),
        ).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total=Sum('total_amount'),
        ).order_by('month')
        return Response(list(expenses))


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        dept_id = request.query_params.get('department_id')
        fy_id = request.query_params.get('fiscal_year_id')
        qs = Budget.objects.all()
        if dept_id:
            qs = qs.filter(department_id=dept_id)
        if fy_id:
            qs = qs.filter(fiscal_year_id=fy_id)
        return Response(BudgetSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def variance_report(self, request):
        fy = FiscalYear.objects.filter(is_active=True).first()
        if not fy:
            return Response({'detail': 'No active fiscal year.'}, status=400)
        budgets = Budget.objects.filter(fiscal_year=fy).select_related('department', 'account')
        report = []
        for b in budgets:
            report.append({
                'department': b.department.name,
                'account': b.account.name,
                'budgeted': b.annual_amount,
                'spent': b.spent_amount,
                'remaining': b.remaining_amount,
                'utilization': b.utilization_percentage,
                'status': 'Over Budget' if b.spent_amount > b.annual_amount else 'Under Budget',
            })
        return Response(report)


class TaxConfigViewSet(viewsets.ModelViewSet):
    queryset = TaxConfiguration.objects.filter(is_active=True)
    serializer_class = TaxConfigurationSerializer
    permission_classes = [IsAuthenticated]


class PatientAdvanceViewSet(viewsets.ModelViewSet):
    queryset = PatientAdvance.objects.all()
    serializer_class = PatientAdvanceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(collected_by=self.request.user)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        patient_id = request.query_params.get('patient_id')
        if patient_id:
            advances = PatientAdvance.objects.filter(patient_id=patient_id)
            return Response(PatientAdvanceSerializer(advances, many=True).data)
        return Response({'detail': 'patient_id required.'}, status=400)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        advance = self.get_object()
        amount = Decimal(request.data.get('amount', advance.balance))
        if amount > advance.balance:
            return Response({'detail': f'Refund amount cannot exceed balance of {advance.balance}.'}, status=400)
        advance.refund_amount += amount
        advance.refund_date = date.today()
        if advance.balance == 0:
            advance.is_refunded = True
        advance.save()
        return Response({'detail': f'Refund of {amount} processed.', 'balance': advance.balance})


class DailyCollectionViewSet(viewsets.ModelViewSet):
    queryset = DailyCollection.objects.all()
    serializer_class = DailyCollectionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def generate(self, request):
        target_date = request.data.get('date', date.today().isoformat())
        from billing.models import Payment
        payments = Payment.objects.filter(payment_date=target_date)

        collection, created = DailyCollection.objects.get_or_create(
            date=target_date,
            defaults={
                'cash_collection': payments.filter(payment_method='CASH').aggregate(t=Sum('amount'))['t'] or 0,
                'card_collection': payments.filter(payment_method__in=['CREDIT_CARD', 'DEBIT_CARD']).aggregate(t=Sum('amount'))['t'] or 0,
                'upi_collection': payments.filter(payment_method='UPI').aggregate(t=Sum('amount'))['t'] or 0,
                'net_banking_collection': payments.filter(payment_method='NET_BANKING').aggregate(t=Sum('amount'))['t'] or 0,
                'insurance_collection': payments.filter(payment_method='INSURANCE').aggregate(t=Sum('amount'))['t'] or 0,
                'total_invoices': payments.values('invoice').distinct().count(),
            }
        )
        if not created:
            collection.cash_collection = payments.filter(payment_method='CASH').aggregate(t=Sum('amount'))['t'] or 0
            collection.card_collection = payments.filter(payment_method__in=['CREDIT_CARD', 'DEBIT_CARD']).aggregate(t=Sum('amount'))['t'] or 0
            collection.upi_collection = payments.filter(payment_method='UPI').aggregate(t=Sum('amount'))['t'] or 0
            collection.net_banking_collection = payments.filter(payment_method='NET_BANKING').aggregate(t=Sum('amount'))['t'] or 0
            collection.insurance_collection = payments.filter(payment_method='INSURANCE').aggregate(t=Sum('amount'))['t'] or 0
            collection.total_invoices = payments.values('invoice').distinct().count()

        collection.total_collection = (
            collection.cash_collection + collection.card_collection +
            collection.upi_collection + collection.net_banking_collection +
            collection.insurance_collection
        )
        collection.net_collection = collection.total_collection - collection.total_refunds
        collection.save()

        return Response(DailyCollectionSerializer(collection).data)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        collection = self.get_object()
        collection.reconciled = True
        collection.reconciled_by = request.user
        collection.save()
        return Response({'detail': 'Collection reconciled.'})


# ==================== Financial Reports ====================

class TrialBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        as_of = request.query_params.get('as_of', date.today().isoformat())
        accounts = Account.objects.filter(is_active=True).select_related('account_group')
        data = []
        total_debit = Decimal('0')
        total_credit = Decimal('0')

        for account in accounts:
            lines = JournalEntryLine.objects.filter(
                account=account,
                journal_entry__status='POSTED',
                journal_entry__date__lte=as_of,
            ).aggregate(
                total_debit=Sum('debit'),
                total_credit=Sum('credit'),
            )

            dr = (lines['total_debit'] or Decimal('0')) + (
                account.opening_balance if account.account_group.nature == 'DEBIT' else Decimal('0')
            )
            cr = (lines['total_credit'] or Decimal('0')) + (
                account.opening_balance if account.account_group.nature == 'CREDIT' else Decimal('0')
            )

            net = dr - cr
            if net != 0:
                entry = {
                    'account_code': account.code,
                    'account_name': account.name,
                    'group_name': account.account_group.name,
                    'group_type': account.account_group.group_type,
                    'debit': max(net, Decimal('0')),
                    'credit': abs(min(net, Decimal('0'))),
                }
                data.append(entry)
                total_debit += entry['debit']
                total_credit += entry['credit']

        return Response({
            'as_of': as_of,
            'accounts': data,
            'total_debit': total_debit,
            'total_credit': total_credit,
            'is_balanced': total_debit == total_credit,
        })


class ProfitLossView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date', date.today().isoformat())

        if not start:
            fy = FiscalYear.objects.filter(is_active=True).first()
            start = fy.start_date.isoformat() if fy else (date.today().replace(month=4, day=1)).isoformat()

        income_accounts = Account.objects.filter(
            account_group__group_type='INCOME', is_active=True
        ).select_related('account_group')
        expense_accounts = Account.objects.filter(
            account_group__group_type='EXPENSE', is_active=True
        ).select_related('account_group')

        def get_account_totals(accounts, date_start, date_end):
            result = []
            total = Decimal('0')
            for acc in accounts:
                agg = JournalEntryLine.objects.filter(
                    account=acc,
                    journal_entry__status='POSTED',
                    journal_entry__date__gte=date_start,
                    journal_entry__date__lte=date_end,
                ).aggregate(dr=Sum('debit'), cr=Sum('credit'))
                dr = agg['dr'] or Decimal('0')
                cr = agg['cr'] or Decimal('0')
                amount = cr - dr if acc.account_group.nature == 'CREDIT' else dr - cr
                if amount != 0:
                    result.append({
                        'account_code': acc.code,
                        'account_name': acc.name,
                        'amount': abs(amount),
                    })
                    total += abs(amount)
            return result, total

        income, total_income = get_account_totals(income_accounts, start, end)
        expenses, total_expenses = get_account_totals(expense_accounts, start, end)

        return Response({
            'period': {'start': start, 'end': end},
            'income': income,
            'expenses': expenses,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'gross_profit': total_income - total_expenses,
            'net_profit': total_income - total_expenses,
        })


class BalanceSheetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        as_of = request.query_params.get('as_of', date.today().isoformat())

        def get_group_balances(group_type):
            accounts = Account.objects.filter(
                account_group__group_type=group_type, is_active=True
            ).select_related('account_group')
            result = []
            total = Decimal('0')
            for acc in accounts:
                agg = JournalEntryLine.objects.filter(
                    account=acc,
                    journal_entry__status='POSTED',
                    journal_entry__date__lte=as_of,
                ).aggregate(dr=Sum('debit'), cr=Sum('credit'))
                dr = agg['dr'] or Decimal('0')
                cr = agg['cr'] or Decimal('0')
                balance = (dr - cr + acc.opening_balance) if acc.account_group.nature == 'DEBIT' else (cr - dr + acc.opening_balance)
                if balance != 0:
                    result.append({
                        'account_code': acc.code,
                        'account_name': acc.name,
                        'balance': abs(balance),
                    })
                    total += abs(balance)
            return result, total

        assets, total_assets = get_group_balances('ASSET')
        liabilities, total_liabilities = get_group_balances('LIABILITY')
        equity, total_equity = get_group_balances('EQUITY')

        return Response({
            'as_of': as_of,
            'assets': assets,
            'liabilities': liabilities,
            'equity': equity,
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'total_equity': total_equity,
            'total_liabilities_and_equity': total_liabilities + total_equity,
            'is_balanced': total_assets == (total_liabilities + total_equity),
        })


class CashFlowView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date', date.today().isoformat())

        if not start:
            start = (date.today() - timedelta(days=30)).isoformat()

        # Cash inflows (payments received)
        from billing.models import Payment
        inflows = Payment.objects.filter(
            payment_date__gte=start, payment_date__lte=end
        ).aggregate(total=Sum('amount'))

        # Cash outflows (expenses paid + payroll)
        expense_outflows = Expense.objects.filter(
            date__gte=start, date__lte=end, status='PAID'
        ).aggregate(total=Sum('total_amount'))

        from staff.models import Payroll
        payroll_outflows = Payroll.objects.filter(
            paid_date__gte=start, paid_date__lte=end, status='PAID'
        ).aggregate(total=Sum('net_salary'))

        total_inflow = inflows['total'] or Decimal('0')
        total_expense = expense_outflows['total'] or Decimal('0')
        total_payroll = payroll_outflows['total'] or Decimal('0')
        total_outflow = total_expense + total_payroll

        # Daily breakdown
        from django.db.models.functions import TruncDate
        daily_inflows = Payment.objects.filter(
            payment_date__gte=start, payment_date__lte=end
        ).annotate(day=TruncDate('payment_date')).values('day').annotate(
            amount=Sum('amount')
        ).order_by('day')

        daily_outflows_expenses = Expense.objects.filter(
            date__gte=start, date__lte=end, status='PAID'
        ).values('date').annotate(amount=Sum('total_amount')).order_by('date')

        return Response({
            'period': {'start': start, 'end': end},
            'inflows': {
                'patient_payments': total_inflow,
                'total': total_inflow,
            },
            'outflows': {
                'expenses': total_expense,
                'payroll': total_payroll,
                'total': total_outflow,
            },
            'net_cash_flow': total_inflow - total_outflow,
            'daily_inflows': list(daily_inflows),
            'daily_outflows': list(daily_outflows_expenses),
        })


class ARAgingView(APIView):
    """Accounts Receivable Aging Report"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from billing.models import Invoice
        today = date.today()
        outstanding = Invoice.objects.filter(
            status__in=['PENDING', 'PARTIALLY_PAID', 'OVERDUE']
        ).select_related('patient')

        aging = {'current': [], '30_days': [], '60_days': [], '90_days': [], 'over_90': []}

        for inv in outstanding:
            days = (today - inv.issue_date).days if inv.issue_date else 0
            balance = inv.total_amount - inv.paid_amount
            entry = {
                'invoice_number': inv.invoice_number,
                'patient': f"{inv.patient.first_name} {inv.patient.last_name}" if inv.patient else '-',
                'invoice_date': inv.issue_date,
                'amount': inv.total_amount,
                'paid': inv.paid_amount,
                'balance': balance,
                'days_outstanding': days,
            }
            if days <= 30:
                aging['current'].append(entry)
            elif days <= 60:
                aging['30_days'].append(entry)
            elif days <= 90:
                aging['60_days'].append(entry)
            else:
                aging['over_90'].append(entry)

        return Response({
            'as_of': today,
            'summary': {
                'current': sum(e['balance'] for e in aging['current']),
                '30_days': sum(e['balance'] for e in aging['30_days']),
                '60_days': sum(e['balance'] for e in aging['60_days']),
                '90_days': sum(e['balance'] for e in aging.get('90_days', [])),
                'over_90': sum(e['balance'] for e in aging['over_90']),
                'total': sum(e['balance'] for bucket in aging.values() for e in bucket),
            },
            'detail': aging,
        })


class FinancialDashboardView(APIView):
    """Comprehensive financial dashboard"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)
        fy = FiscalYear.objects.filter(is_active=True).first()
        fy_start = fy.start_date if fy else today.replace(month=4, day=1)

        from billing.models import Invoice, Payment
        from staff.models import Payroll

        # Revenue
        today_revenue = Payment.objects.filter(payment_date=today).aggregate(t=Sum('amount'))['t'] or 0
        month_revenue = Payment.objects.filter(payment_date__gte=month_start).aggregate(t=Sum('amount'))['t'] or 0
        fy_revenue = Payment.objects.filter(payment_date__gte=fy_start).aggregate(t=Sum('amount'))['t'] or 0

        # Outstanding
        outstanding = Invoice.objects.filter(
            status__in=['PENDING', 'PARTIALLY_PAID', 'OVERDUE']
        ).aggregate(
            total=Sum(F('total_amount') - F('paid_amount'), output_field=DecimalField())
        )['total'] or 0

        # Expenses
        month_expenses = Expense.objects.filter(
            date__gte=month_start, status__in=['APPROVED', 'PAID']
        ).aggregate(t=Sum('total_amount'))['t'] or 0
        fy_expenses = Expense.objects.filter(
            date__gte=fy_start, status__in=['APPROVED', 'PAID']
        ).aggregate(t=Sum('total_amount'))['t'] or 0

        # Payroll
        month_payroll = Payroll.objects.filter(
            status='PAID',
            paid_date__gte=month_start,
        ).aggregate(t=Sum('net_salary'))['t'] or 0

        # Pending approvals
        pending_expenses = Expense.objects.filter(status='SUBMITTED').count()
        draft_payroll = Payroll.objects.filter(status='DRAFT').count()

        # Recent transactions
        recent_payments = Payment.objects.order_by('-payment_date')[:5]
        recent_expenses = Expense.objects.filter(status__in=['APPROVED', 'PAID']).order_by('-date')[:5]

        return Response({
            'revenue': {
                'today': today_revenue,
                'month': month_revenue,
                'fy': fy_revenue,
            },
            'outstanding_receivables': outstanding,
            'expenses': {
                'month': month_expenses,
                'fy': fy_expenses,
            },
            'payroll': {
                'month': month_payroll,
            },
            'profit': {
                'month': month_revenue - month_expenses - month_payroll,
                'fy': fy_revenue - fy_expenses,
            },
            'pending_approvals': pending_expenses + draft_payroll,
            'recent_payments': [
                {
                    'id': p.id,
                    'amount': p.amount,
                    'method': p.payment_method,
                    'date': p.payment_date,
                    'invoice': p.invoice.invoice_number if p.invoice else '-',
                } for p in recent_payments
            ],
            'recent_expenses': [
                {
                    'id': e.id,
                    'amount': e.total_amount,
                    'category': e.get_category_display(),
                    'date': e.date,
                    'status': e.status,
                } for e in recent_expenses
            ],
        })


# ==================== Advanced Reports ====================

def _linear_regression(x, y):
    """Pure Python linear regression (no numpy dependency)."""
    n = len(x)
    if n == 0:
        return 0, 0
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)
    denom = n * sum_x2 - sum_x ** 2
    slope = (n * sum_xy - sum_x * sum_y) / denom if denom != 0 else 0
    intercept = (sum_y - slope * sum_x) / n if n else 0
    return slope, intercept


class RevenueForecastView(APIView):
    """Revenue forecasting using linear regression on last 12 months of payments."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from billing.models import Payment

        today = date.today()
        twelve_months_ago = today - relativedelta(months=12)

        # Monthly revenue for the last 12 months
        monthly_data = (
            Payment.objects.filter(payment_date__gte=twelve_months_ago)
            .annotate(month=TruncMonth('payment_date'))
            .values('month')
            .annotate(revenue=Sum('amount'))
            .order_by('month')
        )

        historical = []
        revenues = []
        for entry in monthly_data:
            month_val = entry['month']
            rev = float(entry['revenue'] or 0)
            historical.append({
                'month': month_val.strftime('%Y-%m') if hasattr(month_val, 'strftime') else str(month_val),
                'revenue': round(rev, 2),
            })
            revenues.append(rev)

        n = len(revenues)
        avg_monthly_revenue = round(sum(revenues) / n, 2) if n else 0

        # Growth rate: compare last month to first month
        if n >= 2 and revenues[0] != 0:
            growth_rate = round(((revenues[-1] - revenues[0]) / revenues[0]) * 100, 2)
        else:
            growth_rate = 0

        # Seasonality index: ratio of each month's revenue to average
        seasonality = []
        for i, rev in enumerate(revenues):
            idx = round(rev / avg_monthly_revenue, 4) if avg_monthly_revenue else 0
            seasonality.append({
                'month': historical[i]['month'],
                'index': idx,
            })

        # Linear regression for forecasting
        x = list(range(n))
        slope, intercept = _linear_regression(x, revenues)

        # Predict next 3 months
        predicted = []
        for i in range(1, 4):
            future_month = today + relativedelta(months=i)
            forecast_val = slope * (n - 1 + i) + intercept
            # Apply seasonality adjustment if we have enough data
            if n >= 12:
                season_idx = (future_month.month - 1) % n
                forecast_val *= seasonality[season_idx]['index'] if seasonality[season_idx]['index'] else 1
            predicted.append({
                'month': future_month.strftime('%Y-%m'),
                'predicted_revenue': round(max(forecast_val, 0), 2),
            })

        return Response({
            'historical': historical,
            'predicted': predicted,
            'growth_rate': growth_rate,
            'avg_monthly_revenue': avg_monthly_revenue,
            'seasonality': seasonality,
            'trend': {
                'slope': round(slope, 2),
                'intercept': round(intercept, 2),
            },
        })


class DepartmentPLView(APIView):
    """Department-wise Profit & Loss report."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from billing.models import Invoice
        from staff.models import Payroll
        from departments.models import Department

        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date', date.today().isoformat())

        if not start:
            fy = FiscalYear.objects.filter(is_active=True).first()
            start = fy.start_date.isoformat() if fy else (date.today().replace(month=4, day=1)).isoformat()

        departments = Department.objects.filter(is_active=True)
        report = []

        for dept in departments:
            # Revenue: sum of Invoice total_amount where appointment__doctor is in this department
            # Doctors don't have a department FK, so we use Department.head_doctor's specialization
            # or look up doctors who belong to this department via the Department model.
            # Since Department has head_doctor FK, we find all doctors associated via appointments
            # linked to invoices. Best approach: find invoices whose appointment's doctor
            # is listed in this department (Department -> head_doctor is one-to-one hint).
            # Actually, the most reliable path: use doctor specialization mapped to department name,
            # or use the fact that Department has doctors via head_doctor.
            # Safest: Invoice -> appointment -> doctor, and match doctors whose specialization
            # corresponds to the department, OR doctors who are the head_doctor of the department.
            # Let's use: invoices where appointment.doctor is connected to dept.
            # We'll query invoices via appointment__doctor and match to department by checking
            # if doctor appears as head_doctor of this dept, or if the department name matches
            # the doctor's specialization display value.

            # Revenue from invoices linked to appointments with doctors in this department
            invoice_filter = Q(
                appointment__isnull=False,
                appointment__doctor__departments_headed=dept,
            )
            # Also match by specialization ~ department name (case-insensitive)
            invoice_filter |= Q(
                appointment__isnull=False,
                appointment__doctor__specialization__iexact=dept.name,
            )

            revenue_qs = Invoice.objects.filter(
                invoice_filter,
                issue_date__gte=start,
                issue_date__lte=end,
                status__in=['PAID', 'PARTIALLY_PAID', 'PENDING'],
            ).aggregate(total=Sum('total_amount'))
            revenue = revenue_qs['total'] or Decimal('0')

            # Staff costs: payroll for staff members in this department
            payroll_filter = {
                'staff_member__department': dept,
                'status': 'PAID',
            }
            # Filter by payroll period that falls within the date range
            start_date = date.fromisoformat(start) if isinstance(start, str) else start
            end_date = date.fromisoformat(end) if isinstance(end, str) else end
            payroll_qs = Payroll.objects.filter(
                **payroll_filter,
                year__gte=start_date.year,
                year__lte=end_date.year,
            )
            # Refine month filtering
            if start_date.year == end_date.year:
                payroll_qs = payroll_qs.filter(
                    month__gte=start_date.month,
                    month__lte=end_date.month,
                )
            staff_cost = payroll_qs.aggregate(total=Sum('net_salary'))['total'] or Decimal('0')

            # Other expenses from accounting.Expense for this department
            other_expenses = Expense.objects.filter(
                department=dept,
                date__gte=start,
                date__lte=end,
                status__in=['APPROVED', 'PAID'],
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

            total_expenses = staff_cost + other_expenses
            profit = revenue - total_expenses
            margin_pct = round((profit / revenue) * 100, 2) if revenue else Decimal('0')

            report.append({
                'department_name': dept.name,
                'revenue': revenue,
                'staff_cost': staff_cost,
                'other_expenses': other_expenses,
                'total_expenses': total_expenses,
                'profit': profit,
                'margin_pct': margin_pct,
            })

        # Sort by revenue descending
        report.sort(key=lambda x: x['revenue'], reverse=True)

        total_revenue = sum(r['revenue'] for r in report)
        total_profit = sum(r['profit'] for r in report)

        return Response({
            'period': {'start': start, 'end': end},
            'departments': report,
            'totals': {
                'revenue': total_revenue,
                'profit': total_profit,
                'margin_pct': round((total_profit / total_revenue) * 100, 2) if total_revenue else 0,
            },
        })


class DoctorScorecardView(APIView):
    """Doctor performance scorecard with appointments, revenue, and ratings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from billing.models import Invoice
        from doctors.models import Doctor, DoctorReview
        from appointments.models import Appointment

        start = request.query_params.get('start_date')
        end = request.query_params.get('end_date', date.today().isoformat())
        sort_by = request.query_params.get('sort_by', 'total_revenue')
        order = request.query_params.get('order', 'desc')

        if not start:
            start = (date.today() - timedelta(days=90)).isoformat()

        doctors = Doctor.objects.all()
        scorecards = []

        for doctor in doctors:
            # Appointments in date range
            appts = Appointment.objects.filter(
                doctor=doctor,
                appointment_date__gte=start,
                appointment_date__lte=end,
            )
            total_appointments = appts.count()
            completed = appts.filter(status='COMPLETED').count()
            completion_rate = round((completed / total_appointments) * 100, 2) if total_appointments else 0

            # Revenue from invoices linked to this doctor's appointments
            total_revenue = Invoice.objects.filter(
                appointment__doctor=doctor,
                appointment__appointment_date__gte=start,
                appointment__appointment_date__lte=end,
                status__in=['PAID', 'PARTIALLY_PAID', 'PENDING'],
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')

            # Average rating from reviews
            reviews = DoctorReview.objects.filter(
                doctor=doctor,
                created_at__date__gte=start,
                created_at__date__lte=end,
            )
            avg_rating = reviews.aggregate(avg=Avg('rating'))['avg']
            avg_rating = round(avg_rating, 2) if avg_rating else None

            # Average consultation time (check_in_time to check_out_time)
            completed_appts = appts.filter(
                status='COMPLETED',
                check_in_time__isnull=False,
                check_out_time__isnull=False,
            )
            consultation_times = []
            for appt in completed_appts:
                duration = (appt.check_out_time - appt.check_in_time).total_seconds() / 60.0
                if duration > 0:
                    consultation_times.append(duration)
            avg_consultation_time = (
                round(sum(consultation_times) / len(consultation_times), 1)
                if consultation_times else None
            )

            scorecards.append({
                'doctor_id': doctor.id,
                'doctor_name': f"Dr. {doctor.first_name} {doctor.last_name}",
                'specialization': doctor.get_specialization_display(),
                'total_appointments': total_appointments,
                'completed_appointments': completed,
                'completion_rate': completion_rate,
                'total_revenue': total_revenue,
                'avg_rating': avg_rating,
                'avg_consultation_time_minutes': avg_consultation_time,
                'review_count': reviews.count(),
            })

        # Sorting
        reverse = order == 'desc'
        if sort_by in ('total_revenue', 'total_appointments', 'completion_rate', 'avg_rating', 'avg_consultation_time_minutes'):
            scorecards.sort(
                key=lambda x: x.get(sort_by) if x.get(sort_by) is not None else -1,
                reverse=reverse,
            )

        return Response({
            'period': {'start': start, 'end': end},
            'sort_by': sort_by,
            'order': order,
            'doctors': scorecards,
        })


class GSTReportView(APIView):
    """Generate GST filing report (GSTR-1/GSTR-3B data)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from billing.models import Invoice, InvoiceItem

        month = int(request.query_params.get('month', date.today().month))
        year = int(request.query_params.get('year', date.today().year))

        invoices = Invoice.objects.filter(
            issue_date__month=month, issue_date__year=year,
            status__in=['PAID', 'PARTIALLY_PAID', 'PENDING'],
        )

        total_invoices = invoices.count()
        total_taxable = invoices.aggregate(t=Sum('subtotal'))['t'] or Decimal('0')
        total_cgst = invoices.aggregate(t=Sum('cgst_amount'))['t'] or Decimal('0')
        total_sgst = invoices.aggregate(t=Sum('sgst_amount'))['t'] or Decimal('0')
        total_igst = invoices.aggregate(t=Sum('igst_amount'))['t'] or Decimal('0')
        total_tax = total_cgst + total_sgst + total_igst
        total_value = invoices.aggregate(t=Sum('total_amount'))['t'] or Decimal('0')

        # Invoice-wise details for GSTR-1
        invoice_details = []
        for inv in invoices:
            invoice_details.append({
                'invoice_number': inv.invoice_number,
                'date': inv.issue_date,
                'patient': f"{inv.patient.first_name} {inv.patient.last_name}" if inv.patient else '-',
                'hsn_sac': inv.hsn_sac_code or '9993',
                'taxable_value': inv.subtotal,
                'cgst': inv.cgst_amount,
                'sgst': inv.sgst_amount,
                'igst': inv.igst_amount,
                'total': inv.total_amount,
                'gst_rate': inv.gst_percentage,
            })

        # HSN-wise summary
        hsn_summary = {}
        for inv in invoices:
            hsn = inv.hsn_sac_code or '9993'
            if hsn not in hsn_summary:
                hsn_summary[hsn] = {'taxable': Decimal('0'), 'cgst': Decimal('0'), 'sgst': Decimal('0'), 'igst': Decimal('0'), 'count': 0}
            hsn_summary[hsn]['taxable'] += inv.subtotal
            hsn_summary[hsn]['cgst'] += inv.cgst_amount
            hsn_summary[hsn]['sgst'] += inv.sgst_amount
            hsn_summary[hsn]['igst'] += inv.igst_amount
            hsn_summary[hsn]['count'] += 1

        # Input tax credit (from purchase orders / expenses with GST)
        input_cgst = Expense.objects.filter(
            date__month=month, date__year=year, status__in=['APPROVED', 'PAID']
        ).aggregate(t=Sum('tax_amount'))['t'] or Decimal('0')
        input_tax = input_cgst / 2  # Approximate split

        return Response({
            'period': f"{month:02d}/{year}",
            'gstr1_summary': {
                'total_invoices': total_invoices,
                'total_taxable_value': total_taxable,
                'total_cgst': total_cgst,
                'total_sgst': total_sgst,
                'total_igst': total_igst,
                'total_tax': total_tax,
                'total_invoice_value': total_value,
            },
            'gstr3b_summary': {
                'output_tax': {
                    'cgst': total_cgst,
                    'sgst': total_sgst,
                    'igst': total_igst,
                    'total': total_tax,
                },
                'input_tax_credit': {
                    'cgst': round(input_tax, 2),
                    'sgst': round(input_tax, 2),
                    'igst': Decimal('0'),
                    'total': round(input_tax * 2, 2),
                },
                'net_tax_payable': {
                    'cgst': total_cgst - round(input_tax, 2),
                    'sgst': total_sgst - round(input_tax, 2),
                    'igst': total_igst,
                    'total': total_tax - round(input_tax * 2, 2),
                }
            },
            'hsn_summary': [
                {'hsn': k, **v} for k, v in hsn_summary.items()
            ],
            'invoice_details': invoice_details,
        })


class DayEndClosingView(APIView):
    """Day-end cash register closing and reconciliation"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from billing.models import Payment

        target_date = request.data.get('date', date.today().isoformat())
        actual_cash = request.data.get('actual_cash_in_hand')

        payments = Payment.objects.filter(payment_date=target_date)

        system_cash = payments.filter(payment_method='CASH').aggregate(t=Sum('amount'))['t'] or Decimal('0')
        system_card = payments.filter(payment_method__in=['CREDIT_CARD', 'DEBIT_CARD']).aggregate(t=Sum('amount'))['t'] or Decimal('0')
        system_upi = payments.filter(payment_method='UPI').aggregate(t=Sum('amount'))['t'] or Decimal('0')
        system_bank = payments.filter(payment_method='NET_BANKING').aggregate(t=Sum('amount'))['t'] or Decimal('0')
        system_insurance = payments.filter(payment_method='INSURANCE').aggregate(t=Sum('amount'))['t'] or Decimal('0')
        system_total = system_cash + system_card + system_upi + system_bank + system_insurance

        # Expenses paid today
        expenses_today = Expense.objects.filter(date=target_date, status='PAID').aggregate(t=Sum('total_amount'))['t'] or Decimal('0')

        # Calculate difference
        cash_difference = Decimal('0')
        if actual_cash is not None:
            cash_difference = Decimal(str(actual_cash)) - system_cash

        # Update or create daily collection
        collection, _ = DailyCollection.objects.update_or_create(
            date=target_date,
            defaults={
                'cash_collection': system_cash,
                'card_collection': system_card,
                'upi_collection': system_upi,
                'net_banking_collection': system_bank,
                'insurance_collection': system_insurance,
                'total_collection': system_total,
                'total_invoices': payments.values('invoice').distinct().count(),
                'total_refunds': Decimal('0'),
                'net_collection': system_total,
                'reconciled': actual_cash is not None,
                'reconciled_by': request.user if actual_cash is not None else None,
                'notes': f"Cash difference: {cash_difference}" if cash_difference != 0 else '',
            }
        )

        return Response({
            'date': target_date,
            'collections': {
                'cash': system_cash,
                'card': system_card,
                'upi': system_upi,
                'net_banking': system_bank,
                'insurance': system_insurance,
                'total': system_total,
            },
            'expenses_paid': expenses_today,
            'net_for_day': system_total - expenses_today,
            'total_transactions': payments.count(),
            'reconciliation': {
                'system_cash': system_cash,
                'actual_cash': actual_cash,
                'difference': cash_difference,
                'status': 'Matched' if cash_difference == 0 else ('Excess' if cash_difference > 0 else 'Short'),
            } if actual_cash is not None else None,
            'reconciled': actual_cash is not None,
        })
