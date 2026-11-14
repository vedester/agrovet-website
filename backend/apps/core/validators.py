from django.core.exceptions import ValidationError

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_image_size(file) -> None:
    if file.size > MAX_IMAGE_BYTES:
        size_mb = file.size / 1024 / 1024
        raise ValidationError(
            f"Image is too large ({size_mb:.1f} MB). Maximum allowed is 5 MB."
        )
