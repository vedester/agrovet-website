from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.permissions import IsStaffUser

from .photos import (
    MAX_FILES_PER_REQUEST,
    attach_photo,
    describe,
    plan_photos,
    summarise,
)
from .serializers import PhotoCheckSerializer


class PhotoCheckView(APIView):
    """Say what would happen to each filename. Sends names only, writes nothing."""

    permission_classes = [IsStaffUser]
    parser_classes = [JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "photo_import"

    def post(self, request):
        serializer = PhotoCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plans = plan_photos(serializer.validated_data["filenames"])
        results = [describe(plan) for plan in plans]
        return Response({"summary": summarise(results), "results": results})


class PhotoUploadView(APIView):
    """Attach a batch of photos. Each file succeeds or fails on its own."""

    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "photo_import"

    def post(self, request):
        files = request.FILES.getlist("files")
        if not files:
            return Response(
                {"detail": "Attach at least one photo in the files field."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(files) > MAX_FILES_PER_REQUEST:
            return Response(
                {"detail": f"Send at most {MAX_FILES_PER_REQUEST} photos per request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plans = plan_photos([uploaded.name for uploaded in files])
        results = []
        for plan, uploaded in zip(plans, files, strict=True):
            item = describe(plan)
            if plan.status == "ready":
                try:
                    item["status"] = attach_photo(plan, uploaded)
                except ValidationError as exc:
                    item["status"] = "failed"
                    item["message"] = " ".join(exc.messages)
                except OSError:
                    item["status"] = "failed"
                    item["message"] = "The file could not be saved. Try again."
            results.append(item)
        return Response({"summary": summarise(results), "results": results})
