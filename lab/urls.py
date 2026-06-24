from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LabTestCategoryViewSet,
    LabTestViewSet,
    LabOrderViewSet,
    LabReportViewSet,
)

router = DefaultRouter()
router.register(r'categories', LabTestCategoryViewSet, basename='lab-category')
router.register(r'tests', LabTestViewSet, basename='lab-test')
router.register(r'orders', LabOrderViewSet, basename='lab-order')
router.register(r'reports', LabReportViewSet, basename='lab-report')

urlpatterns = [
    path('', include(router.urls)),
]
