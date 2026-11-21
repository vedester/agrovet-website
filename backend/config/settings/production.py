"""Production settings. Hardened; values come from the environment."""

import os
import urllib.parse
from .base import *  # noqa: F403


def _csv_env(name: str, default: str = "") -> list[str]:
  raw = os.environ.get(name, default)
  return [item.strip() for item in raw.split(",") if item.strip()]


def _bool_env(name: str, default: bool) -> bool:
  raw = os.environ.get(name)
  if raw is None:
    return default
  return raw.strip().lower() in {"1", "true", "yes", "on"}


def _build_databases_from_url(db_url: str) -> dict:
  parsed = urllib.parse.urlparse(db_url)
  if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname:
    raise RuntimeError("DATABASE_URL must be a valid PostgreSQL connection URI.")

  # Supabase Transaction Pooler runs on port 6543 and requires disabling
  # server-side cursors at the Django database config level (not inside OPTIONS).
  return {
      "default": {
          "ENGINE": "django.db.backends.postgresql",
          "NAME": parsed.path.lstrip("/") or "postgres",
          "USER": urllib.parse.unquote(parsed.username or ""),
          "PASSWORD": urllib.parse.unquote(parsed.password or ""),
          "HOST": parsed.hostname,
          "PORT": str(parsed.port or 6543),
          "CONN_MAX_AGE": int(os.environ.get("DB_CONN_MAX_AGE", "60")),
          "DISABLE_SERVER_SIDE_CURSORS": True,
          "OPTIONS": {
              "sslmode": os.environ.get("DB_SSLMODE", "require"),
          },
      }
  }


DEBUG = False

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

ALLOWED_HOSTS = _csv_env("ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
  raise RuntimeError("ALLOWED_HOSTS must be set in production.")

CORS_ALLOWED_ORIGINS = _csv_env("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = _csv_env("CSRF_TRUSTED_ORIGINS")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = _bool_env("SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = _bool_env("SESSION_COOKIE_SECURE", True)
CSRF_COOKIE_SECURE = _bool_env("CSRF_COOKIE_SECURE", True)
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = _bool_env("SECURE_HSTS_INCLUDE_SUBDOMAINS", True)
SECURE_HSTS_PRELOAD = _bool_env("SECURE_HSTS_PRELOAD", True)
SECURE_CONTENT_TYPE_NOSNIFF = _bool_env("SECURE_CONTENT_TYPE_NOSNIFF", True)

# --- Database (Supabase Transaction Pooler) ---
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if not DATABASE_URL:
  raise RuntimeError("DATABASE_URL must be set in production.")
DATABASES = _build_databases_from_url(DATABASE_URL)

# --- Supabase Storage ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
if not SUPABASE_URL:
  raise RuntimeError("SUPABASE_URL must be set in production.")

SUPABASE_STORAGE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "media").strip()
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "").strip()

if not SUPABASE_SECRET_KEY:
  raise RuntimeError("SUPABASE_SECRET_KEY must be set in production.")