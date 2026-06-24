from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OperationTheaterViewSet,
    SurgeryViewSet,
    SurgicalTeamViewSet,
    PreOpChecklistViewSet,
    PostOpNoteViewSet,
)

router = DefaultRouter()
router.register(r'theaters', OperationTheaterViewSet)
router.register(r'surgeries', SurgeryViewSet)
router.register(r'surgical-teams', SurgicalTeamViewSet)
router.register(r'pre-op-checklists', PreOpChecklistViewSet)
router.register(r'post-op-notes', PostOpNoteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
