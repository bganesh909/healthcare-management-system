from django.db import models
from patients.models import Patient
from appointments.models import Appointment


class Invoice(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    )

    invoice_number = models.CharField(max_length=20, unique=True, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='invoices'
    )
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name='invoice',
        blank=True, null=True
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING'
    )
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    hsn_sac_code = models.CharField(max_length=20, blank=True)
    is_igst = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last_invoice = Invoice.objects.order_by('-id').first()
            if last_invoice and last_invoice.invoice_number:
                last_number = int(last_invoice.invoice_number.split('-')[1])
                new_number = last_number + 1
            else:
                new_number = 1
            self.invoice_number = f'INV-{new_number:06d}'
        super().save(*args, **kwargs)

    @property
    def balance_due(self):
        return self.total_amount - self.paid_amount

    def __str__(self):
        return f"{self.invoice_number} - {self.patient}"

    class Meta:
        ordering = ['-created_at']


class InvoiceItem(models.Model):
    ITEM_TYPE_CHOICES = (
        ('CONSULTATION', 'Consultation'),
        ('PROCEDURE', 'Procedure'),
        ('LAB_TEST', 'Lab Test'),
        ('MEDICATION', 'Medication'),
        ('ROOM_CHARGE', 'Room Charge'),
        ('OTHER', 'Other'),
    )

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='items'
    )
    description = models.CharField(max_length=255)
    item_type = models.CharField(
        max_length=20, choices=ITEM_TYPE_CHOICES, default='CONSULTATION'
    )
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    hsn_sac_code = models.CharField(max_length=20, blank=True)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} - {self.total_price}"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('CASH', 'Cash'),
        ('CREDIT_CARD', 'Credit Card'),
        ('DEBIT_CARD', 'Debit Card'),
        ('UPI', 'UPI'),
        ('NET_BANKING', 'Net Banking'),
        ('INSURANCE', 'Insurance'),
        ('OTHER', 'Other'),
    )

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='payments'
    )
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        invoice = self.invoice
        total_paid = invoice.payments.aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        invoice.paid_amount = total_paid
        if total_paid >= invoice.total_amount:
            invoice.status = 'PAID'
        elif total_paid > 0:
            invoice.status = 'PARTIALLY_PAID'
        invoice.save()

    def __str__(self):
        return f"Payment of {self.amount} for {self.invoice.invoice_number}"


class InsuranceClaim(models.Model):
    STATUS_CHOICES = (
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('PARTIALLY_APPROVED', 'Partially Approved'),
        ('REJECTED', 'Rejected'),
        ('SETTLED', 'Settled'),
    )

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='insurance_claims'
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='insurance_claims'
    )
    insurance_provider = models.CharField(max_length=200)
    policy_number = models.CharField(max_length=100)
    claim_number = models.CharField(
        max_length=100, unique=True, blank=True, null=True
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='SUBMITTED'
    )
    claimed_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    submission_date = models.DateField(auto_now_add=True)
    settlement_date = models.DateField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Claim {self.claim_number} - {self.insurance_provider}"

    class Meta:
        ordering = ['-created_at']


class CreditNote(models.Model):
    """Credit Note for refunds, discounts after billing"""
    REASON_CHOICES = (
        ('REFUND', 'Patient Refund'),
        ('DISCOUNT', 'Post-Billing Discount'),
        ('CANCELLED_SERVICE', 'Cancelled Service'),
        ('BILLING_ERROR', 'Billing Error Correction'),
        ('INSURANCE_ADJUSTMENT', 'Insurance Adjustment'),
        ('OTHER', 'Other'),
    )
    credit_note_number = models.CharField(max_length=20, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='credit_notes')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='credit_notes')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=(
        ('DRAFT', 'Draft'), ('APPROVED', 'Approved'), ('APPLIED', 'Applied'),
    ), default='DRAFT')
    refund_method = models.CharField(max_length=20, blank=True)
    refund_transaction_id = models.CharField(max_length=100, blank=True)
    approved_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.credit_note_number:
            last = CreditNote.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.credit_note_number = f"CN-{num:06d}"
        if not self.total_amount:
            self.total_amount = self.amount + self.cgst_amount + self.sgst_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.credit_note_number} - {self.get_reason_display()} - {self.total_amount}"

    class Meta:
        ordering = ['-created_at']


class DebitNote(models.Model):
    """Debit Note for additional charges"""
    REASON_CHOICES = (
        ('ADDITIONAL_SERVICE', 'Additional Service'),
        ('PRICE_REVISION', 'Price Revision'),
        ('LATE_FEE', 'Late Payment Fee'),
        ('OTHER', 'Other'),
    )
    debit_note_number = models.CharField(max_length=20, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='debit_notes')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='debit_notes')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=(
        ('DRAFT', 'Draft'), ('APPROVED', 'Approved'), ('APPLIED', 'Applied'),
    ), default='DRAFT')
    approved_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.debit_note_number:
            last = DebitNote.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.debit_note_number = f"DN-{num:06d}"
        if not self.total_amount:
            self.total_amount = self.amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.debit_note_number} - {self.get_reason_display()} - {self.total_amount}"

    class Meta:
        ordering = ['-created_at']
