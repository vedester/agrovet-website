from rest_framework import serializers

from apps.core.serializers import ModelCleanSerializerMixin

from .models import SiteSettings
from .phone import normalise_whatsapp
from .validators import https_url, validate_opening_hours

BUSINESS_FIELDS = (
    "business_name",
    "tagline",
    "about_text",
    "phone",
    "whatsapp_number",
    "whatsapp_greeting",
    "email",
    "address",
    "google_maps_url",
    "opening_hours",
    "hours_note",
    "facebook_url",
    "instagram_url",
    "tiktok_url",
    "order_note",
    "seo_title",
    "seo_description",
)


def _whatsapp_url(obj) -> str:
    return f"https://wa.me/{obj.whatsapp_number}" if obj.whatsapp_number else ""


def _link_field(max_length: int) -> serializers.CharField:
    """A link that must start with https://.

    Declared explicitly because DRF replaces any URLValidator found on a model
    URLField with its own, which would quietly re-allow http:// links.
    """
    return serializers.CharField(
        max_length=max_length,
        allow_blank=True,
        required=False,
        validators=[https_url],
    )


class PublicSiteSettingsSerializer(serializers.ModelSerializer):
    """What the storefront sees. Every field here is public by design."""

    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = (*BUSINESS_FIELDS, "whatsapp_url")
        read_only_fields = fields

    def get_whatsapp_url(self, obj):
        return _whatsapp_url(obj)


class StaffSiteSettingsSerializer(ModelCleanSerializerMixin, serializers.ModelSerializer):
    opening_hours = serializers.JSONField(validators=[validate_opening_hours])
    google_maps_url = _link_field(500)
    facebook_url = _link_field(300)
    instagram_url = _link_field(300)
    tiktok_url = _link_field(300)
    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = (*BUSINESS_FIELDS, "whatsapp_url", "updated_at")
        read_only_fields = ("updated_at",)

    def get_whatsapp_url(self, obj):
        return _whatsapp_url(obj)

    def validate_whatsapp_number(self, value):
        if not value:
            return ""
        try:
            return normalise_whatsapp(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
