from django.urls import path

from apps.orders.views import (
    StaffOrderDetailView,
    StaffOrderListView,
    StaffOrderTransitionView,
)

urlpatterns = [
    path(
        "",
        StaffOrderListView.as_view(),
        name="staff-orders",
    ),
    path(
        "<int:pk>/",
        StaffOrderDetailView.as_view(),
        name="staff-order-detail",
    ),
    path(
        "<int:pk>/transition/",
        StaffOrderTransitionView.as_view(),
        name="staff-order-transition",
    ),
]
