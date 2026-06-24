from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VitalSignViewSet, ClinicalNoteViewSet, TreatmentPlanViewSet, AllergyViewSet

router = DefaultRouter()
router.register(r'vital-signs', VitalSignViewSet)
router.register(r'clinical-notes', ClinicalNoteViewSet)
router.register(r'treatment-plans', TreatmentPlanViewSet)
router.register(r'allergies', AllergyViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
