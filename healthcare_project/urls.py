from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="Healthcare API",
      default_version='v1',
      description="API for Healthcare Management System",
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email="contact@healthcare.local"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include([
        path('', include('patients.urls')),
        path('', include('doctors.urls')),
        path('', include('appointments.urls')),
        path('', include('users.urls')),
        path('analytics/', include('analytics.urls')),
        path('', include('prescriptions.urls')),
        path('', include('billing.urls')),
        path('', include('departments.urls')),
        path('pharmacy/', include('pharmacy.urls')),
        path('lab/', include('lab.urls')),
        path('', include('notifications.urls')),
        path('vitals/', include('vitals.urls')),
        path('blood-bank/', include('blood_bank.urls')),
        path('staff/', include('staff.urls')),
        path('radiology/', include('radiology.urls')),
        path('emergency/', include('emergency.urls')),
        path('ot/', include('operation_theater.urls')),
        path('inventory/', include('inventory.urls')),
        path('queue/', include('opd_queue.urls')),
        path('discharge/', include('discharge.urls')),
        path('accounting/', include('accounting.urls')),
        path('audit/', include('auditlog.urls')),
    ])),
    path('api-auth/', include('rest_framework.urls')),
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
