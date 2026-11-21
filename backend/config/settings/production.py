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

# --- Supabase Storage (S3-compatible) ---

SUPABASE_S3_ENDPOINT = os.environ["SUPABASE_S3_ENDPOINT"].strip()
SUPABASE_S3_REGION = os.environ.get(
    "SUPABASE_S3_REGION", "eu-west-1"
).strip()

SUPABASE_STORAGE_BUCKET = os.environ.get(
    "SUPABASE_STORAGE_BUCKET", "media"
).strip()

AWS_ACCESS_KEY_ID = os.environ["SUPABASE_S3_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["SUPABASE_S3_SECRET_ACCESS_KEY"]

AWS_STORAGE_BUCKET_NAME = SUPABASE_STORAGE_BUCKET
AWS_S3_ENDPOINT_URL = SUPABASE_S3_ENDPOINT
AWS_S3_REGION_NAME = SUPABASE_S3_REGION
AWS_S3_CUSTOM_DOMAIN = (
    "nxmruecdnsgwobsjnybf.supabase.co/storage/v1/object/public/media"
)

AWS_S3_ADDRESSING_STYLE = "path"
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}