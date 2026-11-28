import pytest

from apps.catalog.models import Category
from apps.catalog.tests.helpers import make_product


@pytest.fixture
def category(db):
    return Category.objects.create(name="Inventory Test Category")


@pytest.fixture
def product(category):
    return make_product(
        category,
        "INV-001",
        name="Inventory Test Product",
        pack_size="1 kg",
    )

@pytest.fixture
def actor(django_user_model, db):
    user = django_user_model.objects.create_user(
        email="inventory-staff@example.com",
        password="TestPassword123!",
    )
    user.is_staff = True
    user.save(update_fields=["is_staff"])
    return user
