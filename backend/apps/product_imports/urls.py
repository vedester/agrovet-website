from django.urls import path

from .photo_views import PhotoCheckView, PhotoUploadView
from .views import ProductImportHistoryView, ProductImportTemplateView, ProductImportView

urlpatterns = [
    path("products/", ProductImportView.as_view(), name="product-import"),
    path("products/template/", ProductImportTemplateView.as_view(), name="product-import-template"),
    path("products/history/", ProductImportHistoryView.as_view(), name="product-import-history"),
    path("photos/check/", PhotoCheckView.as_view(), name="photo-import-check"),
    path("photos/", PhotoUploadView.as_view(), name="photo-import"),
]
