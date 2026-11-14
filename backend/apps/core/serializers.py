import copy

from .files import delete_file_after_commit


class ModelCleanSerializerMixin:
    """Run the model's clean() on API writes, matching the Django admin's rules."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        candidate = copy.copy(self.instance) if self.instance else self.Meta.model()
        for name, value in attrs.items():
            setattr(candidate, name, value)
        candidate.clean()
        return attrs


class DeleteReplacedFileMixin:
    """Remove the previous file from storage when a file field is replaced."""

    file_field = "image"

    def update(self, instance, validated_data):
        old = getattr(instance, self.file_field)
        storage, old_name = old.storage, old.name
        instance = super().update(instance, validated_data)
        if self.file_field in validated_data:
            delete_file_after_commit(storage, old_name)
        return instance
