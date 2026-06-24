from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, DoctorReviewViewSet

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet)
router.register(r'doctor-reviews', DoctorReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
