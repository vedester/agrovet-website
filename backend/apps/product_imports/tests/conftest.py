import pytest

from apps.catalog.models import Category


@pytest.fixture
def vet(db):
    return Category.objects.create(name="Veterinary Drugs")


@pytest.fixture
def feeds(db):
    return Category.objects.create(name="Animal Feeds")
