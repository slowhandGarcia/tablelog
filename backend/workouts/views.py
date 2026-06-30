import json
import os
from uuid import uuid4

from django.core.files.storage import default_storage
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .models import Workout
from .serializers import WorkoutSerializer


def _save_uploaded_images(files, request):
    """Saves each uploaded file under MEDIA_ROOT/workouts/ and returns their
    absolute URLs, mirroring the same pattern used for community post images."""
    urls = []
    for f in files:
        ext = os.path.splitext(f.name)[1]
        path = default_storage.save(f"workouts/{uuid4().hex}{ext}", f)
        urls.append(request.build_absolute_uri(default_storage.url(path)))
    return urls


class WorkoutViewSet(viewsets.ModelViewSet):
    """Full CRUD at /api/workouts/ — scoped to the authenticated user.

    The Expo app only ever calls create() once, when a workout is finished
    (in-progress editing stays local) — so create() is where both the nested
    `sets[]` and any photos need handling for a multipart request:
      - `images` files are uploaded here and replaced with their URLs.
      - `sets` arrives as a JSON-encoded string in multipart requests (nested
        list fields can't be expressed as plain form fields), so it's
        decoded back into a list before validation.
    """

    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        """Mirror the same data normalisation as create() so PATCH requests
        that arrive as multipart (rare but possible) are handled consistently."""
        partial = kwargs.pop("partial", False)

        if hasattr(request.data, "getlist"):
            data = {key: request.data.get(key) for key in request.data}
        else:
            data = dict(request.data)

        sets_raw = data.get("sets")
        if isinstance(sets_raw, str):
            data["sets"] = json.loads(sets_raw)

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        workout = serializer.save()
        return Response(self.get_serializer(workout).data)

    def create(self, request, *args, **kwargs):
        image_files = request.FILES.getlist("images")

        if hasattr(request.data, "getlist"):
            # request.data is a QueryDict (multipart/form), which DRF treats
            # as "HTML input" — its many=True `sets` field would then try to
            # parse Django formset-style bracket keys (`sets[0]exercise_name`)
            # instead of reading our single JSON-encoded string, and silently
            # return []. Copying into a plain dict opts back into normal
            # (non-HTML-form) parsing.
            data = {key: request.data.get(key) for key in request.data}
        else:
            data = dict(request.data)

        if image_files:
            data.pop("images", None)

        sets_raw = data.get("sets")
        if isinstance(sets_raw, str):
            data["sets"] = json.loads(sets_raw)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        image_urls = _save_uploaded_images(image_files, request) if image_files else []

        workout = serializer.save(images=image_urls)
        headers = self.get_success_headers(serializer.data)
        return Response(
            self.get_serializer(workout).data, status=status.HTTP_201_CREATED, headers=headers
        )
