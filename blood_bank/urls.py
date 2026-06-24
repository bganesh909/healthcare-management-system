from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BloodDonorViewSet, BloodUnitViewSet, BloodRequestViewSet, CrossMatchViewSet

router = DefaultRouter()
router.register(r'donors', BloodDonorViewSet)
router.register(r'units', BloodUnitViewSet)
router.register(r'requests', BloodRequestViewSet)
router.register(r'cross-matches', CrossMatchViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
