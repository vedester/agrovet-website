"""Write-side operations that go beyond a single model save."""
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Max

from .models import ProductImage

MAX_IMAGES_PER_PRODUCT = 8


def add_product_image(*, product, image, alt_text="", position=None) -> ProductImage:
    """Attach an already-processed image, appended after existing ones by default."""
    with transaction.atomic():
        stats = product.images.aggregate(total=Count("id"), last=Max("position"))
        if stats["total"] >= MAX_IMAGES_PER_PRODUCT:
            raise ValidationError(
                {"image": [f"A product can have at most {MAX_IMAGES_PER_PRODUCT} images."]}
            )
        if position is None:
            position = 0 if stats["last"] is None else stats["last"] + 1
        return ProductImage.objects.create(
            product=product, image=image, alt_text=alt_text, position=position
        )


def reorder_product_images(product, ordered_ids):
    """Set image positions to match `ordered_ids`, which must list every image once."""
    with transaction.atomic():
        images = {image.id: image for image in product.images.all()}
        if len(ordered_ids) != len(set(ordered_ids)) or set(ordered_ids) != set(images):
            raise ValidationError({"order": ["List every image of this product exactly once."]})
        ordered = []
        for position, image_id in enumerate(ordered_ids):
            image = images[image_id]
            image.position = position
            ordered.append(image)
        ProductImage.objects.bulk_update(ordered, ["position"])
    return ordered
