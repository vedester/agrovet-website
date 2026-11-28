"""Automated test settings."""

from .base import *  # noqa: F403

DEBUG = False

SECRET_KEY = "test-only-secret-key-for-local-automated-testing-2026"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

MEDIA_ROOT = BASE_DIR / "test-media"