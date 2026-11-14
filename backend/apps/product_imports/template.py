"""Downloadable import templates (CSV and Excel)."""
import csv
import io

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.worksheet.datavalidation import DataValidation

from apps.catalog.models import Category

TEMPLATE_COLUMNS = [
    "sku",
    "name",
    "category",
    "pack_size",
    "price",
    "brand",
    "description",
    "stock_quantity",
    "in_stock",
    "requires_advice",
    "featured",
    "active",
]

_COLUMN_WIDTHS = (16, 32, 22, 14, 12, 18, 40, 16, 10, 16, 10, 10)

# column, required?, what to enter, example
GUIDE = [
    (
        "sku",
        "Yes",
        "Unique product code: letters, digits, dots, dashes, underscores. "
        "Products are matched by SKU, so uploading a known SKU updates that product.",
        "VET-IVM-50",
    ),
    ("name", "New products", "Product name, without the pack size.", "Ivermectin 1% Injection"),
    (
        "category",
        "New products",
        "Must match a name on the Categories sheet exactly.",
        "Veterinary Drugs",
    ),
    ("pack_size", "No", "Size or pack, shown beside the name.", "50 ml"),
    (
        "price",
        "New products",
        'Selling price in KES. Plain numbers are best; "KES" and commas are tolerated.',
        "650",
    ),
    ("brand", "No", "Brand or maker.", ""),
    ("description", "No", "Longer text for the product page.", ""),
    (
        "stock_quantity",
        "No",
        "Units in stock. Leave blank if you do not count stock, then use in_stock.",
        "12",
    ),
    ("in_stock", "No", "yes or no. Only used when stock_quantity is blank.", "yes"),
    (
        "requires_advice",
        "No",
        "yes or no. Shows a consult-before-use notice (vet drugs, agrochemicals).",
        "yes",
    ),
    ("featured", "No", "yes or no. Show on the homepage.", "no"),
    ("active", "No", "yes or no. no hides the product from the website.", "yes"),
]

RULES = [
    "Fill in the Products sheet only. Use one row per product and pack size.",
    "New products need sku, name, category and price. To change existing products you "
    "only need sku plus the columns to change (for example sku and price).",
    "A blank cell means keep the current value. To clear a value, edit the product "
    "in the dashboard.",
    "Photos are not part of this file. Upload them in the dashboard afterwards.",
    "Upload the file as a preview first. Nothing is saved until you confirm.",
]


def csv_template() -> bytes:
    buffer = io.StringIO()
    csv.writer(buffer).writerow(TEMPLATE_COLUMNS)
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")  # BOM so Excel reads UTF-8


def _bold_header(sheet) -> None:
    for cell in sheet[1]:
        cell.font = Font(bold=True)


def xlsx_template() -> bytes:
    categories = list(Category.objects.select_related("parent").order_by("name"))

    workbook = Workbook()
    products = workbook.active
    products.title = "Products"
    products.append(TEMPLATE_COLUMNS)
    products.freeze_panes = "A2"
    _bold_header(products)
    for letter, width in zip("ABCDEFGHIJKL", _COLUMN_WIDTHS, strict=True):
        products.column_dimensions[letter].width = width

    guide = workbook.create_sheet("Guide")
    guide.append(["Column", "Required", "What to enter", "Example"])
    _bold_header(guide)
    for row in GUIDE:
        guide.append(list(row))
    guide.append([])
    for rule in RULES:
        guide.append([rule])
    for letter, width in zip("ABCD", (18, 14, 80, 26), strict=True):
        guide.column_dimensions[letter].width = width

    sheet = workbook.create_sheet("Categories")
    sheet.append(["Category name", "Parent category"])
    _bold_header(sheet)
    for category in categories:
        sheet.append([category.name, category.parent.name if category.parent else ""])
    sheet.column_dimensions["A"].width = 30
    sheet.column_dimensions["B"].width = 30

    if categories:
        picker = DataValidation(
            type="list",
            formula1=f"=Categories!$A$2:$A${len(categories) + 1}",
            allow_blank=True,
            showErrorMessage=True,
        )
        picker.error = "Pick a category from the list (see the Categories sheet)."
        products.add_data_validation(picker)
        picker.add("C2:C2001")

    yes_no = DataValidation(type="list", formula1='"yes,no"', allow_blank=True)
    products.add_data_validation(yes_no)
    for column in ("I", "J", "K", "L"):
        yes_no.add(f"{column}2:{column}2001")

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
