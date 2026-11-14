import io

from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook

XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def csv_upload(text, name="products.csv", encoding="utf-8-sig"):
    return SimpleUploadedFile(name, text.encode(encoding), content_type="text/csv")


def xlsx_upload(rows, name="products.xlsx"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Products"
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=XLSX_TYPE)
