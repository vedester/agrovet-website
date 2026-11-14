from rest_framework import serializers

from .models import ProductImport
from .photos import MAX_FILENAMES_PER_CHECK


class ImportUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    # A boolean that is absent from a multipart form reads as False, so the safe
    # action (preview only) must be the one that needs no flag.
    commit = serializers.BooleanField(default=False)
    skip_invalid = serializers.BooleanField(default=False)


class ProductImportSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(
        source="created_by.email", read_only=True, default=None
    )

    class Meta:
        model = ProductImport
        fields = (
            "id",
            "filename",
            "created_by_email",
            "created_count",
            "updated_count",
            "unchanged_count",
            "skipped_count",
            "report",
            "created_at",
        )


class PhotoCheckSerializer(serializers.Serializer):
    filenames = serializers.ListField(
        child=serializers.CharField(max_length=255, allow_blank=True),
        allow_empty=False,
        max_length=MAX_FILENAMES_PER_CHECK,
    )
