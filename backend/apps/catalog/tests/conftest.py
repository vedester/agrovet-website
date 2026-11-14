import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Category
from apps.catalog.tests.helpers import make_product


@pytest.fixture
def category(db):
    return Category.objects.create(name="Veterinary Drugs")


@pytest.fixture
def product(category):
    return make_product(category, "VET-001", name="Ivermectin 1% Injection", pack_size="50 ml")


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
