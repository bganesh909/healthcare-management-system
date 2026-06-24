from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StaffMemberViewSet, AttendanceViewSet, ShiftScheduleViewSet,
    LeaveRequestViewSet, PayrollViewSet,
    SalaryStructureViewSet, SalaryRevisionViewSet, StaffLoanViewSet,
    ShiftHandoverViewSet,
)

router = DefaultRouter()
router.register(r'staff-members', StaffMemberViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'shift-schedules', ShiftScheduleViewSet)
router.register(r'leave-requests', LeaveRequestViewSet)
router.register(r'payroll', PayrollViewSet)
router.register(r'salary-structures', SalaryStructureViewSet)
router.register(r'salary-revisions', SalaryRevisionViewSet)
router.register(r'staff-loans', StaffLoanViewSet)
router.register(r'shift-handovers', ShiftHandoverViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
