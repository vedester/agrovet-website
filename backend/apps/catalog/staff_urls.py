from django.urls import path
from rest_framework.routers import SimpleRouter

from .staff_views import (
    ProductImageDetailView,
    ProductImageListCreateView,
    ProductImageReorderView,
    StaffCategoryViewSet,
    StaffProductViewSet,
)

router = SimpleRouter()
router.register("categories", StaffCategoryViewSet, basename="staff-category")
router.register("products", StaffProductViewSet, basename="staff-product")

urlpatterns = [
    path(
        "products/<int:product_id>/images/",
        ProductImageListCreateView.as_view(),
        name="staff-product-image-list",
    ),
    path(
        "products/<int:product_id>/images/reorder/",
        ProductImageReorderView.as_view(),
        name="staff-product-image-reorder",
    ),
    path(
        "products/<int:product_id>/images/<int:pk>/",
        ProductImageDetailView.as_view(),
        name="staff-product-image-detail",
    ),
    *router.urls,
]
