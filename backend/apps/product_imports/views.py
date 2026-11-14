from django.db import transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.permissions import IsStaffUser

from .importer import run_import
from .models import ProductImport
from .parsing import ImportFileError, parse_upload
from .serializers import ImportUploadSerializer, ProductImportSerializer
from .template import csv_template, xlsx_template

XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class ProductImportView(APIView):
    """Preview (default) or apply a product spreadsheet."""

    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "import"

    def post(self, request):
        serializer = ImportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data["file"]
        commit = serializer.validated_data["commit"]

        try:
            sheet = parse_upload(upload)
        except ImportFileError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            outcome = run_import(
                sheet, commit=commit, skip_invalid=serializer.validated_data["skip_invalid"]
            )
            if outcome.applied:
                ProductImport.objects.create(
                    created_by=request.user,
                    filename=(upload.name or "upload")[:255],
                    created_count=outcome.counts["create"],
                    updated_count=outcome.counts["update"],
                    unchanged_count=outcome.counts["unchanged"],
                    skipped_count=outcome.counts["invalid"],
                    report=outcome.issues,
                )

        body = {
            "mode": "commit" if commit else "preview",
            "applied": outcome.applied,
            "summary": {"rows": outcome.total, **outcome.counts},
            "issues": outcome.issues,
            "issues_truncated": outcome.issues_truncated,
            "ignored_columns": outcome.ignored_columns,
        }
        if commit and not outcome.applied:
            body["detail"] = (
                "Nothing was imported because some rows have errors. "
                "Fix them, or import only the valid rows."
            )
            return Response(body, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        return Response(body)


class ProductImportTemplateView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        # Not "format": DRF reserves ?format= for choosing a response renderer.
        kind = request.query_params.get("file", "xlsx")
        if kind == "csv":
            content, content_type = csv_template(), "text/csv; charset=utf-8"
        elif kind == "xlsx":
            content, content_type = xlsx_template(), XLSX_TYPE
        else:
            return Response(
                {"detail": "Use file=csv or file=xlsx."}, status=status.HTTP_400_BAD_REQUEST
            )
        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="product-import-template.{kind}"'
        return response


class ProductImportHistoryView(ListAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = ProductImportSerializer

    def get_queryset(self):
        return ProductImport.objects.select_related("created_by")
