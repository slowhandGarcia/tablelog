import os
from uuid import uuid4

from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Comment, CommunityPost
from .serializers import CommentSerializer, CommunityPostSerializer


class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author_id == request.user.id


def _save_uploaded_images(files, request):
    """Saves each uploaded file under MEDIA_ROOT/posts/ and returns their
    absolute URLs, so `images` always holds URLs the client can render
    directly — whether the post was created on this device or another."""
    urls = []
    for f in files:
        ext = os.path.splitext(f.name)[1]
        path = default_storage.save(f"posts/{uuid4().hex}{ext}", f)
        urls.append(request.build_absolute_uri(default_storage.url(path)))
    return urls


class CommunityPostViewSet(viewsets.ModelViewSet):
    """Full CRUD at /api/posts/, plus:
      - POST      /api/posts/{id}/like/      toggle a like
      - GET/POST  /api/posts/{id}/comments/  list / add comments

    Reads are public; writes require auth and ownership. Images are sent
    as multipart files under the `images` field; they're stored on disk
    and their URLs saved to the post's `images` JSON list."""

    queryset = CommunityPost.objects.all().prefetch_related("comments__author", "likes")
    serializer_class = CommunityPostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def create(self, request, *args, **kwargs):
        image_files = request.FILES.getlist("images")
        gif_url = request.data.get("gif_url", "").strip()

        # For multipart requests, DRF's request.data merges file objects
        # into the same dict as the text fields under the "images" key, which
        # the `images` JSONField then chokes on. Drop it here — the URLs we
        # actually want to store get set explicitly below, after upload.
        data = request.data.copy()
        if image_files:
            data.pop("images", None)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        image_urls = _save_uploaded_images(image_files, request) if image_files else []

        # Append a remote GIF URL (e.g. from Giphy) after uploaded images.
        # Only allow https to avoid storing plaintext http references.
        if gif_url and gif_url.startswith("https://"):
            image_urls.append(gif_url)

        post = serializer.save(author=request.user, images=image_urls)
        headers = self.get_success_headers(serializer.data)
        return Response(
            self.get_serializer(post).data, status=status.HTTP_201_CREATED, headers=headers
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        if post.likes.filter(pk=request.user.pk).exists():
            post.likes.remove(request.user)
            liked = False
        else:
            post.likes.add(request.user)
            liked = True
        return Response({"liked": liked, "like_count": post.likes.count()})

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="comments",
        permission_classes=[permissions.IsAuthenticatedOrReadOnly],
    )
    def comments(self, request, pk=None):
        # get_object_or_404 here, not self.get_object(): the latter would run
        # IsAuthorOrReadOnly's object check against this *post*, which would
        # wrongly restrict commenting to the post's own author. Any
        # authenticated user may comment on any post.
        post = get_object_or_404(self.get_queryset(), pk=pk)

        if request.method == "GET":
            serializer = CommentSerializer(
                post.comments.all(), many=True, context=self.get_serializer_context()
            )
            return Response(serializer.data)

        data = request.data.copy()
        data["post"] = post.pk
        serializer = CommentSerializer(data=data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommentViewSet(viewsets.ModelViewSet):
    """Full CRUD at /api/comments/?post={id}."""

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def get_queryset(self):
        queryset = Comment.objects.all().select_related("author")
        post_id = self.request.query_params.get("post")
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
