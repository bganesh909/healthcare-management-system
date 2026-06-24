from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PrescriptionViewSet, MedicalRecordViewSet,
    DrugInteractionViewSet, PrescriptionTemplateViewSet,
)

router = DefaultRouter()
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'medical-records', MedicalRecordViewSet)
router.register(r'drug-interactions', DrugInteractionViewSet)
router.register(r'prescription-templates', PrescriptionTemplateViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
