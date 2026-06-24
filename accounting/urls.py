from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'fiscal-years', views.FiscalYearViewSet)
router.register(r'account-groups', views.AccountGroupViewSet)
router.register(r'accounts', views.AccountViewSet)
router.register(r'journal-entries', views.JournalEntryViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'budgets', views.BudgetViewSet)
router.register(r'tax-config', views.TaxConfigViewSet)
router.register(r'patient-advances', views.PatientAdvanceViewSet)
router.register(r'daily-collections', views.DailyCollectionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Financial Reports
    path('reports/trial-balance/', views.TrialBalanceView.as_view(), name='trial-balance'),
    path('reports/profit-loss/', views.ProfitLossView.as_view(), name='profit-loss'),
    path('reports/balance-sheet/', views.BalanceSheetView.as_view(), name='balance-sheet'),
    path('reports/cash-flow/', views.CashFlowView.as_view(), name='cash-flow'),
    path('reports/ar-aging/', views.ARAgingView.as_view(), name='ar-aging'),
    path('reports/dashboard/', views.FinancialDashboardView.as_view(), name='financial-dashboard'),
    path('reports/revenue-forecast/', views.RevenueForecastView.as_view(), name='revenue-forecast'),
    path('reports/department-pl/', views.DepartmentPLView.as_view(), name='department-pl'),
    path('reports/doctor-scorecard/', views.DoctorScorecardView.as_view(), name='doctor-scorecard'),
    path('reports/gst/', views.GSTReportView.as_view(), name='gst-report'),
    path('reports/day-end-closing/', views.DayEndClosingView.as_view(), name='day-end-closing'),
]
