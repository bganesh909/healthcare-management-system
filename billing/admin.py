from django.contrib import admin
from .models import Invoice, InvoiceItem, Payment, InsuranceClaim


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    readonly_fields = ['total_price']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    inlines = [InvoiceItemInline]
    list_display = [
        'invoice_number', 'patient', 'status', 'total_amount',
        'paid_amount', 'due_date', 'issue_date',
    ]
    list_filter = ['status', 'issue_date', 'due_date']
    search_fields = [
        'invoice_number', 'patient__first_name', 'patient__last_name',
    ]
    date_hierarchy = 'issue_date'
    readonly_fields = ['invoice_number', 'created_at', 'updated_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'invoice', 'payment_method', 'amount', 'transaction_id', 'payment_date',
    ]
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['invoice__invoice_number', 'transaction_id']
    readonly_fields = ['payment_date']


@admin.register(InsuranceClaim)
class InsuranceClaimAdmin(admin.ModelAdmin):
    list_display = [
        'claim_number', 'patient', 'insurance_provider', 'status',
        'claimed_amount', 'approved_amount', 'submission_date',
    ]
    list_filter = ['status', 'insurance_provider', 'submission_date']
    search_fields = [
        'claim_number', 'policy_number', 'patient__first_name',
        'patient__last_name', 'insurance_provider',
    ]
    readonly_fields = ['submission_date', 'created_at', 'updated_at']
