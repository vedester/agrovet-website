import io

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.core.images import MAX_DIMENSION, process_image
from apps.core.validators import MAX_IMAGE_BYTES, validate_image_size


def build_upload(name, size, fmt, mode="RGB", **save_kwargs):
    buffer = io.BytesIO()
    colour = "green" if mode == "RGB" else (0, 128, 0, 128)
    Image.new(mode, size, colour).save(buffer, format=fmt, **save_kwargs)
    return SimpleUploadedFile(name, buffer.getvalue())


def open_result(content):
    return Image.open(io.BytesIO(content.read()))


def test_large_images_shrink_and_small_ones_are_not_enlarged():
    big = process_image(build_upload("big.jpg", (4000, 1000), "JPEG"))
    assert big.name == "big.webp"
    shrunk = open_result(big)
    assert shrunk.format == "WEBP"
    assert shrunk.size == (MAX_DIMENSION, 400)

    small = open_result(process_image(build_upload("small.png", (100, 50), "PNG")))
    assert small.size == (100, 50)


def test_exif_rotation_is_applied():
    exif = Image.Exif()
    exif[0x0112] = 6  # "rotate 90 degrees to display"
    upload = build_upload("phone.jpg", (40, 20), "JPEG", exif=exif)
    assert open_result(process_image(upload)).size == (20, 40)


def test_transparency_is_preserved():
    result = open_result(process_image(build_upload("logo.png", (10, 10), "PNG", mode="RGBA")))
    assert result.mode == "RGBA"


def test_non_images_raise_a_validation_error():
    with pytest.raises(ValidationError):
        process_image(SimpleUploadedFile("x.png", b"nope"))


def test_oversized_uploads_are_rejected():
    validate_image_size(SimpleUploadedFile("ok.png", b"0" * 10))
    with pytest.raises(ValidationError):
        validate_image_size(SimpleUploadedFile("big.png", b"0" * (MAX_IMAGE_BYTES + 1)))
