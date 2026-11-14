from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel

from .phone import normalise_whatsapp
from .validators import default_opening_hours, https_url, validate_opening_hours

SINGLETON_ID = 1

phone_display = RegexValidator(
    r"^[0-9+()\-\s]{7,25}$", "Use digits, spaces, + ( ) and - only."
)


class SiteSettings(TimeStampedModel):
    """The single row of business details shown across the storefront.

    Everything in this model is PUBLIC: the storefront API serves it without
    authentication. Never add private or internal fields here.
    """

    # A fixed small-integer key, not an auto-increment column: MySQL does not
    # allow CHECK constraints on AUTO_INCREMENT columns.
    id = models.PositiveSmallIntegerField(
        primary_key=True, default=SINGLETON_ID, editable=False
    )

    business_name = models.CharField(max_length=120, blank=True)
    tagline = models.CharField(max_length=160, blank=True)
    about_text = models.TextField(blank=True)

    phone = models.CharField(max_length=30, blank=True, validators=[phone_display])
    whatsapp_number = models.CharField(
        max_length=15,
        blank=True,
        help_text="Stored as digits in international form, e.g. 254712345678.",
    )
    whatsapp_greeting = models.CharField(
        max_length=200, blank=True, default="Hello, I would like to order:"
    )
    email = models.EmailField(blank=True)

    address = models.CharField(max_length=255, blank=True)
    google_maps_url = models.URLField(max_length=500, blank=True, validators=[https_url])
    opening_hours = models.JSONField(
        default=default_opening_hours, validators=[validate_opening_hours]
    )
    hours_note = models.CharField(max_length=160, blank=True)

    facebook_url = models.URLField(max_length=300, blank=True, validators=[https_url])
    instagram_url = models.URLField(max_length=300, blank=True, validators=[https_url])
    tiktok_url = models.URLField(max_length=300, blank=True, validators=[https_url])

    order_note = models.CharField(
        max_length=300,
        blank=True,
        default="We confirm availability, final prices, payment and delivery with you on WhatsApp.",
    )
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=160, blank=True)

    class Meta:
        verbose_name = "site settings"
        verbose_name_plural = "site settings"
        constraints = [
            models.CheckConstraint(condition=Q(id=SINGLETON_ID), name="site_settings_single_row"),
        ]

    def __str__(self) -> str:
        return self.business_name or "Site settings"

    def save(self, *args, **kwargs):
        self.id = SINGLETON_ID
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("Site settings cannot be deleted. Edit them instead.")

    def clean(self):
        super().clean()
        if self.whatsapp_number:
            try:
                self.whatsapp_number = normalise_whatsapp(self.whatsapp_number)
            except ValueError as exc:
                raise ValidationError({"whatsapp_number": str(exc)}) from exc

    @classmethod
    def current(cls):
        """The settings for reading: never writes. Unsaved defaults if none exist yet."""
        return cls.objects.filter(pk=SINGLETON_ID).first() or cls()

    @classmethod
    def load(cls):
        """The settings for editing: creates the row on first use."""
        instance, _ = cls.objects.get_or_create(pk=SINGLETON_ID)
        return instance
