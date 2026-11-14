from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/catalog/", include("apps.catalog.urls")),
    path("api/v1/admin/catalog/", include("apps.catalog.staff_urls")),
    path("api/v1/admin/imports/", include("apps.product_imports.urls")),
]

if settings.DEBUG:
    # In production the web server serves /media/ directly.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
