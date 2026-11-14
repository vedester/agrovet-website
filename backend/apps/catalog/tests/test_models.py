import io
from decimal import Decimal
from pathlib import Path

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from PIL import Image

from apps.catalog.models import Category, Product, ProductImage

pytestmark = pytest.mark.django_db


def make_image(name="photo.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), "green").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


@pytest.fixture
def category():
    return Category.objects.create(name="Veterinary Drugs")


@pytest.fixture
def product(category):
    return Product.objects.create(
        category=category,
        name="Ivermectin 1% Injection",
        sku="vet-001",
        pack_size="50 ml",
        price=Decimal("650.00"),
    )


def test_category_slug_is_generated_and_unique():
    first = Category.objects.create(name="Seeds & Grains")
    second = Category.objects.create(name="Seeds Grains")
    assert first.slug == "seeds-grains"
    assert second.slug == "seeds-grains-2"


def test_category_depth_rules():
    feeds = Category.objects.create(name="Animal Feeds")
    dairy = Category.objects.create(name="Dairy Meal", parent=feeds)
    dairy.clean()  # two levels is fine

    too_deep = Category(name="Premium Dairy Meal", parent=dairy)
    with pytest.raises(ValidationError):
        too_deep.clean()

    feeds.parent = feeds
    with pytest.raises(ValidationError):
        feeds.clean()

    poultry = Category.objects.create(name="Poultry")
    feeds.parent = poultry  # feeds already has a child (dairy)
    with pytest.raises(ValidationError):
        feeds.clean()


def test_product_slug_is_generated_unique_and_stable(category, product):
    assert product.slug == "ivermectin-1-injection-50-ml"

    twin = Product.objects.create(
        category=category,
        name="Ivermectin 1% Injection",
        sku="VET-002",
        pack_size="50 ml",
        price=Decimal("700"),
    )
    assert twin.slug == "ivermectin-1-injection-50-ml-2"

    product.name = "Ivermectin 1% Injectable"
    product.save()
    assert product.slug == "ivermectin-1-injection-50-ml"


def test_sku_is_normalised_and_unique(category, product):
    assert product.sku == "VET-001"
    with pytest.raises(IntegrityError), transaction.atomic():
        Product.objects.create(
            category=category, name="Other", sku="Vet-001", price=Decimal("1")
        )


def test_stock_quantity_drives_availability(product):
    product.stock_quantity = 5
    product.save()
    assert product.is_in_stock is True

    product.stock_quantity = 0
    product.save()
    assert product.is_in_stock is False


def test_stock_sync_survives_update_fields(product):
    product.stock_quantity = 0
    product.save(update_fields=["stock_quantity"])
    product.refresh_from_db()
    assert product.is_in_stock is False


def test_untracked_stock_uses_manual_flag(product):
    product.stock_quantity = None
    product.is_in_stock = False
    product.save()
    product.refresh_from_db()
    assert product.stock_quantity is None
    assert product.is_in_stock is False


def test_negative_price_is_rejected(product):
    product.price = Decimal("-5")
    with pytest.raises(ValidationError):
        product.full_clean()

    with pytest.raises(IntegrityError), transaction.atomic():
        Product.objects.filter(pk=product.pk).update(price=Decimal("-1"))


def test_category_with_products_cannot_be_deleted(category, product):
    with pytest.raises(ProtectedError):
        category.delete()


def test_image_extension_is_validated(product):
    image = ProductImage(product=product, image=make_image("scan.gif"))
    with pytest.raises(ValidationError) as error:
        image.full_clean()
    assert "image" in error.value.message_dict


def test_images_are_ordered_and_first_is_cover(product):
    second = ProductImage.objects.create(
        product=product, image=make_image("b.png"), position=2
    )
    first = ProductImage.objects.create(
        product=product, image=make_image("a.png"), position=1
    )
    assert list(product.images.all()) == [first, second]
    assert product.cover_image == first


def test_deleting_image_removes_file(product, django_capture_on_commit_callbacks):
    image = ProductImage.objects.create(product=product, image=make_image())
    path = Path(image.image.path)
    assert path.exists()

    with django_capture_on_commit_callbacks(execute=True):
        image.delete()
    assert not path.exists()
