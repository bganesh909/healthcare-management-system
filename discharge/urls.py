from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DischargeSummaryViewSet, FollowUpViewSet, ReadmissionViewSet

router = DefaultRouter()
router.register(r'discharge-summaries', DischargeSummaryViewSet)
router.register(r'follow-ups', FollowUpViewSet)
router.register(r'readmissions', ReadmissionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
