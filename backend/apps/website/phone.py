"""WhatsApp number normalisation (Kenya is the default country)."""
import re

_KENYAN_MOBILE = re.compile(r"^254[17]\d{8}$")

EMPTY_MESSAGE = "Enter a mobile number, for example 0712 345 678."
PREFIX_MESSAGE = "Start the number with 0 (for example 0712 345 678) or with +country code."
KENYA_MESSAGE = "Enter a Kenyan mobile number such as 0712 345 678 or 0112 345 678."
LENGTH_MESSAGE = "That number does not look right."


def normalise_whatsapp(raw: str) -> str:
    """Return digits only, in international form without "+" (what wa.me expects).

    Accepts 0712 345 678, 0112345678, 712345678, +254 712 345 678, and
    international numbers written with + or 00. Raises ValueError otherwise.
    """
    text = raw.strip()
    digits = re.sub(r"\D", "", text)
    international = text.startswith(("+", "00"))
    if text.startswith("00"):
        digits = digits[2:]
    if not digits:
        raise ValueError(EMPTY_MESSAGE)

    if not international:
        if digits.startswith("0") and len(digits) == 10:
            digits = "254" + digits[1:]
        elif len(digits) == 9 and digits[0] in "17":
            digits = "254" + digits
        elif not digits.startswith("254"):
            raise ValueError(PREFIX_MESSAGE)

    if digits.startswith("254"):
        if not _KENYAN_MOBILE.match(digits):
            raise ValueError(KENYA_MESSAGE)
    elif not 8 <= len(digits) <= 15:
        raise ValueError(LENGTH_MESSAGE)
    return digits
