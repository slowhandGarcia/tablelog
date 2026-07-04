from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from accounts.views import ConfirmRegistrationWebView, PasswordResetWebView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("workouts.urls")),
    path("api/", include("social.urls")),
    # Web redirect pages — https:// links in emails open these, which then
    # deep-link into the app via tablelog://. Must live outside /api/ so they
    # return HTML, not JSON.
    path("auth/confirm-registration/", ConfirmRegistrationWebView.as_view(), name="web-confirm-registration"),
    path("auth/reset-password/", PasswordResetWebView.as_view(), name="web-reset-password"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
