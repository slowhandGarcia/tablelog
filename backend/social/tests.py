import io
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase

from .validators import MAX_IMAGES_PER_POST, validate_image, validate_images

User = get_user_model()


def make_image_bytes(fmt="PNG", size=(24, 24)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (120, 80, 40)).save(buf, format=fmt)
    return buf.getvalue()


def upload(name, data, content_type):
    return SimpleUploadedFile(name, data, content_type=content_type)


class ImageValidatorTests(TestCase):
    def test_accepts_png_jpeg_webp(self):
        self.assertEqual(validate_image(upload("a.png", make_image_bytes("PNG"), "image/png")), ".png")
        self.assertEqual(validate_image(upload("a.jpg", make_image_bytes("JPEG"), "image/jpeg")), ".jpg")
        self.assertEqual(validate_image(upload("a.webp", make_image_bytes("WEBP"), "image/webp")), ".webp")

    def test_extension_comes_from_content_not_filename(self):
        # A real JPEG uploaded with a lying ".png" name is stored as .jpg.
        ext = validate_image(upload("evil.png", make_image_bytes("JPEG"), "image/png"))
        self.assertEqual(ext, ".jpg")

    def test_rejects_non_image(self):
        with self.assertRaises(ValidationError):
            validate_image(upload("x.png", b"<html>not an image</html>", "image/png"))

    def test_rejects_disallowed_format(self):
        # GIF is a valid image but not in the allow-list.
        with self.assertRaises(ValidationError):
            validate_image(upload("x.gif", make_image_bytes("GIF"), "image/gif"))

    def test_rejects_svg(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        with self.assertRaises(ValidationError):
            validate_image(upload("x.svg", svg, "image/svg+xml"))

    def test_rejects_empty(self):
        with self.assertRaises(ValidationError):
            validate_image(upload("x.png", b"", "image/png"))

    def test_rejects_too_many_images(self):
        files = [upload("a.png", make_image_bytes("PNG"), "image/png") for _ in range(MAX_IMAGES_PER_POST + 1)]
        with self.assertRaises(ValidationError):
            validate_images(files)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class PostImageUploadEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="poster", email="p@x.com", password="pw")
        self.client.force_authenticate(self.user)

    def test_valid_image_creates_post(self):
        img = upload("photo.png", make_image_bytes("PNG"), "image/png")
        res = self.client.post("/api/posts/", {"text": "hi", "images": [img]}, format="multipart")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(len(res.data["images"]), 1)
        self.assertTrue(res.data["images"][0].endswith(".png"))

    def test_invalid_image_rejected(self):
        bad = upload("photo.png", b"totally not an image", "image/png")
        res = self.client.post("/api/posts/", {"text": "hi", "images": [bad]}, format="multipart")
        self.assertEqual(res.status_code, 400)


class PostAuthorPrivacyTests(APITestCase):
    """Post/comment author must not leak PII (email / is_staff)."""

    def setUp(self):
        self.user = User.objects.create_user(username="alice", email="alice@x.com", password="pw")
        self.client.force_authenticate(self.user)

    def _first(self, data):
        return data["results"][0] if isinstance(data, dict) and "results" in data else data[0]

    def test_post_author_omits_email_and_staff(self):
        self.client.post("/api/posts/", {"text": "hello"}, format="json")
        res = self.client.get("/api/posts/")
        author = self._first(res.data)["author"]
        self.assertEqual(author["username"], "alice")
        self.assertNotIn("email", author)
        self.assertNotIn("is_staff", author)
        # Public profile fields remain available.
        for field in ("id", "avatar_url", "bio", "location"):
            self.assertIn(field, author)

    def test_comment_author_omits_email(self):
        post_id = self.client.post("/api/posts/", {"text": "p"}, format="json").data["id"]
        self.client.post(f"/api/posts/{post_id}/comments/", {"text": "c"}, format="json")
        res = self.client.get(f"/api/posts/{post_id}/comments/")
        author = self._first(res.data)["author"]
        self.assertNotIn("email", author)
        self.assertNotIn("is_staff", author)
