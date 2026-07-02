"""
Django settings for the TableLog backend.

Environment variables (see .env.example):
    SECRET_KEY, DEBUG, ALLOWED_HOSTS, DATABASE_URL, CORS_ALLOWED_ORIGINS
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-change-me-in-production")
DEBUG = os.environ.get("DEBUG", "True") == "True"

# The literal known production domain, kept as a hardcoded fallback
# independent of whether RAILWAY_PUBLIC_DOMAIN actually gets injected (its
# presence depends on Railway's "public networking" being enabled for this
# service) — so a misconfigured/missing env var can't silently take the
# whole site down with DisallowedHost or CSRF "Origin checking failed".
# TODO: replace this with your TableLog Railway deployment domain.
RAILWAY_STATIC_DOMAIN = "tablelog-production.up.railway.app"

ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h
]
ALLOWED_HOSTS.append(RAILWAY_STATIC_DOMAIN)
# Railway serves the app behind a *.up.railway.app domain — allow it
# automatically when the platform injects this variable too (covers a
# custom domain or a Railway-assigned one that differs from the above).
railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN")
if railway_domain:
    ALLOWED_HOSTS.append(railway_domain)

# In DEBUG, a physical phone on Expo Go hits this server via your computer's
# LAN IP (e.g. 192.168.x.x), which Django would otherwise reject with
# DisallowedHost since that IP isn't in the list above. "*" is only safe
# because it's gated behind DEBUG — production (DEBUG=False) still uses the
# explicit ALLOWED_HOSTS/RAILWAY_PUBLIC_DOMAIN values from above.
if DEBUG:
    ALLOWED_HOSTS = ["*"]


# CSRF + reverse-proxy trust — Railway terminates TLS at its edge and proxies
# plain HTTP to this container, so without the settings below Django either
# doesn't realize the request was actually HTTPS, or doesn't trust the
# Origin header at all, surfacing as:
#   "CSRF verification failed... Origin checking failed - https://<domain>
#    does not match any trusted origins."
# This hits django.contrib.admin and the DRF browsable API (both use
# session+CSRF auth); the JWT-authenticated mobile API endpoints aren't
# affected by CSRF at all (DRF only enforces it for SessionAuthentication).

# Tells Django to trust the X-Forwarded-Proto header Railway's proxy sets,
# so request.is_secure() (and anything derived from it, e.g. CSRF's own
# scheme check) correctly evaluates to True instead of treating every
# proxied request as plain HTTP.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Required since Django 4: every full origin (scheme + host, no path) that's
# allowed to make unsafe (POST/PUT/PATCH/DELETE) requests with cookies, e.g.
# logging into /admin/. Both schemes are listed per the request, though in
# practice Railway only ever serves https externally — the plain-http entry
# is harmless and just means it's never matched.
#
# These two are *unconditional* — not a fallback used only when the env var
# is unset. A previous version used `os.environ.get("CSRF_TRUSTED_ORIGINS",
# default)`, which meant setting the env var at all (even to a slightly
# malformed value — missing scheme, stray space, trailing slash) silently
# discarded this known-good default and reintroduced the exact same "Origin
# checking failed" error. Any CSRF_TRUSTED_ORIGINS env var is now purely
# additive on top of this, never a replacement for it.
CSRF_TRUSTED_ORIGINS = [
    f"https://{RAILWAY_STATIC_DOMAIN}",
    f"http://{RAILWAY_STATIC_DOMAIN}",
]
if railway_domain:
    CSRF_TRUSTED_ORIGINS += [f"https://{railway_domain}", f"http://{railway_domain}"]

_extra_csrf_origins = [
    o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()
]
for _origin in _extra_csrf_origins:
    # Django 4+ hard-crashes at startup (SystemCheckError) if ANY entry here
    # lacks a scheme — not a soft warning, the whole process refuses to boot.
    # A bare-domain env var (the easy mistake to make) would otherwise take
    # the entire site down rather than "just" leaving CSRF broken, so a
    # missing scheme is corrected to https:// instead of passed through.
    if not _origin.startswith(("http://", "https://")):
        _origin = f"https://{_origin}"
    if _origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin)

# Cookies (session + CSRF) only sent over HTTPS once in production. Left
# False in DEBUG so local http://127.0.0.1 dev keeps working without https.
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG

# Redirect any stray plain-HTTP request to HTTPS in production. Safe to
# enable here specifically because SECURE_PROXY_SSL_HEADER above means
# Django correctly recognizes Railway-proxied requests as already secure —
# without that, this setting alone would redirect-loop every request.
SECURE_SSL_REDIRECT = not DEBUG


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "accounts",
    "workouts",
    "social",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# Falls back to local SQLite when DATABASE_URL isn't set (e.g. local dev).
# Railway injects DATABASE_URL automatically when a Postgres plugin is attached.

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}


AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static files — served by whitenoise so no separate static host is needed on Railway.

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Post images — saved to local disk and served by Django itself in DEBUG
# (see config/urls.py). For production this should move to real object
# storage (e.g. S3); local disk doesn't survive a Railway redeploy.
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django REST Framework

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}


# CORS — the Expo app calls this API from a different origin in dev (and
# from the device itself in production), so explicit origins are required.
# http://localhost:19006 is the Expo web/dev default; override via env for
# anything else (LAN IP for physical devices, production app origin, etc).
#
# In DEBUG, allow every origin unconditionally — Expo Go on a physical
# device, the iOS simulator, Android emulator, and the web target can all
# send different/missing Origin headers, and locking that down during local
# development isn't worth the friction. CORS_ALLOWED_ORIGINS below is what
# actually takes effect once DEBUG=False (production on Railway).

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:19006").split(",")
    if o
]
CORS_ALLOW_ALL_ORIGINS = DEBUG


# Email
# Local dev  (DEBUG=True): emails are printed to the console — no credentials needed.
# Production (DEBUG=False): Resend SMTP relay — set EMAIL_HOST_PASSWORD and
#   DEFAULT_FROM_EMAIL in Railway (see .env.example for descriptions).
# Temporarily forced to console regardless of DEBUG until SMTP env vars are
# confirmed loading correctly on Railway. Switch back to the block below once
# EMAIL_HOST_PASSWORD is verified in Railway variables.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# SMTP config kept for when the above is reverted:
# if DEBUG:
#     EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
# else:
#     EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
#     EMAIL_HOST = "smtp.resend.com"
#     EMAIL_PORT = 587
#     EMAIL_USE_TLS = True
#     EMAIL_HOST_USER = "resend"
#     EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@tablelog.local")

# Base URL of the Expo app — used to build the link inside verification/reset emails.
# Production/TestFlight: "tablelog:/" triggers the app's registered deep-link scheme.
#   Combined with the path prefix (e.g. /auth/confirm-registration) this produces
#   tablelog:///auth/... which iOS/Android correctly route into the running app.
# Local dev: override with the Expo tunnel URL printed by "npx expo start --tunnel"
#   so tapping a link in the email opens Expo Go on your physical device.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "tablelog:/")


# Brute-force login protection — override via env vars on Railway if needed.
LOGIN_MAX_ATTEMPTS = int(os.environ.get("LOGIN_MAX_ATTEMPTS", "5"))
LOGIN_LOCKOUT_MINUTES = int(os.environ.get("LOGIN_LOCKOUT_MINUTES", "15"))
