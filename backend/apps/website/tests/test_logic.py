import pytest
from django.core.exceptions import ValidationError

from apps.website.phone import normalise_whatsapp
from apps.website.validators import default_opening_hours, validate_opening_hours


def with_day(index, **changes):
    hours = default_opening_hours()
    hours[index] = {**hours[index], **changes}
    return hours


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("0712 345 678", "254712345678"),
        ("+254 712-345-678", "254712345678"),
        ("254712345678", "254712345678"),
        ("0112345678", "254112345678"),
        ("712345678", "254712345678"),
        ("+44 7911 123456", "447911123456"),
        ("0044 7911 123456", "447911123456"),
    ],
)
def test_whatsapp_numbers_are_normalised(raw, expected):
    assert normalise_whatsapp(raw) == expected


@pytest.mark.parametrize(
    "raw", ["", "abc", "12345", "0551234567", "+254 512 345678", "447911123456"]
)
def test_bad_whatsapp_numbers_are_rejected(raw):
    with pytest.raises(ValueError):
        normalise_whatsapp(raw)


def test_default_opening_hours_are_valid():
    validate_opening_hours(default_opening_hours())


def test_a_closed_day_needs_no_times():
    validate_opening_hours(with_day(0, closed=True, opens="", closes=""))


@pytest.mark.parametrize(
    "hours",
    [
        "closed all week",
        default_opening_hours()[:6],
        list(reversed(default_opening_hours())),
        with_day(0, opens="8am"),
        with_day(0, opens="19:00"),
        with_day(0, closed="no"),
        with_day(0, extra="x"),
    ],
)
def test_bad_opening_hours_are_rejected(hours):
    with pytest.raises(ValidationError):
        validate_opening_hours(hours)
