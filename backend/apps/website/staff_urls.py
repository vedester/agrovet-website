from django.urls import path

from .views import StaffSiteSettingsView

urlpatterns = [
    path("", StaffSiteSettingsView.as_view(), name="staff-site-settings"),
]
