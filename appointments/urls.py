from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, TimeSlotViewSet, DoctorLeaveViewSet, PatientFeedbackViewSet, ConsentFormViewSet

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet)
router.register(r'time-slots', TimeSlotViewSet)
router.register(r'doctor-leaves', DoctorLeaveViewSet)
router.register(r'patient-feedback', PatientFeedbackViewSet)
router.register(r'consent-forms', ConsentFormViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
