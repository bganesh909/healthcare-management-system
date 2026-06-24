from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal


@receiver(post_save, sender='billing.Payment')
def create_payment_journal_entry(sender, instance, created, **kwargs):
    """Auto-create journal entry when a payment is received"""
    if not created:
        return

    from .models import JournalEntry, JournalEntryLine, Account

    # Find accounts (create if needed via management command)
    try:
        cash_account = Account.objects.get(code='1001')  # Cash/Bank
        revenue_account = Account.objects.get(code='4001')  # Patient Revenue
    except Account.DoesNotExist:
        return  # Accounts not set up yet

    method_map = {
        'CASH': 'Cash',
        'CREDIT_CARD': 'Card',
        'DEBIT_CARD': 'Card',
        'UPI': 'UPI',
        'NET_BANKING': 'Bank Transfer',
        'INSURANCE': 'Insurance',
    }
    method = method_map.get(instance.payment_method, instance.payment_method)

    entry = JournalEntry.objects.create(
        date=instance.payment_date,
        description=f"Payment received via {method} for Invoice {instance.invoice.invoice_number if instance.invoice else 'N/A'}",
        source='PAYMENT',
        reference_type='Payment',
        reference_id=instance.id,
        total_debit=instance.amount,
        total_credit=instance.amount,
    )

    JournalEntryLine.objects.create(
        journal_entry=entry,
        account=cash_account,
        debit=instance.amount,
        credit=Decimal('0'),
        description=f"Payment received - {method}",
    )
    JournalEntryLine.objects.create(
        journal_entry=entry,
        account=revenue_account,
        debit=Decimal('0'),
        credit=instance.amount,
        description=f"Revenue from Invoice {instance.invoice.invoice_number if instance.invoice else 'N/A'}",
    )

    entry.post()


@receiver(post_save, sender='staff.Payroll')
def create_payroll_journal_entry(sender, instance, **kwargs):
    """Auto-create journal entry when payroll is marked as PAID"""
    if instance.status != 'PAID':
        return

    from .models import JournalEntry, JournalEntryLine, Account

    # Check if journal entry already exists for this payroll
    if JournalEntry.objects.filter(
        reference_type='Payroll', reference_id=instance.id
    ).exists():
        return

    try:
        salary_expense = Account.objects.get(code='5001')  # Salary Expense
        cash_account = Account.objects.get(code='1001')  # Cash/Bank
    except Account.DoesNotExist:
        return

    staff_name = f"{instance.staff_member.first_name} {instance.staff_member.last_name}"
    entry = JournalEntry.objects.create(
        date=instance.paid_date or instance.created_at.date(),
        description=f"Salary payment to {staff_name} for {instance.month}/{instance.year}",
        source='PAYROLL',
        reference_type='Payroll',
        reference_id=instance.id,
        total_debit=instance.net_salary,
        total_credit=instance.net_salary,
    )

    JournalEntryLine.objects.create(
        journal_entry=entry,
        account=salary_expense,
        debit=instance.net_salary,
        credit=Decimal('0'),
        description=f"Salary - {staff_name}",
    )
    JournalEntryLine.objects.create(
        journal_entry=entry,
        account=cash_account,
        debit=Decimal('0'),
        credit=instance.net_salary,
        description=f"Salary paid - {staff_name}",
    )

    entry.post()
