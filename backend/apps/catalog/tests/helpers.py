import io
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.catalog.models import Product


def make_image(name="photo.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), "green").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def make_product(category, sku, name="Test Product", **fields):
    fields.setdefault("pack_size", "1 kg")
    fields.setdefault("price", Decimal("100.00"))
    return Product.objects.create(category=category, sku=sku, name=name, **fields)


def make_upload(name, size=(10, 10), fmt="PNG", mode="RGB", **save_kwargs):
    """Build an uploadable image of any size, format and mode."""
    buffer = io.BytesIO()
    colour = "green" if mode == "RGB" else (0, 128, 0, 128)
    Image.new(mode, size, colour).save(buffer, format=fmt, **save_kwargs)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{fmt.lower()}")
