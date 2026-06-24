from rest_framework import serializers
from .models import (
    FiscalYear, FiscalPeriod, AccountGroup, Account,
    JournalEntry, JournalEntryLine, Expense, Budget,
    TaxConfiguration, PatientAdvance, DailyCollection,
)


class FiscalPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalPeriod
        fields = '__all__'


class FiscalYearSerializer(serializers.ModelSerializer):
    periods = FiscalPeriodSerializer(many=True, read_only=True)

    class Meta:
        model = FiscalYear
        fields = '__all__'
        read_only_fields = ('closed_by', 'closed_at')


class AccountGroupSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True, default=None)

    class Meta:
        model = AccountGroup
        fields = '__all__'

    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return AccountGroupSerializer(children, many=True).data


class AccountSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='account_group.name', read_only=True)
    group_type = serializers.CharField(source='account_group.group_type', read_only=True)
    nature = serializers.CharField(source='account_group.nature', read_only=True)

    class Meta:
        model = Account
        fields = '__all__'
        read_only_fields = ('current_balance',)


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = '__all__'
        read_only_fields = ('journal_entry',)


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, default=None)
    is_balanced = serializers.BooleanField(read_only=True)

    class Meta:
        model = JournalEntry
        fields = '__all__'
        read_only_fields = ('entry_number', 'total_debit', 'total_credit', 'created_by',
                            'approved_by', 'posted_at', 'status')


class JournalEntryCreateSerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = ('date', 'description', 'source', 'reference_type', 'reference_id', 'notes', 'lines')

    def validate_lines(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("A journal entry must have at least 2 lines.")
        total_debit = sum(line.get('debit', 0) for line in value)
        total_credit = sum(line.get('credit', 0) for line in value)
        if total_debit != total_credit:
            raise serializers.ValidationError(
                f"Entry is not balanced. Debit ({total_debit}) != Credit ({total_credit})"
            )
        for line in value:
            if line.get('debit', 0) > 0 and line.get('credit', 0) > 0:
                raise serializers.ValidationError("A line cannot have both debit and credit amounts.")
            if line.get('debit', 0) == 0 and line.get('credit', 0) == 0:
                raise serializers.ValidationError("A line must have either debit or credit amount.")
        return value

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        validated_data['created_by'] = self.context['request'].user
        total_debit = sum(line.get('debit', 0) for line in lines_data)
        total_credit = sum(line.get('credit', 0) for line in lines_data)
        validated_data['total_debit'] = total_debit
        validated_data['total_credit'] = total_credit
        entry = JournalEntry.objects.create(**validated_data)
        for line_data in lines_data:
            JournalEntryLine.objects.create(journal_entry=entry, **line_data)
        return entry


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, default=None)
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('expense_number', 'submitted_by', 'approved_by', 'journal_entry')


class BudgetSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    utilization_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = Budget
        fields = '__all__'


class TaxConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxConfiguration
        fields = '__all__'


class PatientAdvanceSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PatientAdvance
        fields = '__all__'
        read_only_fields = ('advance_number', 'collected_by', 'journal_entry')

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else None


class DailyCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCollection
        fields = '__all__'
        read_only_fields = ('reconciled_by',)


# ==================== Report Serializers ====================
class TrialBalanceSerializer(serializers.Serializer):
    account_code = serializers.CharField()
    account_name = serializers.CharField()
    group_name = serializers.CharField()
    group_type = serializers.CharField()
    debit = serializers.DecimalField(max_digits=15, decimal_places=2)
    credit = serializers.DecimalField(max_digits=15, decimal_places=2)


class ProfitLossSerializer(serializers.Serializer):
    income = serializers.ListField()
    expenses = serializers.ListField()
    total_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=15, decimal_places=2)


class BalanceSheetSerializer(serializers.Serializer):
    assets = serializers.ListField()
    liabilities = serializers.ListField()
    equity = serializers.ListField()
    total_assets = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_liabilities = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_equity = serializers.DecimalField(max_digits=15, decimal_places=2)
