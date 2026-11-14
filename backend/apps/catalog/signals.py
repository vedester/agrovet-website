from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Category, ProductImage


def _delete_file_after_commit(field_file) -> None:
    """Remove the stored file once the DB delete has really committed."""
    if field_file and field_file.name:
        storage, name = field_file.storage, field_file.name
        transaction.on_commit(lambda: storage.delete(name))


@receiver(post_delete, sender=ProductImage)
def delete_product_image_file(sender, instance, **kwargs):
    _delete_file_after_commit(instance.image)


@receiver(post_delete, sender=Category)
def delete_category_image_file(sender, instance, **kwargs):
    _delete_file_after_commit(instance.image)
