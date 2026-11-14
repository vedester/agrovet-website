from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Category, ProductImage
from apps.catalog.tests.helpers import make_image, make_product

pytestmark = pytest.mark.django_db

PRODUCTS = "/api/v1/catalog/products/"
CATEGORIES = "/api/v1/catalog/categories/"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def vet():
    return Category.objects.create(name="Veterinary Drugs")


@pytest.fixture
def feeds():
    return Category.objects.create(name="Animal Feeds")


@pytest.fixture
def dairy(feeds):
    return Category.objects.create(name="Dairy Meal", parent=feeds)


def skus(response):
    return [item["sku"] for item in response.data["results"]]


def test_product_list_is_public_and_hides_internal_fields(api, vet):
    make_product(vet, "A-1", stock_quantity=7)
    response = api.get(PRODUCTS)
    assert response.status_code == 200
    assert {"count", "next", "previous", "results"} <= set(response.data)
    item = response.data["results"][0]
    assert item["sku"] == "A-1"
    assert item["price"] == "100.00"
    assert "stock_quantity" not in item
    assert "is_active" not in item


def test_hidden_products_never_appear(api, feeds, dairy, vet):
    make_product(vet, "VISIBLE")
    make_product(vet, "OFF", is_active=False)
    hidden_category = Category.objects.create(name="Hidden", is_active=False)
    make_product(hidden_category, "IN-HIDDEN-CATEGORY")
    feeds.is_active = False
    feeds.save()
    make_product(dairy, "UNDER-HIDDEN-PARENT")

    assert skus(api.get(PRODUCTS)) == ["VISIBLE"]


def test_invalid_token_does_not_break_public_endpoint(api, vet):
    make_product(vet, "A-1")
    api.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
    assert api.get(PRODUCTS).status_code == 200


def test_search_matches_every_word_across_fields(api, vet):
    make_product(vet, "IVM-50", name="Ivermectin 1% Injection", pack_size="50 ml")
    make_product(vet, "IVM-100", name="Ivermectin 1% Injection", pack_size="100 ml")

    assert skus(api.get(PRODUCTS, {"search": "ivermectin 50"})) == ["IVM-50"]
    assert skus(api.get(PRODUCTS, {"search": "ivm-100"})) == ["IVM-100"]
    assert skus(api.get(PRODUCTS, {"search": "ivermectin 999"})) == []


def test_category_filter_includes_subcategories(api, feeds, dairy, vet):
    make_product(feeds, "LM-70", name="Layers Mash")
    make_product(dairy, "DM-70", name="Dairy Meal")
    make_product(vet, "V-1")

    assert sorted(skus(api.get(PRODUCTS, {"category": "animal-feeds"}))) == ["DM-70", "LM-70"]
    assert skus(api.get(PRODUCTS, {"category": "dairy-meal"})) == ["DM-70"]
    assert skus(api.get(PRODUCTS, {"category": "no-such-category"})) == []


def test_stock_price_and_featured_filters(api, vet):
    make_product(vet, "CHEAP", price=Decimal("100"), stock_quantity=5)
    make_product(vet, "MID", price=Decimal("500"), stock_quantity=0)
    make_product(vet, "PRICEY", price=Decimal("900"), is_featured=True)

    assert sorted(skus(api.get(PRODUCTS, {"in_stock": "true"}))) == ["CHEAP", "PRICEY"]
    assert skus(api.get(PRODUCTS, {"in_stock": "false"})) == ["MID"]
    assert skus(api.get(PRODUCTS, {"min_price": "200", "max_price": "600"})) == ["MID"]
    assert skus(api.get(PRODUCTS, {"featured": "true"})) == ["PRICEY"]


def test_ordering_is_stable_and_unknown_fields_are_ignored(api, vet):
    make_product(vet, "B", name="Bravo", price=Decimal("300"))
    make_product(vet, "A", name="Alpha", price=Decimal("300"))
    make_product(vet, "C", name="Charlie", price=Decimal("100"))

    assert skus(api.get(PRODUCTS)) == ["A", "B", "C"]
    # A and B tie on price; the tie is broken by id (B was created first).
    assert skus(api.get(PRODUCTS, {"ordering": "-price"})) == ["B", "A", "C"]

    response = api.get(PRODUCTS, {"ordering": "stock_quantity"})
    assert response.status_code == 200
    assert skus(response) == ["A", "B", "C"]


def test_product_detail_by_slug_and_hidden_products_are_404(api, vet):
    product = make_product(
        vet, "IVM-50", name="Ivermectin", pack_size="50 ml", description="Dewormer"
    )
    response = api.get(f"{PRODUCTS}{product.slug}/")
    assert response.status_code == 200
    assert response.data["description"] == "Dewormer"
    assert response.data["category"]["slug"] == "veterinary-drugs"
    assert response.data["images"] == []

    hidden = make_product(vet, "H-1", is_active=False)
    assert api.get(f"{PRODUCTS}{hidden.slug}/").status_code == 404
    assert api.get(f"{PRODUCTS}no-such-product/").status_code == 404


def test_list_query_count_does_not_grow_with_products(
    api, vet, django_assert_max_num_queries
):
    for index in range(30):
        product = make_product(vet, f"SKU-{index}", name=f"Item {index}")
        ProductImage.objects.create(product=product, image=make_image(f"{index}.png"))

    with django_assert_max_num_queries(3):
        response = api.get(PRODUCTS)
    assert response.status_code == 200
    assert len(response.data["results"]) == 24


def test_detail_query_count(api, vet, django_assert_max_num_queries):
    product = make_product(vet, "D-1")
    for index in range(3):
        ProductImage.objects.create(product=product, image=make_image(f"{index}.png"))

    with django_assert_max_num_queries(2):
        response = api.get(f"{PRODUCTS}{product.slug}/")
    assert response.status_code == 200
    assert len(response.data["images"]) == 3


def test_category_tree_structure_and_counts(
    api, feeds, dairy, vet, django_assert_max_num_queries
):
    make_product(feeds, "LM-70")
    make_product(dairy, "DM-70")
    make_product(dairy, "DM-35", is_active=False)
    Category.objects.create(name="Hidden", is_active=False)

    with django_assert_max_num_queries(2):
        response = api.get(CATEGORIES)
    assert response.status_code == 200

    tree = {category["slug"]: category for category in response.data}
    assert set(tree) == {"animal-feeds", "veterinary-drugs"}
    assert tree["animal-feeds"]["product_count"] == 2
    assert [child["slug"] for child in tree["animal-feeds"]["children"]] == ["dairy-meal"]
    assert tree["animal-feeds"]["children"][0]["product_count"] == 1
    assert tree["veterinary-drugs"]["product_count"] == 0
    assert tree["veterinary-drugs"]["children"] == []


def test_public_responses_are_cacheable(api, vet):
    make_product(vet, "A-1")
    cache_control = api.get(PRODUCTS)["Cache-Control"]
    assert "public" in cache_control
    assert "max-age=60" in cache_control


def test_public_endpoints_are_read_only(api, vet):
    assert api.post(PRODUCTS, {"name": "x"}).status_code == 405
    assert api.post(CATEGORIES, {"name": "x"}).status_code == 405
    assert api.delete(PRODUCTS).status_code == 405


def test_images_are_returned_with_absolute_urls_in_order(api, vet):
    product = make_product(vet, "IMG-1")
    ProductImage.objects.create(
        product=product, image=make_image("b.png"), position=2, alt_text="Back"
    )
    ProductImage.objects.create(
        product=product, image=make_image("a.png"), position=1, alt_text="Front"
    )

    listing = api.get(PRODUCTS).data["results"][0]
    assert listing["cover_image"]["alt_text"] == "Front"
    assert listing["cover_image"]["image"].startswith("http://testserver/media/products/")

    detail = api.get(f"{PRODUCTS}{product.slug}/").data
    assert [image["alt_text"] for image in detail["images"]] == ["Front", "Back"]
