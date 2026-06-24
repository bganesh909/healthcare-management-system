"""
Set up default Chart of Accounts for the hospital.
Usage: python manage.py setup_chart_of_accounts
"""
from django.core.management.base import BaseCommand
from accounting.models import AccountGroup, Account, FiscalYear, TaxConfiguration
from datetime import date


class Command(BaseCommand):
    help = 'Set up default Chart of Accounts for hospital accounting'

    def handle(self, *args, **options):
        self.stdout.write('\nSetting up Chart of Accounts...\n')

        # ==================== Account Groups ====================
        groups_data = [
            # Assets
            {'code': 'A', 'name': 'Assets', 'group_type': 'ASSET', 'nature': 'DEBIT', 'parent': None},
            {'code': 'A1', 'name': 'Current Assets', 'group_type': 'ASSET', 'nature': 'DEBIT', 'parent': 'A'},
            {'code': 'A2', 'name': 'Fixed Assets', 'group_type': 'ASSET', 'nature': 'DEBIT', 'parent': 'A'},
            {'code': 'A3', 'name': 'Receivables', 'group_type': 'ASSET', 'nature': 'DEBIT', 'parent': 'A'},
            # Liabilities
            {'code': 'L', 'name': 'Liabilities', 'group_type': 'LIABILITY', 'nature': 'CREDIT', 'parent': None},
            {'code': 'L1', 'name': 'Current Liabilities', 'group_type': 'LIABILITY', 'nature': 'CREDIT', 'parent': 'L'},
            {'code': 'L2', 'name': 'Long-term Liabilities', 'group_type': 'LIABILITY', 'nature': 'CREDIT', 'parent': 'L'},
            {'code': 'L3', 'name': 'Statutory Liabilities', 'group_type': 'LIABILITY', 'nature': 'CREDIT', 'parent': 'L'},
            # Equity
            {'code': 'E', 'name': 'Equity', 'group_type': 'EQUITY', 'nature': 'CREDIT', 'parent': None},
            # Income
            {'code': 'I', 'name': 'Income', 'group_type': 'INCOME', 'nature': 'CREDIT', 'parent': None},
            {'code': 'I1', 'name': 'Patient Revenue', 'group_type': 'INCOME', 'nature': 'CREDIT', 'parent': 'I'},
            {'code': 'I2', 'name': 'Other Income', 'group_type': 'INCOME', 'nature': 'CREDIT', 'parent': 'I'},
            # Expenses
            {'code': 'X', 'name': 'Expenses', 'group_type': 'EXPENSE', 'nature': 'DEBIT', 'parent': None},
            {'code': 'X1', 'name': 'Staff Expenses', 'group_type': 'EXPENSE', 'nature': 'DEBIT', 'parent': 'X'},
            {'code': 'X2', 'name': 'Medical Expenses', 'group_type': 'EXPENSE', 'nature': 'DEBIT', 'parent': 'X'},
            {'code': 'X3', 'name': 'Administrative Expenses', 'group_type': 'EXPENSE', 'nature': 'DEBIT', 'parent': 'X'},
            {'code': 'X4', 'name': 'Facility Expenses', 'group_type': 'EXPENSE', 'nature': 'DEBIT', 'parent': 'X'},
        ]

        group_map = {}
        for g in groups_data:
            parent = group_map.get(g['parent']) if g['parent'] else None
            obj, created = AccountGroup.objects.get_or_create(
                code=g['code'],
                defaults={
                    'name': g['name'],
                    'group_type': g['group_type'],
                    'nature': g['nature'],
                    'parent': parent,
                }
            )
            group_map[g['code']] = obj
            if created:
                self.stdout.write(f'  Created group: {g["code"]} - {g["name"]}')

        # ==================== Accounts (Chart of Accounts) ====================
        accounts_data = [
            # Assets
            {'code': '1001', 'name': 'Cash in Hand', 'group': 'A1', 'system': True},
            {'code': '1002', 'name': 'Bank Account - Primary', 'group': 'A1', 'system': True},
            {'code': '1003', 'name': 'Bank Account - Salary', 'group': 'A1'},
            {'code': '1004', 'name': 'Petty Cash', 'group': 'A1'},
            {'code': '1010', 'name': 'Patient Advances Received', 'group': 'A1'},
            {'code': '1101', 'name': 'Accounts Receivable - Patients', 'group': 'A3', 'system': True},
            {'code': '1102', 'name': 'Accounts Receivable - Insurance', 'group': 'A3'},
            {'code': '1103', 'name': 'TDS Receivable', 'group': 'A3'},
            {'code': '1201', 'name': 'Medical Equipment', 'group': 'A2'},
            {'code': '1202', 'name': 'Furniture & Fixtures', 'group': 'A2'},
            {'code': '1203', 'name': 'IT Equipment & Software', 'group': 'A2'},
            {'code': '1204', 'name': 'Vehicles (Ambulances)', 'group': 'A2'},
            {'code': '1205', 'name': 'Building & Infrastructure', 'group': 'A2'},
            {'code': '1210', 'name': 'Accumulated Depreciation', 'group': 'A2'},
            {'code': '1301', 'name': 'Medicine Inventory', 'group': 'A1'},
            {'code': '1302', 'name': 'Medical Supplies Inventory', 'group': 'A1'},

            # Liabilities
            {'code': '2001', 'name': 'Accounts Payable - Vendors', 'group': 'L1', 'system': True},
            {'code': '2002', 'name': 'Salary Payable', 'group': 'L1'},
            {'code': '2003', 'name': 'Patient Advance (Liability)', 'group': 'L1'},
            {'code': '2004', 'name': 'Security Deposits', 'group': 'L1'},
            {'code': '2101', 'name': 'GST Payable (CGST)', 'group': 'L3'},
            {'code': '2102', 'name': 'GST Payable (SGST)', 'group': 'L3'},
            {'code': '2103', 'name': 'GST Payable (IGST)', 'group': 'L3'},
            {'code': '2104', 'name': 'TDS Payable', 'group': 'L3'},
            {'code': '2105', 'name': 'PF Payable', 'group': 'L3'},
            {'code': '2106', 'name': 'ESI Payable', 'group': 'L3'},
            {'code': '2107', 'name': 'Professional Tax Payable', 'group': 'L3'},
            {'code': '2201', 'name': 'Bank Loan', 'group': 'L2'},
            {'code': '2202', 'name': 'Equipment Loan', 'group': 'L2'},

            # Equity
            {'code': '3001', 'name': 'Capital Account', 'group': 'E', 'system': True},
            {'code': '3002', 'name': 'Retained Earnings', 'group': 'E', 'system': True},
            {'code': '3003', 'name': 'Current Year Profit/Loss', 'group': 'E'},

            # Income
            {'code': '4001', 'name': 'Consultation Fee Revenue', 'group': 'I1', 'system': True},
            {'code': '4002', 'name': 'Lab Test Revenue', 'group': 'I1'},
            {'code': '4003', 'name': 'Pharmacy Revenue', 'group': 'I1'},
            {'code': '4004', 'name': 'Room/Bed Charge Revenue', 'group': 'I1'},
            {'code': '4005', 'name': 'Surgery/Procedure Revenue', 'group': 'I1'},
            {'code': '4006', 'name': 'Radiology Revenue', 'group': 'I1'},
            {'code': '4007', 'name': 'Emergency Revenue', 'group': 'I1'},
            {'code': '4008', 'name': 'Insurance Revenue', 'group': 'I1'},
            {'code': '4009', 'name': 'Other Medical Revenue', 'group': 'I1'},
            {'code': '4101', 'name': 'Interest Income', 'group': 'I2'},
            {'code': '4102', 'name': 'Canteen Revenue', 'group': 'I2'},
            {'code': '4103', 'name': 'Ambulance Revenue', 'group': 'I2'},
            {'code': '4104', 'name': 'Miscellaneous Income', 'group': 'I2'},

            # Expenses
            {'code': '5001', 'name': 'Salaries & Wages', 'group': 'X1', 'system': True},
            {'code': '5002', 'name': 'Employer PF Contribution', 'group': 'X1'},
            {'code': '5003', 'name': 'Employer ESI Contribution', 'group': 'X1'},
            {'code': '5004', 'name': 'Staff Bonus', 'group': 'X1'},
            {'code': '5005', 'name': 'Staff Training & Development', 'group': 'X1'},
            {'code': '5006', 'name': 'Staff Welfare', 'group': 'X1'},
            {'code': '5007', 'name': 'Consultant/Contract Fees', 'group': 'X1'},
            {'code': '5101', 'name': 'Medicines & Drugs', 'group': 'X2'},
            {'code': '5102', 'name': 'Medical Consumables & Supplies', 'group': 'X2'},
            {'code': '5103', 'name': 'Lab Reagents & Chemicals', 'group': 'X2'},
            {'code': '5104', 'name': 'Blood Bank Expenses', 'group': 'X2'},
            {'code': '5105', 'name': 'Surgical Supplies', 'group': 'X2'},
            {'code': '5106', 'name': 'Radiology Consumables', 'group': 'X2'},
            {'code': '5201', 'name': 'Rent & Lease', 'group': 'X3'},
            {'code': '5202', 'name': 'Insurance Premium', 'group': 'X3'},
            {'code': '5203', 'name': 'Legal & Professional Fees', 'group': 'X3'},
            {'code': '5204', 'name': 'Marketing & Advertising', 'group': 'X3'},
            {'code': '5205', 'name': 'Printing & Stationery', 'group': 'X3'},
            {'code': '5206', 'name': 'Telephone & Internet', 'group': 'X3'},
            {'code': '5207', 'name': 'IT & Software Expenses', 'group': 'X3'},
            {'code': '5208', 'name': 'Travel & Conveyance', 'group': 'X3'},
            {'code': '5209', 'name': 'Audit & Accounting Fees', 'group': 'X3'},
            {'code': '5210', 'name': 'Bank Charges', 'group': 'X3'},
            {'code': '5211', 'name': 'Miscellaneous Expenses', 'group': 'X3'},
            {'code': '5301', 'name': 'Electricity', 'group': 'X4'},
            {'code': '5302', 'name': 'Water Charges', 'group': 'X4'},
            {'code': '5303', 'name': 'Gas (Medical & Kitchen)', 'group': 'X4'},
            {'code': '5304', 'name': 'Equipment Maintenance', 'group': 'X4'},
            {'code': '5305', 'name': 'Building Maintenance', 'group': 'X4'},
            {'code': '5306', 'name': 'Housekeeping & Laundry', 'group': 'X4'},
            {'code': '5307', 'name': 'Food & Catering', 'group': 'X4'},
            {'code': '5308', 'name': 'Security Services', 'group': 'X4'},
            {'code': '5309', 'name': 'Waste Management & Disposal', 'group': 'X4'},
            {'code': '5310', 'name': 'Depreciation', 'group': 'X4'},
        ]

        for a in accounts_data:
            group = group_map[a['group']]
            _, created = Account.objects.get_or_create(
                code=a['code'],
                defaults={
                    'name': a['name'],
                    'account_group': group,
                    'is_system': a.get('system', False),
                }
            )
            if created:
                self.stdout.write(f'  Created account: {a["code"]} - {a["name"]}')

        # ==================== Default Fiscal Year ====================
        today = date.today()
        fy_start = date(today.year, 4, 1) if today.month >= 4 else date(today.year - 1, 4, 1)
        fy_end = date(fy_start.year + 1, 3, 31)
        fy_name = f"FY {fy_start.year}-{str(fy_end.year)[2:]}"

        fy, created = FiscalYear.objects.get_or_create(
            name=fy_name,
            defaults={'start_date': fy_start, 'end_date': fy_end, 'is_active': True}
        )
        if created:
            self.stdout.write(f'  Created fiscal year: {fy_name}')
            # Generate periods
            import calendar
            from dateutil.relativedelta import relativedelta
            current = fy_start
            for i in range(1, 13):
                last_day = calendar.monthrange(current.year, current.month)[1]
                end = current.replace(day=last_day)
                if end > fy_end:
                    end = fy_end
                FiscalYear.objects.get(name=fy_name)
                from accounting.models import FiscalPeriod
                FiscalPeriod.objects.get_or_create(
                    fiscal_year=fy,
                    period_number=i,
                    defaults={
                        'name': current.strftime('%B %Y'),
                        'start_date': current,
                        'end_date': end,
                    }
                )
                current = current + relativedelta(months=1)
                current = current.replace(day=1)
                if current > fy_end:
                    break

        # ==================== Default Tax Config ====================
        taxes = [
            {'name': 'CGST on Healthcare', 'tax_type': 'CGST', 'rate': 9, 'hsn_sac_code': '9993'},
            {'name': 'SGST on Healthcare', 'tax_type': 'SGST', 'rate': 9, 'hsn_sac_code': '9993'},
            {'name': 'CGST on Medicines', 'tax_type': 'CGST', 'rate': 6, 'hsn_sac_code': '3004'},
            {'name': 'SGST on Medicines', 'tax_type': 'SGST', 'rate': 6, 'hsn_sac_code': '3004'},
            {'name': 'TDS - Salary', 'tax_type': 'TDS', 'rate': 10, 'hsn_sac_code': '192'},
            {'name': 'TDS - Contract', 'tax_type': 'TDS', 'rate': 2, 'hsn_sac_code': '194C'},
            {'name': 'TDS - Rent', 'tax_type': 'TDS', 'rate': 10, 'hsn_sac_code': '194I'},
            {'name': 'Professional Tax - Slab 1', 'tax_type': 'PROFESSIONAL_TAX', 'rate': 200, 'hsn_sac_code': ''},
        ]
        for t in taxes:
            _, created = TaxConfiguration.objects.get_or_create(
                name=t['name'],
                defaults={
                    'tax_type': t['tax_type'],
                    'rate': t['rate'],
                    'hsn_sac_code': t['hsn_sac_code'],
                    'effective_from': date(2024, 4, 1),
                }
            )
            if created:
                self.stdout.write(f'  Created tax: {t["name"]} - {t["rate"]}%')

        # Summary
        self.stdout.write(f'\n  Account Groups: {AccountGroup.objects.count()}')
        self.stdout.write(f'  Accounts (CoA): {Account.objects.count()}')
        self.stdout.write(f'  Tax Configurations: {TaxConfiguration.objects.count()}')
        self.stdout.write(f'  Fiscal Year: {fy_name}\n')
        self.stdout.write(self.style.SUCCESS('  Chart of Accounts setup complete!\n'))
