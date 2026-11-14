import re

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
_ALLOWED_KEYS = {"day", "closed", "opens", "closes"}
_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

# The storefront renders these as links, so only https:// is accepted.
https_url = URLValidator(schemes=["https"], message="Use a full link starting with https://")


def default_opening_hours() -> list[dict]:
    hours = [
        {"day": day, "closed": False, "opens": "08:00", "closes": "18:00"} for day in DAYS[:6]
    ]
    hours.append({"day": "sun", "closed": True, "opens": "", "closes": ""})
    return hours


def validate_opening_hours(value) -> None:
    """Seven entries, Monday to Sunday, each closed or with 24-hour open/close times."""
    if not isinstance(value, list) or len(value) != len(DAYS):
        raise ValidationError("Opening hours must list all seven days, Monday to Sunday.")
    for expected, entry in zip(DAYS, value, strict=True):
        if not isinstance(entry, dict) or entry.get("day") != expected:
            raise ValidationError(f'The entry for "{expected}" is missing or out of order.')
        if set(entry) - _ALLOWED_KEYS:
            raise ValidationError(f'"{expected}" has unexpected fields.')
        closed = entry.get("closed")
        if not isinstance(closed, bool):
            raise ValidationError(f'"{expected}": closed must be true or false.')
        if closed:
            continue
        opens, closes = entry.get("opens"), entry.get("closes")
        times_ok = all(isinstance(t, str) and _TIME.match(t) for t in (opens, closes))
        if not times_ok:
            raise ValidationError(f'"{expected}": use 24-hour times like 08:00 and 18:00.')
        if opens >= closes:
            raise ValidationError(f'"{expected}": closing time must be after opening time.')
