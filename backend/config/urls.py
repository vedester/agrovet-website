# backend/config/urls.py
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

def api_root(_request):
    return JsonResponse(
        {
            "message": "Welcome to the Agrovet API.",
            "status": "success",
            "health_check": "/api/v1/health/",
        }
    )

def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/orders/", include("apps.orders.customer_urls")),
    path("api/v1/catalog/", include("apps.catalog.urls")),
    path("api/v1/admin/catalog/", include("apps.catalog.staff_urls")),
    path("api/v1/admin/inventory/", include("apps.inventory.urls")),
    path("api/v1/admin/orders/", include("apps.orders.urls")),
    path("api/v1/admin/imports/", include("apps.product_imports.urls")),
    path("api/v1/site/", include("apps.website.urls")),
    path("api/v1/admin/site/", include("apps.website.staff_urls")),
    
]

if settings.DEBUG:
    # In production the web server serves /media/ directly.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
