from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

IN_USE_MESSAGE = (
    "This item cannot be deleted because other records still depend on it "
    "(for example a category that still has products). Move or remove them "
    "first, or deactivate the item instead."
)


def api_exception_handler(exc, context):
    """Turn model-layer errors into clean API responses instead of 500s."""
    if isinstance(exc, DjangoValidationError):
        detail = exc.message_dict if hasattr(exc, "error_dict") else exc.messages
        exc = ValidationError(detail)
    elif isinstance(exc, ProtectedError):
        return Response({"detail": IN_USE_MESSAGE}, status=status.HTTP_409_CONFLICT)
    return drf_exception_handler(exc, context)
