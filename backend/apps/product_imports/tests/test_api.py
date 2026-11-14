import io
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import load_workbook

from apps.catalog.models import Product
from apps.product_imports.models import ProductImport
from apps.product_imports.template import TEMPLATE_COLUMNS
from apps.product_imports.tests.helpers import csv_upload

pytestmark = pytest.mark.django_db

BASE = "/api/v1/admin/imports/products/"
GOOD_ROW = "sku,name,category,price\nA-1,One,Veterinary Drugs,10\n"


@pytest.mark.parametrize(
    ("method", "url"),
    [("post", BASE), ("get", f"{BASE}template/"), ("get", f"{BASE}history/")],
)
def test_endpoints_require_staff(method, url, anon_client, plain_client):
    assert getattr(anon_client, method)(url).status_code == 401
    assert getattr(plain_client, method)(url).status_code == 403


def test_omitting_commit_is_a_safe_preview(staff_client, vet):
    response = staff_client.post(BASE, {"file": csv_upload(GOOD_ROW)}, format="multipart")

    assert response.status_code == 200, response.data
    assert response.data["mode"] == "preview"
    assert response.data["applied"] is False
    assert response.data["summary"] == {
        "rows": 1,
        "create": 1,
        "update": 0,
        "unchanged": 0,
        "invalid": 0,
    }
    assert Product.objects.count() == 0
    assert ProductImport.objects.count() == 0


def test_commit_applies_and_is_recorded_in_history(staff_client, vet):
    upload = csv_upload(GOOD_ROW, name="stock-list.csv")
    response = staff_client.post(BASE, {"file": upload, "commit": "true"}, format="multipart")

    assert response.status_code == 200, response.data
    assert response.data["mode"] == "commit"
    assert response.data["applied"] is True
    assert Product.objects.filter(sku="A-1").exists()

    history = staff_client.get(f"{BASE}history/")
    assert history.status_code == 200
    entry = history.data["results"][0]
    assert entry["filename"] == "stock-list.csv"
    assert entry["created_count"] == 1
    assert entry["created_by_email"] == "owner@example.com"


def test_commit_with_errors_returns_422_unless_skipping_invalid_rows(staff_client, vet):
    text = "sku,name,category,price\nA-1,One,Veterinary Drugs,10\nA-2,Two,Nowhere,20\n"

    blocked = staff_client.post(
        BASE, {"file": csv_upload(text), "commit": "true"}, format="multipart"
    )
    assert blocked.status_code == 422
    assert blocked.data["applied"] is False
    assert blocked.data["summary"]["invalid"] == 1
    assert blocked.data["issues"][0]["errors"][0]["field"] == "category"
    assert Product.objects.count() == 0
    assert ProductImport.objects.count() == 0

    partial = staff_client.post(
        BASE,
        {"file": csv_upload(text), "commit": "true", "skip_invalid": "true"},
        format="multipart",
    )
    assert partial.status_code == 200
    assert Product.objects.count() == 1
    assert ProductImport.objects.get().skipped_count == 1


def test_unreadable_files_return_400(staff_client):
    broken = SimpleUploadedFile("broken.xlsx", b"not a zip")
    response = staff_client.post(BASE, {"file": broken}, format="multipart")
    assert response.status_code == 400
    assert "could not be read" in response.data["detail"]

    missing = staff_client.post(BASE, {}, format="multipart")
    assert missing.status_code == 400
    assert "file" in missing.data


def test_csv_template_download(staff_client):
    response = staff_client.get(f"{BASE}template/", {"file": "csv"})

    assert response.status_code == 200
    assert "attachment" in response["Content-Disposition"]
    assert response.content.startswith(b"\xef\xbb\xbf")
    assert response.content.decode("utf-8-sig").strip() == ",".join(TEMPLATE_COLUMNS)


def test_xlsx_template_download(staff_client, vet, feeds):
    response = staff_client.get(f"{BASE}template/")  # xlsx is the default

    assert response.status_code == 200
    workbook = load_workbook(io.BytesIO(response.content))
    assert workbook.sheetnames == ["Products", "Guide", "Categories"]
    assert [cell.value for cell in workbook["Products"][1]] == TEMPLATE_COLUMNS
    listed = [row[0] for row in workbook["Categories"].iter_rows(min_row=2, values_only=True)]
    assert listed == ["Animal Feeds", "Veterinary Drugs"]
    assert staff_client.get(f"{BASE}template/", {"file": "pdf"}).status_code == 400


def test_filled_template_imports_cleanly(staff_client, vet):
    template = load_workbook(io.BytesIO(staff_client.get(f"{BASE}template/").content))
    template["Products"].append(
        ["VET-IVM-50", "Ivermectin 1% Injection", "Veterinary Drugs", "50 ml", 650,
         "", "", 12, "", "yes", "", ""]
    )
    buffer = io.BytesIO()
    template.save(buffer)

    upload = SimpleUploadedFile("filled.xlsx", buffer.getvalue())
    response = staff_client.post(BASE, {"file": upload, "commit": "true"}, format="multipart")

    assert response.status_code == 200, response.data
    product = Product.objects.get(sku="VET-IVM-50")
    assert product.price == Decimal("650.00")
    assert product.stock_quantity == 12
    assert product.requires_advice is True
