from django.db import transaction


def delete_file_after_commit(storage, name) -> None:
    """Delete a stored file once the surrounding DB transaction has committed."""
    if name:
        transaction.on_commit(lambda: storage.delete(name))
