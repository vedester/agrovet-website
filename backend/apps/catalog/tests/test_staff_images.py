from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.catalog.models import ProductImage
from apps.catalog.services import MAX_IMAGES_PER_PRODUCT
from apps.catalog.tests.helpers import make_image, make_product, make_upload

pytestmark = pytest.mark.django_db

PRODUCTS = "/api/v1/admin/catalog/products/"


def images_url(product_or_id):
    product_id = getattr(product_or_id, "id", product_or_id)
    return f"{PRODUCTS}{product_id}/images/"


def test_upload_is_resized_and_stored_as_webp(staff_client, product):
    upload = make_upload("big.jpg", (3000, 2000), "JPEG")
    response = staff_client.post(
        images_url(product), {"image": upload, "alt_text": "Front"}, format="multipart"
    )
    assert response.status_code == 201, response.data
    assert response.data["image"].endswith(".webp")
    assert response.data["position"] == 0

    stored = ProductImage.objects.get(pk=response.data["id"])
    with Image.open(stored.image.path) as opened:
        assert opened.format == "WEBP"
        assert max(opened.size) == 1600


def test_non_images_are_rejected(staff_client, product):
    fake = SimpleUploadedFile("evil.png", b"definitely not an image", content_type="image/png")
    response = staff_client.post(images_url(product), {"image": fake}, format="multipart")
    assert response.status_code == 400
    assert "image" in response.data

    svg = SimpleUploadedFile(
        "logo.svg", b"<svg xmlns='http://www.w3.org/2000/svg'/>", content_type="image/svg+xml"
    )
    response = staff_client.post(images_url(product), {"image": svg}, format="multipart")
    assert response.status_code == 400
    assert ProductImage.objects.count() == 0


def test_image_limit_per_product(staff_client, product):
    for index in range(MAX_IMAGES_PER_PRODUCT):
        ProductImage.objects.create(
            product=product, image=make_image(f"{index}.png"), position=index
        )
    response = staff_client.post(
        images_url(product), {"image": make_upload("extra.png")}, format="multipart"
    )
    assert response.status_code == 400
    assert "image" in response.data


def test_images_are_appended_then_reordered(staff_client, product):
    ids = []
    for name in ("a.png", "b.png", "c.png"):
        response = staff_client.post(
            images_url(product), {"image": make_upload(name)}, format="multipart"
        )
        assert response.status_code == 201, response.data
        ids.append(response.data["id"])

    listing = staff_client.get(images_url(product))
    assert [item["id"] for item in listing.data] == ids
    assert [item["position"] for item in listing.data] == [0, 1, 2]

    reorder_url = f"{images_url(product)}reorder/"
    reordered = staff_client.post(reorder_url, {"order": ids[::-1]}, format="json")
    assert reordered.status_code == 200
    assert [item["id"] for item in staff_client.get(images_url(product)).data] == ids[::-1]

    incomplete = staff_client.post(reorder_url, {"order": ids[:2]}, format="json")
    assert incomplete.status_code == 400
    assert "order" in incomplete.data


def test_replacing_an_image_deletes_the_old_file(
    staff_client, product, django_capture_on_commit_callbacks
):
    image = ProductImage.objects.create(product=product, image=make_image())
    old_path = Path(image.image.path)
    assert old_path.exists()

    with django_capture_on_commit_callbacks(execute=True):
        response = staff_client.patch(
            f"{images_url(product)}{image.id}/",
            {"image": make_upload("new.png")},
            format="multipart",
        )
    assert response.status_code == 200, response.data

    image.refresh_from_db()
    new_path = Path(image.image.path)
    assert new_path != old_path
    assert new_path.exists()
    assert not old_path.exists()


def test_edit_alt_text_then_delete_removes_the_file(
    staff_client, product, django_capture_on_commit_callbacks
):
    image = ProductImage.objects.create(product=product, image=make_image())
    path = Path(image.image.path)
    url = f"{images_url(product)}{image.id}/"

    edited = staff_client.patch(url, {"alt_text": "Back view"}, format="json")
    assert edited.status_code == 200
    assert edited.data["alt_text"] == "Back view"

    with django_capture_on_commit_callbacks(execute=True):
        assert staff_client.delete(url).status_code == 204
    assert not path.exists()


def test_images_cannot_be_reached_through_another_product(staff_client, product):
    other = make_product(product.category, "OTHER-1")
    image = ProductImage.objects.create(product=product, image=make_image())

    wrong_url = f"{images_url(other)}{image.id}/"
    assert staff_client.get(wrong_url).status_code == 404
    assert staff_client.delete(wrong_url).status_code == 404
    assert ProductImage.objects.filter(pk=image.pk).exists()
    assert staff_client.get(images_url(999999)).status_code == 404
