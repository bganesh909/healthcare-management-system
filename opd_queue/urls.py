from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QueueEntryViewSet, QueueDisplayViewSet

router = DefaultRouter()
router.register(r'entries', QueueEntryViewSet)
router.register(r'displays', QueueDisplayViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
