import re
import uuid
from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.validators import (
    FileExtensionValidator,
    MinValueValidator,
    RegexValidator,
)
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel
from apps.core.utils import unique_slugify
from apps.core.validators import validate_image_size

IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]

IMAGE_VALIDATORS = [
    FileExtensionValidator(IMAGE_EXTENSIONS),
    validate_image_size,
]

SKU_VALIDATOR = RegexValidator(
    regex=r"^[A-Z0-9][A-Z0-9._-]*$",
    message="SKU may contain only letters, digits, dots, dashes and underscores.",
    flags=re.IGNORECASE,
)


def category_image_path(instance, filename: str) -> str:
    return f"categories/{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


def product_image_path(instance, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return f"products/{instance.product_id}/{uuid.uuid4().hex}{ext}"


class Category(TimeStampedModel):
    """A product group, e.g. "Animal Feeds" with child "Dairy Meal".

    Only two levels are supported (top-level and sub-category).
    """

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    description = models.TextField(blank=True)
    image = models.ImageField(
        upload_to=category_image_path, blank=True, validators=IMAGE_VALIDATORS
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name

    def clean(self):
        super().clean()
        if not self.parent_id:
            return
        if self.pk and self.parent_id == self.pk:
            raise ValidationError({"parent": "A category cannot be its own parent."})
        if self.parent.parent_id:
            raise ValidationError(
                {"parent": "Only two category levels are supported."}
            )
        if self.pk and self.children.exists():
            raise ValidationError(
                {"parent": "This category has sub-categories, so it cannot "
                           "become a sub-category itself."}
            )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.name)
        super().save(*args, **kwargs)


class Product(TimeStampedModel):
    """A sellable item in one pack size, identified by a unique SKU."""

    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    sku = models.CharField(max_length=40, unique=True, validators=[SKU_VALIDATOR])
    brand = models.CharField(max_length=100, blank=True, db_index=True)
    pack_size = models.CharField(
        max_length=50,
        blank=True,
        help_text='e.g. "50 kg bag", "100 ml", "1 litre"',
    )
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Price in KES.",
    )

    # Stock rule (enforced in save()):
    #   stock_quantity set  -> is_in_stock is derived (quantity > 0)
    #   stock_quantity None -> quantity is not tracked; is_in_stock is manual
    stock_quantity = models.PositiveIntegerField(null=True, blank=True)
    is_in_stock = models.BooleanField(default=True)

    requires_advice = models.BooleanField(
        default=False,
        help_text="Show a 'consult before use' notice (vet drugs, agrochemicals).",
    )
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(
        default=True, help_text="Untick to hide from the public site."
    )

    class Meta:
        ordering = ["name", "id"]
        indexes = [
            models.Index(fields=["is_active", "category"], name="product_active_cat_idx"),
            models.Index(fields=["is_active", "is_featured"], name="product_active_feat_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(price__gte=0), name="product_price_gte_0"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.pack_size})" if self.pack_size else self.name

    def save(self, *args, **kwargs):
        self.sku = self.sku.strip().upper()
        if not self.slug:
            self.slug = unique_slugify(self, f"{self.name} {self.pack_size}")
        if self.stock_quantity is not None:
            self.is_in_stock = self.stock_quantity > 0

        update_fields = kwargs.get("update_fields")
        if update_fields is not None and "stock_quantity" in update_fields:
            kwargs["update_fields"] = set(update_fields) | {"is_in_stock"}

        super().save(*args, **kwargs)

    @property
    def cover_image(self):
        """First image by position. Uses the prefetch cache when available."""
        images = list(self.images.all())
        return images[0] if images else None


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(
        upload_to=product_image_path, validators=IMAGE_VALIDATORS
    )
    alt_text = models.CharField(max_length=200, blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
        indexes = [
            models.Index(fields=["product", "position"], name="pimage_product_pos_idx"),
        ]

    def __str__(self) -> str:
        return f"Image {self.pk} for {self.product_id}"
