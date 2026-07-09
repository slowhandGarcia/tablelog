from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from rest_framework.test import APITestCase

from accounts.views import _app_redirect_html, _is_safe_token

User = get_user_model()


class SafeTokenTests(TestCase):
    def test_accepts_url_safe(self):
        self.assertTrue(_is_safe_token("Abc123_-=."))
        self.assertTrue(_is_safe_token("cq2k9v-3f7ad9e0b1"))  # django reset-token shape

    def test_rejects_bad_input(self):
        for bad in ["", 'a"b', "a b", "</script>", '"};alert(1)//', "a<b", "x" * 513]:
            self.assertFalse(_is_safe_token(bad), bad)


class RedirectPageXSSTests(TestCase):
    def setUp(self):
        self.client = Client()

    # ── Confirm-registration page ─────────────────────────────────────────────
    def test_confirm_valid_token_renders(self):
        r = self.client.get("/auth/confirm-registration/", {"token": "abcDEF123_-"}, secure=True)
        self.assertEqual(r.status_code, 200)
        self.assertIn("abcDEF123_-", r.content.decode())

    def test_confirm_rejects_js_breakout(self):
        r = self.client.get(
            "/auth/confirm-registration/",
            {"token": '";alert(document.domain);//'},
            secure=True,
        )
        self.assertEqual(r.status_code, 400)
        body = r.content.decode()
        # The attacker payload must not be reflected anywhere in the response.
        self.assertNotIn("alert(document.domain)", body)
        self.assertNotIn("document.domain", body)

    def test_confirm_rejects_script_tag_breakout(self):
        r = self.client.get(
            "/auth/confirm-registration/",
            {"token": "</script><script>alert(1)</script>"},
            secure=True,
        )
        self.assertEqual(r.status_code, 400)
        self.assertNotIn("<script>alert(1)</script>", r.content.decode())

    def test_confirm_missing_token_rejected(self):
        r = self.client.get("/auth/confirm-registration/", secure=True)
        self.assertEqual(r.status_code, 400)

    # ── Reset-password page ───────────────────────────────────────────────────
    def test_reset_valid_renders(self):
        r = self.client.get(
            "/auth/reset-password/", {"uid": "MQ", "token": "cq2k9v-3f7ad9e0"}, secure=True
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("cq2k9v-3f7ad9e0", r.content.decode())

    def test_reset_rejects_xss_uid(self):
        r = self.client.get(
            "/auth/reset-password/",
            {"uid": '"><img src=x onerror=alert(1)>', "token": "abc"},
            secure=True,
        )
        self.assertEqual(r.status_code, 400)
        self.assertNotIn("onerror=alert(1)", r.content.decode())


class RedirectHtmlEscapingTests(TestCase):
    """Defense-in-depth: the HTML helper neutralizes a dangerous URL even if a
    caller ever passes attacker-influenced input past the validators."""

    def test_escapes_both_contexts(self):
        html = _app_redirect_html(
            "H", "B", "L", app_url='"};</script><script>alert(1)</script>'
        )
        # No executable injected script survives.
        self.assertNotIn("<script>alert(1)</script>", html)
        self.assertNotIn("</script><script>", html)
        # href is HTML-escaped ...
        self.assertIn("&quot;};", html)
        # ... and the inline-script value is JS/unicode-escaped.
        self.assertIn("\\u003c/script\\u003e", html)


class MeEndpointTests(APITestCase):
    """The full UserSerializer (with email/is_staff) is only for own data."""

    def test_me_includes_own_email(self):
        user = User.objects.create_user(username="me", email="me@x.com", password="pw")
        self.client.force_authenticate(user)
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["email"], "me@x.com")
        self.assertIn("is_staff", res.data)
