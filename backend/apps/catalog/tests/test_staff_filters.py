import pytest

from apps.catalog.models import ProductImage
from apps.catalog.tests.helpers import make_image, make_product

pytestmark = pytest.mark.django_db

PRODUCTS = "/api/v1/admin/catalog/products/"


def skus(response):
    return sorted(item["sku"] for item in response.data["results"])


def test_has_image_filter_finds_products_without_photos(staff_client, category):
    with_photos = make_product(category, "WITH-1")
    make_product(category, "WITHOUT-1")
    ProductImage.objects.create(product=with_photos, image=make_image())
    ProductImage.objects.create(product=with_photos, image=make_image("b.png"), position=1)

    assert skus(staff_client.get(PRODUCTS)) == ["WITH-1", "WITHOUT-1"]
    assert skus(staff_client.get(PRODUCTS, {"has_image": "false"})) == ["WITHOUT-1"]
    assert skus(staff_client.get(PRODUCTS, {"has_image": "true"})) == ["WITH-1"]
