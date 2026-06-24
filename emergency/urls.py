from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmergencyVisitViewSet,
    AmbulanceViewSet,
    AmbulanceDispatchViewSet,
    EmergencyContactViewSet,
)

router = DefaultRouter()
router.register(r'visits', EmergencyVisitViewSet)
router.register(r'ambulances', AmbulanceViewSet)
router.register(r'ambulance-dispatches', AmbulanceDispatchViewSet)
router.register(r'contacts', EmergencyContactViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
