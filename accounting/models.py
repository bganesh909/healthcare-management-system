from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class FiscalYear(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g. "FY 2025-26"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_closed = models.BooleanField(default=False)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='closed_fiscal_years'
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_active:
            FiscalYear.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class FiscalPeriod(models.Model):
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='periods')
    name = models.CharField(max_length=50)  # e.g. "April 2025"
    start_date = models.DateField()
    end_date = models.DateField()
    period_number = models.PositiveIntegerField()  # 1-12
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('fiscal_year', 'period_number')
        ordering = ['fiscal_year', 'period_number']

    def __str__(self):
        return f"{self.name} ({self.fiscal_year.name})"


class AccountGroup(models.Model):
    ASSET = 'ASSET'
    LIABILITY = 'LIABILITY'
    EQUITY = 'EQUITY'
    INCOME = 'INCOME'
    EXPENSE = 'EXPENSE'

    GROUP_TYPE_CHOICES = [
        (ASSET, 'Asset'),
        (LIABILITY, 'Liability'),
        (EQUITY, 'Equity'),
        (INCOME, 'Income'),
        (EXPENSE, 'Expense'),
    ]

    NATURE_CHOICES = [
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
    ]

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    group_type = models.CharField(max_length=20, choices=GROUP_TYPE_CHOICES)
    nature = models.CharField(max_length=10, choices=NATURE_CHOICES)
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        null=True, blank=True, related_name='children'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Account(models.Model):
    """Chart of Accounts - individual account heads"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    account_group = models.ForeignKey(AccountGroup, on_delete=models.PROTECT, related_name='accounts')
    description = models.TextField(blank=True)
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    current_balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)  # system accounts can't be deleted
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def account_type(self):
        return self.account_group.group_type


class JournalEntry(models.Model):
    DRAFT = 'DRAFT'
    POSTED = 'POSTED'
    REVERSED = 'REVERSED'
    STATUS_CHOICES = [
        (DRAFT, 'Draft'),
        (POSTED, 'Posted'),
        (REVERSED, 'Reversed'),
    ]

    SOURCE_CHOICES = [
        ('MANUAL', 'Manual Entry'),
        ('INVOICE', 'Patient Invoice'),
        ('PAYMENT', 'Payment Receipt'),
        ('PAYROLL', 'Payroll'),
        ('PURCHASE', 'Purchase Order'),
        ('EXPENSE', 'Expense'),
        ('ADJUSTMENT', 'Adjustment'),
        ('OPENING', 'Opening Balance'),
        ('CLOSING', 'Closing Entry'),
    ]

    entry_number = models.CharField(max_length=20, unique=True)
    date = models.DateField()
    fiscal_period = models.ForeignKey(
        FiscalPeriod, on_delete=models.PROTECT,
        null=True, blank=True, related_name='journal_entries'
    )
    description = models.TextField()
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='MANUAL')
    reference_type = models.CharField(max_length=50, blank=True)  # e.g. 'Invoice', 'Payment'
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=DRAFT)
    total_debit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_credit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='journal_entries_created'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='journal_entries_approved'
    )
    posted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name_plural = 'Journal Entries'

    def __str__(self):
        return f"{self.entry_number} - {self.description[:50]}"

    @property
    def is_balanced(self):
        return self.total_debit == self.total_credit

    def save(self, *args, **kwargs):
        if not self.entry_number:
            last = JournalEntry.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.entry_number = f"JE-{num:06d}"
        super().save(*args, **kwargs)

    def post(self, user=None):
        if not self.is_balanced:
            raise ValueError("Journal entry is not balanced. Debit must equal Credit.")
        if self.status != self.DRAFT:
            raise ValueError("Only draft entries can be posted.")

        for line in self.lines.all():
            account = line.account
            if line.debit > 0:
                if account.account_group.nature == 'DEBIT':
                    account.current_balance += line.debit
                else:
                    account.current_balance -= line.debit
            if line.credit > 0:
                if account.account_group.nature == 'CREDIT':
                    account.current_balance += line.credit
                else:
                    account.current_balance -= line.credit
            account.save()

        self.status = self.POSTED
        self.posted_at = timezone.now()
        self.approved_by = user
        self.save()

    def reverse(self, user=None):
        if self.status != self.POSTED:
            raise ValueError("Only posted entries can be reversed.")

        reverse_entry = JournalEntry.objects.create(
            date=timezone.now().date(),
            description=f"Reversal of {self.entry_number}: {self.description}",
            source='ADJUSTMENT',
            reference_type=self.reference_type,
            reference_id=self.reference_id,
            created_by=user,
        )

        for line in self.lines.all():
            JournalEntryLine.objects.create(
                journal_entry=reverse_entry,
                account=line.account,
                debit=line.credit,
                credit=line.debit,
                description=f"Reversal: {line.description}",
            )

        reverse_entry.total_debit = self.total_credit
        reverse_entry.total_credit = self.total_debit
        reverse_entry.save()
        reverse_entry.post(user)

        self.status = self.REVERSED
        self.save()
        return reverse_entry


class JournalEntryLine(models.Model):
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='journal_lines')
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    description = models.CharField(max_length=255, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)  # department/ward

    class Meta:
        ordering = ['id']

    def __str__(self):
        if self.debit > 0:
            return f"Dr. {self.account.name} {self.debit}"
        return f"Cr. {self.account.name} {self.credit}"


class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('SALARY', 'Salaries & Wages'),
        ('MEDICAL_SUPPLIES', 'Medical Supplies'),
        ('MEDICINE', 'Medicines & Drugs'),
        ('EQUIPMENT', 'Equipment & Instruments'),
        ('MAINTENANCE', 'Maintenance & Repairs'),
        ('UTILITIES', 'Utilities (Electricity, Water, Gas)'),
        ('RENT', 'Rent & Lease'),
        ('INSURANCE', 'Insurance'),
        ('MARKETING', 'Marketing & Advertising'),
        ('IT', 'IT & Software'),
        ('FOOD', 'Food & Catering'),
        ('LAUNDRY', 'Laundry & Housekeeping'),
        ('TRANSPORT', 'Transport & Ambulance'),
        ('LEGAL', 'Legal & Professional'),
        ('TRAINING', 'Training & Development'),
        ('MISCELLANEOUS', 'Miscellaneous'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('PAID', 'Paid'),
        ('REJECTED', 'Rejected'),
    ]

    expense_number = models.CharField(max_length=20, unique=True)
    date = models.DateField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    department = models.ForeignKey(
        'departments.Department', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='expenses'
    )
    vendor = models.ForeignKey(
        'inventory.Vendor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='expenses'
    )
    payment_method = models.CharField(max_length=20, blank=True)
    receipt_number = models.CharField(max_length=100, blank=True)
    receipt_file = models.FileField(upload_to='expense_receipts/', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='expenses_submitted'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='expenses_approved'
    )
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='expenses'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.expense_number} - {self.get_category_display()} - {self.total_amount}"

    def save(self, *args, **kwargs):
        if not self.expense_number:
            last = Expense.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.expense_number = f"EXP-{num:06d}"
        if not self.total_amount:
            self.total_amount = self.amount + self.tax_amount
        super().save(*args, **kwargs)


class Budget(models.Model):
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='budgets')
    department = models.ForeignKey(
        'departments.Department', on_delete=models.CASCADE, related_name='budgets'
    )
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='budgets')
    annual_amount = models.DecimalField(max_digits=15, decimal_places=2)
    monthly_amount = models.DecimalField(max_digits=15, decimal_places=2)
    spent_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('fiscal_year', 'department', 'account')
        ordering = ['department', 'account']

    def __str__(self):
        return f"{self.department.name} - {self.account.name} - {self.fiscal_year.name}"

    @property
    def remaining_amount(self):
        return self.annual_amount - self.spent_amount

    @property
    def utilization_percentage(self):
        if self.annual_amount == 0:
            return 0
        return round((self.spent_amount / self.annual_amount) * 100, 2)


class TaxConfiguration(models.Model):
    """GST and other tax rates"""
    TAX_TYPE_CHOICES = [
        ('CGST', 'CGST'),
        ('SGST', 'SGST'),
        ('IGST', 'IGST'),
        ('TDS', 'TDS'),
        ('PROFESSIONAL_TAX', 'Professional Tax'),
    ]

    name = models.CharField(max_length=100)
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    rate = models.DecimalField(max_digits=5, decimal_places=2)  # percentage
    hsn_sac_code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['tax_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.tax_type}) - {self.rate}%"


class PatientAdvance(models.Model):
    """Patient advance/deposit tracking"""
    advance_number = models.CharField(max_length=20, unique=True)
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='advances')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, default='CASH')
    transaction_id = models.CharField(max_length=100, blank=True)
    purpose = models.CharField(max_length=200, blank=True)  # admission, surgery, etc.
    is_refunded = models.BooleanField(default=False)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    refund_date = models.DateField(null=True, blank=True)
    adjusted_against_invoice = models.ForeignKey(
        'billing.Invoice', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='advance_adjustments'
    )
    adjusted_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='collected_advances'
    )
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='advances'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.advance_number} - Patient #{self.patient_id} - {self.amount}"

    def save(self, *args, **kwargs):
        if not self.advance_number:
            last = PatientAdvance.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.advance_number = f"ADV-{num:06d}"
        super().save(*args, **kwargs)

    @property
    def balance(self):
        return self.amount - self.adjusted_amount - self.refund_amount


class DailyCollection(models.Model):
    """Daily cash/payment collection summary"""
    date = models.DateField(unique=True)
    cash_collection = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    card_collection = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    upi_collection = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_banking_collection = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    insurance_collection = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_collection = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_invoices = models.PositiveIntegerField(default=0)
    total_refunds = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_collection = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    reconciled = models.BooleanField(default=False)
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Collection {self.date} - {self.net_collection}"
