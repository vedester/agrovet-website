import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.website.models import SiteSettings

pytestmark = pytest.mark.django_db


def test_load_creates_the_single_row_once():
    first = SiteSettings.load()
    second = SiteSettings.load()
    assert first.pk == second.pk == 1
    assert SiteSettings.objects.count() == 1


def test_current_never_writes_and_provides_defaults():
    defaults = SiteSettings.current()
    assert SiteSettings.objects.count() == 0
    assert defaults.whatsapp_greeting
    assert len(defaults.opening_hours) == 7


def test_only_one_row_can_exist():
    SiteSettings(business_name="A").save()

    # A second row would reuse id 1, so the primary key refuses it.
    with pytest.raises(IntegrityError), transaction.atomic():
        SiteSettings(business_name="B").save()

    # Bypassing save() with another id is stopped by the CHECK constraint.
    with pytest.raises(IntegrityError), transaction.atomic():
        SiteSettings.objects.bulk_create([SiteSettings(id=2)])

    assert SiteSettings.objects.count() == 1
    assert SiteSettings.objects.get().business_name == "A"


def test_settings_cannot_be_deleted():
    with pytest.raises(RuntimeError):
        SiteSettings.load().delete()


def test_clean_normalises_the_whatsapp_number():
    settings_row = SiteSettings(whatsapp_number="0712 345 678")
    settings_row.clean()
    assert settings_row.whatsapp_number == "254712345678"

    settings_row.whatsapp_number = "12345"
    with pytest.raises(ValidationError) as error:
        settings_row.clean()
    assert "whatsapp_number" in error.value.message_dict
