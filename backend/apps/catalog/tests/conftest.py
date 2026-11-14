import pytest

from apps.catalog.models import Category
from apps.catalog.tests.helpers import make_product


@pytest.fixture
def category(db):
    return Category.objects.create(name="Veterinary Drugs")


@pytest.fixture
def product(category):
    return make_product(category, "VET-001", name="Ivermectin 1% Injection", pack_size="50 ml")
