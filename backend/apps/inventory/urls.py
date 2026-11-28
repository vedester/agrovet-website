from django.urls import path

from apps.inventory.views import (
    StaffInventoryListView,
    StaffInventoryMovementListView,
    StaffProductRestockView,
    StaffProductStockAdjustmentView,
    StaffProductStockTrackingView,
)

urlpatterns = [
    path(
        "products/",
        StaffInventoryListView.as_view(),
        name="staff-inventory-products",
    ),
    path(
        "products/<int:product_id>/restock/",
        StaffProductRestockView.as_view(),
        name="staff-inventory-restock",
    ),
    path(
        "products/<int:product_id>/adjust/",
        StaffProductStockAdjustmentView.as_view(),
        name="staff-inventory-adjust",
    ),
    path(
        "movements/",
        StaffInventoryMovementListView.as_view(),
        name="staff-inventory-movements",
    ),

    path(
    "products/<int:product_id>/tracking/",
    StaffProductStockTrackingView.as_view(),
    name="staff-inventory-tracking",
),

]
