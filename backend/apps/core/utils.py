from django.db.models import Model
from django.utils.text import slugify


def unique_slugify(instance: Model, source: str, *, field: str = "slug") -> str:
    """Return a slug for `source` that is unique within the instance's model."""
    model = type(instance)
    max_length = model._meta.get_field(field).max_length
    base = slugify(source)[:max_length] or "item"

    queryset = model._default_manager.all()
    if instance.pk:
        queryset = queryset.exclude(pk=instance.pk)

    candidate = base
    suffix = 2
    while queryset.filter(**{field: candidate}).exists():
        tail = f"-{suffix}"
        candidate = f"{base[: max_length - len(tail)]}{tail}"
        suffix += 1
    return candidate
