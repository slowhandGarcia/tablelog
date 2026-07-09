"""Response security headers that Django's SecurityMiddleware doesn't manage.

Adds a Content-Security-Policy and Permissions-Policy to every response.
Django 4.2 has no built-in CSP support (that arrives in Django 6.0), so this
lightweight, dependency-free middleware fills the gap.

CSP notes:
  - This backend serves JSON to the mobile app plus a small amount of HTML
    (the admin, and the /auth/* email-redirect pages which use one inline
    <style> and one inline <script>). `'unsafe-inline'` is therefore allowed
    for style/script so those keep working; every other directive is locked
    down. The high-value protections here are `object-src 'none'`,
    `base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'none'`
    (clickjacking), plus `default-src 'self'` blocking off-origin loads.
  - User-generated content (posts, etc.) is delivered as JSON to a native
    client, never rendered into an HTML page by this server, so the residual
    inline-script XSS surface is limited to first-party admin/redirect HTML.
  - `setdefault` is used so an individual view can override the policy for its
    own response if it ever needs something stricter or looser.
"""

CSP_POLICY = "; ".join(
    [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
    ]
)

# Deny access to powerful browser features for any HTML this server serves.
PERMISSIONS_POLICY = ", ".join(
    [
        "accelerometer=()",
        "camera=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
        "interest-cohort=()",
    ]
)


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("Content-Security-Policy", CSP_POLICY)
        response.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        # Explicit belt-and-suspenders (Django also sets these via settings).
        response.setdefault("X-Content-Type-Options", "nosniff")
        return response
