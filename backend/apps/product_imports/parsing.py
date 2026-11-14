"""Read an uploaded CSV or Excel file into rows keyed by canonical field names."""
import csv
import io
import re
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_ROWS = 2000

# Canonical field -> accepted header spellings. Headers are compared after
# lowercasing and dropping everything except letters and digits, so
# "Pack Size", "pack_size" and "PACK-SIZE" are the same column.
COLUMN_ALIASES = {
    "sku": ("sku", "code", "productcode", "itemcode"),
    "name": ("name", "productname", "product", "item", "itemname"),
    "category": ("category", "categoryname"),
    "pack_size": ("packsize", "pack", "size", "unit"),
    "price": ("price", "pricekes", "priceksh", "sellingprice", "unitprice"),
    "brand": ("brand", "manufacturer"),
    "description": ("description", "details"),
    "stock_quantity": ("stockquantity", "stock", "stockqty", "quantity", "qty"),
    "in_stock": ("instock", "available"),
    "requires_advice": ("requiresadvice", "advice"),
    "featured": ("featured",),
    "active": ("active", "visible", "published"),
}
_FIELD_BY_HEADER = {
    alias: name for name, aliases in COLUMN_ALIASES.items() for alias in aliases
}


class ImportFileError(Exception):
    """The file as a whole cannot be imported (as opposed to one bad row)."""


@dataclass
class ParsedRow:
    number: int  # spreadsheet row number; the header is row 1
    values: dict[str, str]


@dataclass
class ParsedSheet:
    fields: list[str]
    ignored_columns: list[str]
    rows: list[ParsedRow] = field(default_factory=list)


def _normalise(header: str) -> str:
    return re.sub(r"[^a-z0-9]", "", header.lower())


def _cell_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _read_csv(data: bytes) -> list[list[str]]:
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("cp1252", errors="replace")  # Excel on Windows
    first_line = next((line for line in text.splitlines() if line.strip()), "")
    delimiter = max(",;\t", key=first_line.count)
    try:
        reader = csv.reader(io.StringIO(text), delimiter=delimiter)
        return [[cell.strip() for cell in row] for row in reader]
    except csv.Error as exc:
        raise ImportFileError(f"The CSV file could not be read: {exc}") from exc


def _read_xlsx(data: bytes) -> list[list[str]]:
    try:
        workbook = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except (InvalidFileException, zipfile.BadZipFile, KeyError, OSError, ValueError) as exc:
        raise ImportFileError(
            "The Excel file could not be read. Save it again as .xlsx or .csv."
        ) from exc
    try:
        names = workbook.sheetnames
        sheet = workbook["Products"] if "Products" in names else workbook.worksheets[0]
        rows = []
        blank_run = 0
        for raw in sheet.iter_rows(values_only=True):
            row = [_cell_text(cell) for cell in raw]
            rows.append(row)
            blank_run = blank_run + 1 if not any(row) else 0
            if blank_run >= 100:  # formatted-but-empty rows at the bottom of a sheet
                break
        return rows
    finally:
        workbook.close()


def parse_upload(uploaded) -> ParsedSheet:
    suffix = Path((uploaded.name or "").lower()).suffix
    if suffix == ".xls":
        raise ImportFileError(
            "Old .xls files are not supported. Save the file as .xlsx or .csv and upload again."
        )
    if suffix not in (".csv", ".xlsx"):
        raise ImportFileError("Upload a .csv or .xlsx file.")
    if uploaded.size > MAX_FILE_BYTES:
        raise ImportFileError(f"The file is too large. The maximum is {MAX_FILE_BYTES // 1024} KB.")

    data = uploaded.read()
    table = _read_csv(data) if suffix == ".csv" else _read_xlsx(data)

    header_index = next((i for i, row in enumerate(table) if any(row)), None)
    if header_index is None:
        raise ImportFileError("The file is empty.")

    mapping: dict[int, str] = {}
    ignored: list[str] = []
    for index, header in enumerate(table[header_index]):
        if not header:
            continue
        name = _FIELD_BY_HEADER.get(_normalise(header))
        if name is None:
            ignored.append(header)
        elif name in mapping.values():
            raise ImportFileError(
                f'Two columns map to the same field ("{name}"). Remove the duplicate column.'
            )
        else:
            mapping[index] = name
    if "sku" not in mapping.values():
        raise ImportFileError('The file needs a "sku" column (a unique code for each product).')

    rows = []
    for number, raw in enumerate(table[header_index + 1 :], start=header_index + 2):
        if not any(raw):
            continue
        values = {
            name: (raw[index] if index < len(raw) else "") for index, name in mapping.items()
        }
        rows.append(ParsedRow(number=number, values=values))
        if len(rows) > MAX_ROWS:
            raise ImportFileError(
                f"The file has more than {MAX_ROWS} product rows. Split it into smaller files."
            )
    if not rows:
        raise ImportFileError("The file has no product rows under the header.")

    return ParsedSheet(fields=list(mapping.values()), ignored_columns=ignored, rows=rows)
