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
