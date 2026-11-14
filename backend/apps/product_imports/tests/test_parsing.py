import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.product_imports import parsing
from apps.product_imports.parsing import ImportFileError, parse_upload
from apps.product_imports.tests.helpers import csv_upload, xlsx_upload


def test_csv_with_bom_semicolons_and_aliases():
    sheet = parse_upload(
        csv_upload(
            "Code;Product Name;Category;Price (KES);Notes\n"
            "vet-1;Ivermectin;Veterinary Drugs;650;fast mover\n"
        )
    )
    assert sheet.fields == ["sku", "name", "category", "price"]
    assert sheet.ignored_columns == ["Notes"]
    assert sheet.rows[0].number == 2
    assert sheet.rows[0].values == {
        "sku": "vet-1",
        "name": "Ivermectin",
        "category": "Veterinary Drugs",
        "price": "650",
    }


def test_windows_1252_files_are_decoded():
    data = "sku,name\nA-1,Caf\u00e9 Feed\n".encode("cp1252")
    sheet = parse_upload(SimpleUploadedFile("p.csv", data))
    assert sheet.rows[0].values["name"] == "Caf\u00e9 Feed"


def test_xlsx_numbers_and_blank_rows():
    upload = xlsx_upload(
        [
            ["SKU", "Name", "Price", "Stock"],
            ["A-1", "Item", 650.0, 12],
            ["", "", "", ""],
            ["A-2", "Other", 650.5, None],
        ]
    )
    sheet = parse_upload(upload)
    assert [row.number for row in sheet.rows] == [2, 4]
    assert sheet.rows[0].values == {
        "sku": "A-1",
        "name": "Item",
        "price": "650",
        "stock_quantity": "12",
    }
    assert sheet.rows[1].values["price"] == "650.5"
    assert sheet.rows[1].values["stock_quantity"] == ""


@pytest.mark.parametrize(
    ("filename", "content", "message"),
    [
        ("old.xls", b"x", "not supported"),
        ("data.txt", b"sku\nA\n", "Upload a .csv or .xlsx"),
        ("empty.csv", b"", "empty"),
        ("nosku.csv", b"name,price\nA,1\n", "sku"),
        ("norows.csv", b"sku,name\n", "no product rows"),
        ("dupes.csv", b"sku,stock,qty\nA-1,1,2\n", "same field"),
        ("bad.xlsx", b"not a zip", "could not be read"),
    ],
)
def test_file_level_errors(filename, content, message):
    with pytest.raises(ImportFileError, match=message):
        parse_upload(SimpleUploadedFile(filename, content))


def test_too_many_rows(monkeypatch):
    monkeypatch.setattr(parsing, "MAX_ROWS", 2)
    with pytest.raises(ImportFileError, match="more than 2"):
        parse_upload(csv_upload("sku\nA\nB\nC\n"))


def test_oversized_files(monkeypatch):
    monkeypatch.setattr(parsing, "MAX_FILE_BYTES", 10)
    with pytest.raises(ImportFileError, match="too large"):
        parse_upload(csv_upload("sku,name\nA-1,Something long enough\n"))
