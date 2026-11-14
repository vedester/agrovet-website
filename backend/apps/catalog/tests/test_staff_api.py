from pathlib import Path

import pytest

from apps.catalog.models import Category, Product, ProductImage
from apps.catalog.tests.helpers import make_image, make_product

pytestmark = pytest.mark.django_db

BASE = "/api/v1/admin/catalog"
CATEGORIES = f"{BASE}/categories/"
PRODUCTS = f"{BASE}/products/"


def new_product_payload(category, **overrides):
    payload = {
        "category": category.id,
        "name": "Ivermectin 1% Injection",
        "sku": "vet-9",
        "pack_size": "50 ml",
        "price": "650.00",
    }
    payload.update(overrides)
    return payload


def skus(response):
    return sorted(item["sku"] for item in response.data["results"])


@pytest.mark.parametrize("url", [CATEGORIES, PRODUCTS, f"{PRODUCTS}1/images/"])
def test_staff_endpoints_require_staff(url, anon_client, plain_client):
    assert anon_client.get(url).status_code == 401
    assert plain_client.get(url).status_code == 403
    assert anon_client.post(url, {}, format="json").status_code == 401
    assert plain_client.post(url, {}, format="json").status_code == 403


def test_create_product_normalises_sku_and_generates_slug(staff_client, category):
    response = staff_client.post(
        PRODUCTS, new_product_payload(category, sku=" vet-9 "), format="json"
    )
    assert response.status_code == 201, response.data
    assert response.data["sku"] == "VET-9"
    assert response.data["slug"] == "ivermectin-1-injection-50-ml"
    assert response.data["price"] == "650.00"
    assert response.data["category_name"] == "Veterinary Drugs"
    assert response.data["images"] == []


def test_duplicate_sku_is_rejected_case_insensitively(staff_client, category):
    make_product(category, "VET-9")
    response = staff_client.post(
        PRODUCTS, new_product_payload(category, sku="vet-9"), format="json"
    )
    assert response.status_code == 400
    assert "sku" in response.data


def test_negative_price_is_rejected(staff_client, category):
    response = staff_client.post(
        PRODUCTS, new_product_payload(category, price="-5"), format="json"
    )
    assert response.status_code == 400
    assert "price" in response.data


def test_stock_quantity_drives_availability_and_conflicts_are_rejected(
    staff_client, category
):
    created = staff_client.post(
        PRODUCTS, new_product_payload(category, stock_quantity=0), format="json"
    )
    assert created.status_code == 201, created.data
    assert created.data["is_in_stock"] is False
    url = f"{PRODUCTS}{created.data['id']}/"

    restocked = staff_client.patch(url, {"stock_quantity": 5}, format="json")
    assert restocked.data["is_in_stock"] is True

    conflict = staff_client.patch(
        url, {"stock_quantity": 5, "is_in_stock": False}, format="json"
    )
    assert conflict.status_code == 400
    assert "is_in_stock" in conflict.data

    manual = staff_client.patch(
        url, {"stock_quantity": None, "is_in_stock": False}, format="json"
    )
    assert manual.status_code == 200
    assert manual.data["stock_quantity"] is None
    assert manual.data["is_in_stock"] is False


def test_staff_list_includes_inactive_products_and_filters(staff_client, category):
    make_product(category, "ON-1")
    make_product(category, "OFF-1", is_active=False)

    assert skus(staff_client.get(PRODUCTS)) == ["OFF-1", "ON-1"]
    assert skus(staff_client.get(PRODUCTS, {"is_active": "false"})) == ["OFF-1"]
    assert skus(staff_client.get(PRODUCTS, {"search": "off-1"})) == ["OFF-1"]


def test_renaming_a_product_keeps_its_slug(staff_client, product):
    original = product.slug
    response = staff_client.patch(
        f"{PRODUCTS}{product.id}/", {"name": "Ivermectin Gold"}, format="json"
    )
    assert response.status_code == 200
    assert response.data["name"] == "Ivermectin Gold"
    assert response.data["slug"] == original


def test_deleting_a_product_removes_its_image_files(
    staff_client, category, django_capture_on_commit_callbacks
):
    product = make_product(category, "DEL-1")
    image = ProductImage.objects.create(product=product, image=make_image())
    path = Path(image.image.path)
    assert path.exists()

    with django_capture_on_commit_callbacks(execute=True):
        response = staff_client.delete(f"{PRODUCTS}{product.id}/")

    assert response.status_code == 204
    assert not Product.objects.filter(pk=product.pk).exists()
    assert not path.exists()


def test_category_rules_and_counts(staff_client):
    feeds = staff_client.post(CATEGORIES, {"name": "Animal Feeds"}, format="json")
    assert feeds.status_code == 201
    feeds_id = feeds.data["id"]

    dairy = staff_client.post(
        CATEGORIES, {"name": "Dairy Meal", "parent": feeds_id}, format="json"
    )
    assert dairy.status_code == 201

    too_deep = staff_client.post(
        CATEGORIES, {"name": "Premium", "parent": dairy.data["id"]}, format="json"
    )
    assert too_deep.status_code == 400
    assert "parent" in too_deep.data

    self_parent = staff_client.patch(
        f"{CATEGORIES}{feeds_id}/", {"parent": feeds_id}, format="json"
    )
    assert self_parent.status_code == 400
    assert "parent" in self_parent.data

    make_product(Category.objects.get(pk=dairy.data["id"]), "DM-70")
    listing = staff_client.get(CATEGORIES)
    assert isinstance(listing.data, list)
    by_slug = {item["slug"]: item for item in listing.data}
    assert by_slug["animal-feeds"]["children_count"] == 1
    assert by_slug["dairy-meal"]["product_count"] == 1


def test_deleting_a_category_in_use_returns_409(staff_client, category):
    make_product(category, "P-1")
    blocked = staff_client.delete(f"{CATEGORIES}{category.id}/")
    assert blocked.status_code == 409
    assert "detail" in blocked.data
    assert Category.objects.filter(pk=category.pk).exists()

    empty = Category.objects.create(name="Empty")
    assert staff_client.delete(f"{CATEGORIES}{empty.id}/").status_code == 204


def test_staff_product_list_query_count(
    staff_client, category, django_assert_max_num_queries
):
    for index in range(30):
        item = make_product(category, f"SKU-{index}", name=f"Item {index}")
        ProductImage.objects.create(product=item, image=make_image(f"{index}.png"))

    with django_assert_max_num_queries(3):
        response = staff_client.get(PRODUCTS)
    assert response.status_code == 200
    assert len(response.data["results"]) == 24
