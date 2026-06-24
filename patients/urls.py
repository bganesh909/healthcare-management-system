from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet, PatientDocumentViewSet, FamilyGroupViewSet, FamilyMemberViewSet,
    PatientHealthTimelineView, PatientHealthReportView,
)

router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'patient-documents', PatientDocumentViewSet)
router.register(r'family-groups', FamilyGroupViewSet)
router.register(r'family-members', FamilyMemberViewSet)

urlpatterns = [
    path('patients/health-timeline/', PatientHealthTimelineView.as_view(), name='patient-health-timeline'),
    path('patients/health-report/', PatientHealthReportView.as_view(), name='patient-health-report'),
    path('', include(router.urls)),
]
