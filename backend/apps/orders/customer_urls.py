from django.urls import path

from apps.orders.customer_views import (
    CustomerOrderCreateView,
    CustomerOrderDetailView,
    CustomerOrderListView,
)

urlpatterns = [
    path(
        "",
        CustomerOrderCreateView.as_view(),
        name="customer-order-create",
    ),
    path(
        "mine/",
        CustomerOrderListView.as_view(),
        name="customer-order-list",
    ),
    path(
        "<str:reference>/",
        CustomerOrderDetailView.as_view(),
        name="customer-order-detail",
    ),
]
