"""Image upload validation for community posts.

Security posture: never trust the client. The uploaded filename, extension and
Content-Type are all attacker-controlled, so we decode the bytes with Pillow and
derive the real format from that. Only JPEG/PNG/WEBP raster images within size
and dimension limits are accepted; anything else (SVG-with-script, HTML, a
renamed .php, a truncated/corrupt file, a decompression bomb) is rejected.
"""

import io

from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB per image
MAX_IMAGE_PIXELS = 50_000_000  # 50 MP — reject oversized / decompression-bomb images
MAX_IMAGES_PER_POST = 10

_MB = MAX_IMAGE_BYTES // (1024 * 1024)

# Pillow's detected format -> the canonical extension we store the file under.
# We only ever use this map's value; the client's original extension is ignored.
# MPO is the multi-frame JPEG some phones (e.g. iPhones) produce — treat as JPEG.
_ALLOWED_FORMATS = {
    "JPEG": ".jpg",
    "MPO": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}


def validate_image(f) -> str:
    """Validate a single uploaded file. Returns the canonical extension
    (".jpg"/".png"/".webp") to store it under. Raises DRF ``ValidationError``
    (HTTP 400) if the file isn't an acceptable image. Leaves the file's read
    pointer reset to 0 so the caller can save it afterwards.
    """
    # Fast reject on declared size when the backend provides it.
    size = getattr(f, "size", None)
    if size is not None and size > MAX_IMAGE_BYTES:
        raise ValidationError(f"Each image must be {_MB} MB or smaller.")

    try:
        f.seek(0)
        data = f.read()
    finally:
        f.seek(0)

    if not data:
        raise ValidationError("Uploaded image is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValidationError(f"Each image must be {_MB} MB or smaller.")

    # 1) Identify the real format + dimensions from the header.
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = (img.format or "").upper()
            width, height = img.size
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValidationError("File is not a valid image.")

    if fmt not in _ALLOWED_FORMATS:
        raise ValidationError("Unsupported image type. Please use JPG, PNG or WEBP.")

    if width * height > MAX_IMAGE_PIXELS:
        raise ValidationError("Image dimensions are too large.")

    # 2) Integrity check on a fresh handle — verify() consumes the image object,
    #    so it must run on its own Image instance.
    try:
        with Image.open(io.BytesIO(data)) as img2:
            img2.verify()
    except Exception:  # noqa: BLE001 — any decode failure means reject
        raise ValidationError("Image appears to be corrupted.")

    return _ALLOWED_FORMATS[fmt]


def validate_images(files) -> list[str]:
    """Validate every uploaded file up-front (so a later file being invalid
    can't leave earlier ones already written). Returns the list of canonical
    extensions, aligned with ``files``.
    """
    if len(files) > MAX_IMAGES_PER_POST:
        raise ValidationError(f"You can attach at most {MAX_IMAGES_PER_POST} images.")
    return [validate_image(f) for f in files]
