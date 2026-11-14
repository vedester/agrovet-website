"""Normalise uploaded photos before they are stored."""
from io import BytesIO
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_DIMENSION = 1600
WEBP_QUALITY = 82


def process_image(uploaded, *, max_dimension: int = MAX_DIMENSION) -> ContentFile:
    """Return a cleaned-up WebP copy of an uploaded photo.

    - applies EXIF rotation, then drops all metadata (phone photos carry GPS data)
    - shrinks to at most `max_dimension` pixels on the longest side (never enlarges)
    - re-encodes as WebP, typically 5-10x smaller than a raw phone JPEG
    """
    try:
        with Image.open(uploaded) as source:
            image = ImageOps.exif_transpose(source)
            has_alpha = image.mode in ("RGBA", "LA") or (
                image.mode == "P" and "transparency" in image.info
            )
            image = image.convert("RGBA" if has_alpha else "RGB")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise ValidationError("The file is not a valid image.") from exc

    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=WEBP_QUALITY)

    stem = Path(getattr(uploaded, "name", "") or "image").stem[:60] or "image"
    return ContentFile(buffer.getvalue(), name=f"{stem}.webp")
