
import os
import dj_database_url #type:ignore

from .base import *


# Production mode
DEBUG = False

# Security
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")
    if host.strip()
]

if not ALLOWED_HOSTS:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS is not configured.")


# PostgreSQL database
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured.")

DATABASES = {
    "default": dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=0,
        ssl_require=True,
    )
}


# Frontend origin
FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")

CORS_ALLOWED_ORIGINS = (
    [FRONTEND_URL] if FRONTEND_URL else []
)

CSRF_TRUSTED_ORIGINS = (
    [FRONTEND_URL] if FRONTEND_URL else []
)

CORS_ALLOW_CREDENTIALS = True


# HTTPS configuration for Vercel
SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)

SECURE_SSL_REDIRECT = True

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
JWT_AUTH_COOKIE_SECURE = True


# Cookie configuration
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
JWT_AUTH_COOKIE_SAMESITE = "Lax"


# Security headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
