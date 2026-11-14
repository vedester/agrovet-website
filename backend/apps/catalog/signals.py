from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.core.files import delete_file_after_commit

from .models import Category, ProductImage


@receiver(post_delete, sender=ProductImage)
def delete_product_image_file(sender, instance, **kwargs):
    delete_file_after_commit(instance.image.storage, instance.image.name)


@receiver(post_delete, sender=Category)
def delete_category_image_file(sender, instance, **kwargs):
    delete_file_after_commit(instance.image.storage, instance.image.name)
