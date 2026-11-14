from django.urls import path

from .views import PublicSiteSettingsView

app_name = "website"

urlpatterns = [
    path("", PublicSiteSettingsView.as_view(), name="site-settings"),
]
