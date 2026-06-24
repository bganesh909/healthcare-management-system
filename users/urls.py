from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import UserViewSet, CustomTokenObtainPairView, password_reset_request, password_reset_confirm, google_oauth_login
router = DefaultRouter()
router.register(r'users', UserViewSet)
urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/register/', UserViewSet.as_view({'post': 'register'}), name='register'),
    path('auth/profile/', UserViewSet.as_view({'get': 'profile', 'patch': 'update_profile'}), name='profile'),
    path('auth/change-password/', UserViewSet.as_view({'post': 'change_password'}), name='change_password'),
    path('auth/forgot-password/', password_reset_request, name='password_reset_request'),
    path('auth/reset-password/', password_reset_confirm, name='password_reset_confirm'),
    path('auth/google/', google_oauth_login, name='google_oauth_login'),
]

