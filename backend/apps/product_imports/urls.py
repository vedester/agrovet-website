from django.urls import path

from .views import ProductImportHistoryView, ProductImportTemplateView, ProductImportView

urlpatterns = [
    path("products/", ProductImportView.as_view(), name="product-import"),
    path("products/template/", ProductImportTemplateView.as_view(), name="product-import-template"),
    path("products/history/", ProductImportHistoryView.as_view(), name="product-import-history"),
]
