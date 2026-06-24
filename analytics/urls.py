from django.urls import path
from .views import (
    DashboardView, AppointmentAnalyticsView, DoctorAnalyticsView,
    PatientAnalyticsView, RevenueAnalyticsView, HospitalOverviewView
)
urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='analytics-dashboard'),
    path('appointments/', AppointmentAnalyticsView.as_view(), name='appointment-analytics'),
    path('doctors/', DoctorAnalyticsView.as_view(), name='doctor-analytics'),
    path('patients/', PatientAnalyticsView.as_view(), name='patient-analytics'),
    path('revenue/', RevenueAnalyticsView.as_view(), name='revenue-analytics'),
    path('hospital-overview/', HospitalOverviewView.as_view(), name='hospital-overview'),
]

