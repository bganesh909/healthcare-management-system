from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetCategoryViewSet,
    AssetViewSet,
    MaintenanceLogViewSet,
    VendorViewSet,
    PurchaseOrderViewSet,
    PurchaseOrderItemViewSet,
    GoodsReceivedNoteViewSet,
    GRNItemViewSet,
    VendorPaymentViewSet,
)

router = DefaultRouter()
router.register(r'categories', AssetCategoryViewSet)
router.register(r'assets', AssetViewSet)
router.register(r'maintenance-logs', MaintenanceLogViewSet)
router.register(r'vendors', VendorViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'purchase-order-items', PurchaseOrderItemViewSet)
router.register(r'grns', GoodsReceivedNoteViewSet)
router.register(r'grn-items', GRNItemViewSet)
router.register(r'vendor-payments', VendorPaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
