from django.contrib import admin
from .models import (
    FiscalYear, FiscalPeriod, AccountGroup, Account,
    JournalEntry, JournalEntryLine, Expense, Budget,
    TaxConfiguration, PatientAdvance, DailyCollection,
)


class FiscalPeriodInline(admin.TabularInline):
    model = FiscalPeriod
    extra = 0


@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_active', 'is_closed')
    inlines = [FiscalPeriodInline]


@admin.register(AccountGroup)
class AccountGroupAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'group_type', 'nature', 'parent')
    list_filter = ('group_type', 'nature')


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'account_group', 'current_balance', 'is_active', 'is_system')
    list_filter = ('account_group__group_type', 'is_active')
    search_fields = ('code', 'name')


class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 2


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('entry_number', 'date', 'description', 'source', 'status', 'total_debit', 'total_credit')
    list_filter = ('status', 'source')
    search_fields = ('entry_number', 'description')
    inlines = [JournalEntryLineInline]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('expense_number', 'date', 'category', 'total_amount', 'status', 'department')
    list_filter = ('status', 'category')
    search_fields = ('expense_number', 'description')


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('department', 'account', 'fiscal_year', 'annual_amount', 'spent_amount', 'utilization_percentage')
    list_filter = ('fiscal_year', 'department')


@admin.register(TaxConfiguration)
class TaxConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'tax_type', 'rate', 'is_active', 'effective_from')
    list_filter = ('tax_type', 'is_active')


@admin.register(PatientAdvance)
class PatientAdvanceAdmin(admin.ModelAdmin):
    list_display = ('advance_number', 'patient', 'amount', 'adjusted_amount', 'is_refunded')
    search_fields = ('advance_number',)


@admin.register(DailyCollection)
class DailyCollectionAdmin(admin.ModelAdmin):
    list_display = ('date', 'total_collection', 'net_collection', 'reconciled')
    list_filter = ('reconciled',)
