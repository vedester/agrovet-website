
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStaffUser
from apps.core.views import PublicReadOnlyMixin

from .models import SiteSettings
from .serializers import PublicSiteSettingsSerializer, StaffSiteSettingsSerializer


class PublicSiteSettingsView(PublicReadOnlyMixin, APIView):
    def get(self, request):
        return Response(PublicSiteSettingsSerializer(SiteSettings.current()).data)


class StaffSiteSettingsView(RetrieveUpdateAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = StaffSiteSettingsSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return SiteSettings.load()
