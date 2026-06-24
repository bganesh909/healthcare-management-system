from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ImagingTypeViewSet, ImagingOrderViewSet, ImagingReportViewSet

router = DefaultRouter()
router.register(r'imaging-types', ImagingTypeViewSet)
router.register(r'imaging-orders', ImagingOrderViewSet)
router.register(r'imaging-reports', ImagingReportViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
