import io
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

User = get_user_model()


def _img_bytes(fmt="PNG", size=(24, 24)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (10, 20, 30)).save(buf, format=fmt)
    return buf.getvalue()


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class WorkoutImageUploadTests(APITestCase):
    """The workouts endpoint reuses the same Pillow validation as posts, so its
    (currently app-unused but still reachable) image upload can't store
    arbitrary/malicious files."""

    def setUp(self):
        self.user = User.objects.create_user(username="u", email="u@x.com", password="pw")
        self.client.force_authenticate(self.user)

    def test_valid_image_accepted(self):
        img = SimpleUploadedFile("p.png", _img_bytes("PNG"), "image/png")
        res = self.client.post("/api/workouts/", {"name": "Visit", "images": img}, format="multipart")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(len(res.data["images"]), 1)
        self.assertTrue(res.data["images"][0].endswith(".png"))

    def test_non_image_rejected(self):
        bad = SimpleUploadedFile("p.png", b"not really an image", "image/png")
        res = self.client.post("/api/workouts/", {"name": "Visit", "images": bad}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_svg_rejected(self):
        svg = SimpleUploadedFile("x.svg", b"<svg><script>alert(1)</script></svg>", "image/svg+xml")
        res = self.client.post("/api/workouts/", {"name": "Visit", "images": svg}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_no_image_still_works(self):
        res = self.client.post("/api/workouts/", {"name": "Visit"}, format="multipart")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["images"], [])
