from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class StaffMember(models.Model):
    ROLE_CHOICES = (
        ('NURSE', 'Nurse'),
        ('TECHNICIAN', 'Technician'),
        ('RECEPTIONIST', 'Receptionist'),
        ('PHARMACIST', 'Pharmacist'),
        ('LAB_TECHNICIAN', 'Lab Technician'),
        ('WARD_BOY', 'Ward Boy'),
        ('SECURITY', 'Security'),
        ('HOUSEKEEPING', 'Housekeeping'),
        ('ADMIN_STAFF', 'Administrative Staff'),
        ('OTHER', 'Other'),
    )

    SHIFT_CHOICES = (
        ('MORNING', 'Morning (6AM-2PM)'),
        ('AFTERNOON', 'Afternoon (2PM-10PM)'),
        ('NIGHT', 'Night (10PM-6AM)'),
        ('GENERAL', 'General (9AM-5PM)'),
        ('ROTATING', 'Rotating'),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='staff_profile',
    )
    employee_id = models.CharField(max_length=20, unique=True, help_text="Format: EMP-XXXXX")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_members',
    )
    phone_number = models.CharField(max_length=15)
    email = models.EmailField()
    date_of_joining = models.DateField()
    qualification = models.CharField(max_length=200)
    current_shift = models.CharField(max_length=15, choices=SHIFT_CHOICES, default='GENERAL')
    salary = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    address = models.TextField()
    emergency_contact_name = models.CharField(max_length=100)
    emergency_contact_number = models.CharField(max_length=15)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_id} - {self.first_name} {self.last_name} ({self.get_role_display()})"

    class Meta:
        ordering = ['employee_id']


class Attendance(models.Model):
    STATUS_CHOICES = (
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('HALF_DAY', 'Half Day'),
        ('LATE', 'Late'),
        ('ON_LEAVE', 'On Leave'),
        ('HOLIDAY', 'Holiday'),
    )

    staff_member = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    date = models.DateField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.staff_member.employee_id} - {self.date} ({self.get_status_display()})"

    class Meta:
        unique_together = ['staff_member', 'date']
        ordering = ['-date']


class ShiftSchedule(models.Model):
    SHIFT_CHOICES = StaffMember.SHIFT_CHOICES

    staff_member = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name='shift_schedules',
    )
    shift = models.CharField(max_length=15, choices=SHIFT_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.staff_member.employee_id} - {self.get_shift_display()} ({self.start_date} to {self.end_date})"

    class Meta:
        ordering = ['-start_date']


class ShiftHandover(models.Model):
    """Digital handover notes between shifts"""
    from_staff = models.ForeignKey(
        StaffMember, on_delete=models.CASCADE, related_name='handovers_given'
    )
    to_staff = models.ForeignKey(
        StaffMember, on_delete=models.CASCADE, related_name='handovers_received',
        null=True, blank=True
    )
    from_shift = models.CharField(max_length=15, choices=StaffMember.SHIFT_CHOICES)
    to_shift = models.CharField(max_length=15, choices=StaffMember.SHIFT_CHOICES)
    department = models.ForeignKey(
        'departments.Department', on_delete=models.SET_NULL, null=True, blank=True
    )
    date = models.DateField()
    # Handover content
    patient_updates = models.TextField(blank=True, help_text="Critical patient updates")
    pending_tasks = models.TextField(blank=True, help_text="Tasks to be completed")
    medications_due = models.TextField(blank=True, help_text="Upcoming medication schedules")
    equipment_issues = models.TextField(blank=True, help_text="Equipment problems")
    incidents = models.TextField(blank=True, help_text="Incidents or concerns")
    general_notes = models.TextField(blank=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Handover {self.date} {self.from_shift} → {self.to_shift} by {self.from_staff.employee_id}"


class LeaveRequest(models.Model):
    LEAVE_TYPE_CHOICES = (
        ('CASUAL', 'Casual Leave'),
        ('SICK', 'Sick Leave'),
        ('EARNED', 'Earned Leave'),
        ('MATERNITY', 'Maternity Leave'),
        ('PATERNITY', 'Paternity Leave'),
        ('UNPAID', 'Unpaid Leave'),
        ('COMPENSATORY', 'Compensatory Off'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    )

    staff_member = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name='leave_requests',
    )
    leave_type = models.CharField(max_length=15, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_leave_requests',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.staff_member.employee_id} - {self.get_leave_type_display()} ({self.start_date} to {self.end_date})"

    class Meta:
        ordering = ['-created_at']


class SalaryStructure(models.Model):
    """Defines the salary breakdown for each staff member"""
    staff_member = models.OneToOneField(
        StaffMember, on_delete=models.CASCADE, related_name='salary_structure'
    )
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, help_text="Monthly basic pay")
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="House Rent Allowance")
    da = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Dearness Allowance")
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    food_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Employer contributions
    employer_pf = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Employer PF (12% of basic)")
    employer_esi = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Employer ESI (3.25% of gross)")
    # Deduction rates
    pf_deduction = models.BooleanField(default=True, help_text="Deduct PF from employee (12% of basic)")
    esi_deduction = models.BooleanField(default=True, help_text="Deduct ESI from employee (0.75% of gross)")
    professional_tax = models.BooleanField(default=True, help_text="Deduct professional tax")
    tds_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="TDS percentage on salary")
    # Loan EMI
    loan_emi = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Monthly loan EMI deduction")
    other_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    effective_from = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Salary Structure - {self.staff_member.employee_id}"

    @property
    def gross_salary(self):
        return (
            self.basic_salary + self.hra + self.da + self.special_allowance +
            self.medical_allowance + self.transport_allowance +
            self.food_allowance + self.other_allowance
        )

    @property
    def total_deductions(self):
        from decimal import Decimal
        deductions = Decimal('0')
        if self.pf_deduction:
            deductions += self.basic_salary * Decimal('0.12')
        if self.esi_deduction and self.gross_salary <= 21000:
            deductions += self.gross_salary * Decimal('0.0075')
        if self.professional_tax:
            if self.gross_salary > 15000:
                deductions += Decimal('200')
            elif self.gross_salary > 10000:
                deductions += Decimal('150')
        if self.tds_percentage > 0:
            deductions += self.gross_salary * (self.tds_percentage / 100)
        deductions += self.loan_emi + self.other_deduction
        return deductions

    @property
    def net_salary(self):
        return self.gross_salary - self.total_deductions


class SalaryRevision(models.Model):
    """Track salary revision history"""
    staff_member = models.ForeignKey(
        StaffMember, on_delete=models.CASCADE, related_name='salary_revisions'
    )
    effective_date = models.DateField()
    previous_basic = models.DecimalField(max_digits=12, decimal_places=2)
    new_basic = models.DecimalField(max_digits=12, decimal_places=2)
    previous_gross = models.DecimalField(max_digits=12, decimal_places=2)
    new_gross = models.DecimalField(max_digits=12, decimal_places=2)
    increment_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    reason = models.CharField(max_length=200, blank=True)  # promotion, annual, etc.
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_date']

    def __str__(self):
        return f"{self.staff_member.employee_id} - Revised on {self.effective_date}"


class StaffLoan(models.Model):
    """Track staff loans and EMI deductions"""
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('CLOSED', 'Closed'),
        ('DEFAULTED', 'Defaulted'),
    )

    staff_member = models.ForeignKey(
        StaffMember, on_delete=models.CASCADE, related_name='loans'
    )
    loan_number = models.CharField(max_length=20, unique=True)
    loan_type = models.CharField(max_length=50)  # salary advance, personal, etc.
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    emi_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_installments = models.PositiveIntegerField()
    paid_installments = models.PositiveIntegerField(default=0)
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2)
    disbursement_date = models.DateField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ACTIVE')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-disbursement_date']

    def __str__(self):
        return f"{self.loan_number} - {self.staff_member.employee_id}"

    def save(self, *args, **kwargs):
        if not self.loan_number:
            last = StaffLoan.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.loan_number = f"LOAN-{num:05d}"
        super().save(*args, **kwargs)


class Payroll(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('PROCESSED', 'Processed'),
        ('PAID', 'Paid'),
    )

    staff_member = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name='payroll_records',
    )
    month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    year = models.IntegerField()
    # Earnings
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    hra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    da = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    special_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medical_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    food_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Deductions
    pf_employee = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Employee PF (12% of basic)")
    pf_employer = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Employer PF (12% of basic)")
    esi_employee = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Employee ESI (0.75%)")
    esi_employer = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Employer ESI (3.25%)")
    professional_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tds = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Tax Deducted at Source")
    loan_emi = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Legacy fields (kept for backward compat)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Net
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    # Attendance
    working_days = models.PositiveIntegerField(default=26)
    present_days = models.PositiveIntegerField(default=0)
    leaves_taken = models.PositiveIntegerField(default=0)
    lop_days = models.PositiveIntegerField(default=0, help_text="Loss of Pay days")
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    # Meta
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='DRAFT')
    paid_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, blank=True, default='BANK_TRANSFER')
    transaction_reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='payrolls_generated'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.staff_member.employee_id} - {self.month}/{self.year} ({self.get_status_display()})"

    class Meta:
        unique_together = ['staff_member', 'month', 'year']
        ordering = ['-year', '-month']

    @property
    def ctc(self):
        """Cost to Company = Gross + Employer PF + Employer ESI"""
        return self.gross_salary + self.pf_employer + self.esi_employer
