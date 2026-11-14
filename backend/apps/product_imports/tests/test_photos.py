from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.catalog.models import ProductImage
from apps.catalog.services import MAX_IMAGES_PER_PRODUCT
from apps.catalog.tests.helpers import make_image, make_product, make_upload
from apps.product_imports.photos import MAX_FILES_PER_REQUEST, plan_photos

pytestmark = pytest.mark.django_db

CHECK = "/api/v1/admin/imports/photos/check/"
UPLOAD = "/api/v1/admin/imports/photos/"


def by_name(plans):
    return {plan.filename: plan for plan in plans}


def test_slot_comes_from_the_filename(vet):
    make_product(vet, "VET-1")
    make_product(vet, "BAG_2")  # a SKU that itself ends in _<number>

    plans = by_name(plan_photos(["vet-1.JPG", "VET-1_3.png", "bag_2.webp", "IMG_4821.jpg"]))

    main = plans["vet-1.JPG"]
    assert (main.status, main.sku, main.slot, main.action) == ("ready", "VET-1", 1, "add")
    third = plans["VET-1_3.png"]
    assert (third.status, third.sku, third.slot) == ("ready", "VET-1", 3)
    whole_name_wins = plans["bag_2.webp"]
    assert (whole_name_wins.sku, whole_name_wins.slot) == ("BAG_2", 1)
    assert plans["IMG_4821.jpg"].status == "unmatched"


def test_unusable_names_are_explained(vet):
    make_product(vet, "VET-1")

    plans = plan_photos(
        ["VET-1_9.jpg", "VET-1_0.jpg", "VET-1.gif", "VET-1.heic", "VET-1.jpg", "vet-1.png"]
    )

    assert [plan.status for plan in plans] == [
        "invalid_slot",
        "invalid_slot",
        "unsupported",
        "unsupported",
        "ready",
        "duplicate",
    ]
    assert "JPEG" in plans[3].message
    assert "VET-1.jpg" in plans[5].message


def test_full_product_reports_limit_reached(vet):
    full = make_product(vet, "FULL-1")
    for index in range(MAX_IMAGES_PER_PRODUCT):
        ProductImage.objects.create(
            product=full, image=make_image(f"{index}.png"), position=10 + index
        )

    (plan,) = plan_photos(["FULL-1.jpg"])

    assert plan.status == "limit_reached"
    assert "Delete one" in plan.message


def test_existing_slot_is_replaced_new_slot_is_added(vet):
    product = make_product(vet, "VET-1")
    ProductImage.objects.create(product=product, image=make_image(), position=0)

    first, second = plan_photos(["VET-1.jpg", "VET-1_2.jpg"])

    assert (first.action, second.action) == ("replace", "add")
    assert first.existing is not None


def test_unmatched_names_get_a_suggestion(vet):
    make_product(vet, "FERT-DAP-50")

    typo, unknown = plan_photos(["fert-dap-5o.jpg", "ZZZ-999.jpg"])

    assert typo.status == "unmatched"
    assert typo.suggestion == "FERT-DAP-50"
    assert "Did you mean" in typo.message
    assert unknown.suggestion == ""


def test_planning_query_count_is_constant(vet, django_assert_max_num_queries):
    for index in range(30):
        make_product(vet, f"P-{index}", name=f"Item {index}")
    names = [f"P-{index}.jpg" for index in range(30)] + ["nothing.jpg"]

    with django_assert_max_num_queries(3):
        plans = plan_photos(names)

    assert sum(plan.status == "ready" for plan in plans) == 30


@pytest.mark.parametrize("url", [CHECK, UPLOAD])
def test_endpoints_require_staff(url, anon_client, plain_client):
    assert anon_client.post(url, {}, format="json").status_code == 401
    assert plain_client.post(url, {}, format="json").status_code == 403


def test_check_endpoint_reports_without_writing(staff_client, vet):
    product = make_product(vet, "VET-1")

    response = staff_client.post(
        CHECK, {"filenames": ["VET-1.jpg", "nope.jpg"]}, format="json"
    )

    assert response.status_code == 200, response.data
    summary = response.data["summary"]
    assert (summary["files"], summary["ready"], summary["unmatched"]) == (2, 1, 1)
    ready, missing = response.data["results"]
    assert (ready["sku"], ready["slot"], ready["action"]) == ("VET-1", 1, "add")
    assert ready["product_name"] == product.name
    assert missing["status"] == "unmatched"
    assert ProductImage.objects.count() == 0

    too_many = staff_client.post(CHECK, {"filenames": ["a.jpg"] * 501}, format="json")
    assert too_many.status_code == 400


def test_upload_attaches_photos_to_slots(staff_client, vet):
    product = make_product(vet, "VET-1", name="Ivermectin")
    files = [make_upload("vet-1.jpg", (3000, 2000), "JPEG"), make_upload("VET-1_2.png")]

    response = staff_client.post(UPLOAD, {"files": files}, format="multipart")

    assert response.status_code == 200, response.data
    assert response.data["summary"]["attached"] == 2
    images = list(product.images.all())
    assert [image.position for image in images] == [0, 1]
    assert images[0].alt_text == "Ivermectin"
    with Image.open(images[0].image.path) as opened:
        assert opened.format == "WEBP"
        assert max(opened.size) == 1600


def test_reuploading_a_name_replaces_the_slot(
    staff_client, vet, django_capture_on_commit_callbacks
):
    product = make_product(vet, "VET-1")
    first = staff_client.post(UPLOAD, {"files": [make_upload("VET-1.png")]}, format="multipart")
    assert first.data["results"][0]["status"] == "attached"
    old_path = Path(product.images.get().image.path)
    assert old_path.exists()

    with django_capture_on_commit_callbacks(execute=True):
        second = staff_client.post(
            UPLOAD, {"files": [make_upload("VET-1.png", (20, 20))]}, format="multipart"
        )

    assert second.data["results"][0]["status"] == "replaced"
    image = product.images.get()  # still exactly one photo
    new_path = Path(image.image.path)
    assert new_path != old_path
    assert new_path.exists()
    assert not old_path.exists()


def test_one_bad_file_does_not_block_the_rest(staff_client, vet):
    product = make_product(vet, "VET-1")
    files = [
        make_upload("VET-1.png"),
        SimpleUploadedFile("VET-1_2.png", b"not an image", content_type="image/png"),
        make_upload("nobody.png"),
    ]

    response = staff_client.post(UPLOAD, {"files": files}, format="multipart")

    assert response.status_code == 200
    assert [item["status"] for item in response.data["results"]] == [
        "attached",
        "failed",
        "unmatched",
    ]
    assert response.data["summary"]["failed"] == 1
    assert "not a valid image" in response.data["results"][1]["message"]
    assert product.images.count() == 1


def test_request_limits(staff_client):
    empty = staff_client.post(UPLOAD, {}, format="multipart")
    assert empty.status_code == 400
    assert "files" in empty.data["detail"]

    too_many = [make_upload(f"p{index}.png") for index in range(MAX_FILES_PER_REQUEST + 1)]
    response = staff_client.post(UPLOAD, {"files": too_many}, format="multipart")
    assert response.status_code == 400
    assert str(MAX_FILES_PER_REQUEST) in response.data["detail"]
