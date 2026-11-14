from django.urls import path

from .views import CategoryTreeView, ProductDetailView, ProductListView

app_name = "catalog"

urlpatterns = [
    path("categories/", CategoryTreeView.as_view(), name="category-tree"),
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
]
