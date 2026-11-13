import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache():
    """Reset throttle counters so tests never trip rate limits."""
    cache.clear()
