from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, WardViewSet, BedViewSet

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'wards', WardViewSet, basename='ward')
router.register(r'beds', BedViewSet, basename='bed')

urlpatterns = [
    path('', include(router.urls)),
]
