import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache():
    """Reset throttle counters so tests never trip rate limits."""
    cache.clear()


@pytest.fixture(autouse=True)
def _isolated_media_root(settings, tmp_path):
    """Uploaded test files go to a temp dir, never into the real media folder."""
    settings.MEDIA_ROOT = tmp_path
