from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class ProductImport(TimeStampedModel):
    """Audit record of an import that was actually applied (previews leave none)."""

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="product_imports",
    )
    filename = models.CharField(max_length=255)
    created_count = models.PositiveIntegerField(default=0)
    updated_count = models.PositiveIntegerField(default=0)
    unchanged_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    report = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.filename} ({self.created_at:%Y-%m-%d %H:%M})"
