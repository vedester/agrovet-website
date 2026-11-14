import pytest
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def _clear_cache():
    """Reset throttle counters so tests never trip rate limits."""
    cache.clear()


@pytest.fixture(autouse=True)
def _isolated_media_root(settings, tmp_path):
    """Uploaded test files go to a temp dir, never into the real media folder."""
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def staff_client(django_user_model):
    user = django_user_model.objects.create_user(
        email="owner@example.com", password="x", is_staff=True
    )
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def plain_client(django_user_model):
    user = django_user_model.objects.create_user(email="customer@example.com", password="x")
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def anon_client():
    return APIClient()
