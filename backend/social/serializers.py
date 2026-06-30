from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Comment, CommunityPost


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "post", "author", "text", "created_at"]
        read_only_fields = ["id", "author", "created_at"]


class CommunityPostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    like_count = serializers.IntegerField(source="likes.count", read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = [
            "id",
            "author",
            "text",
            "images",
            "created_at",
            "comments",
            "like_count",
            "is_liked",
        ]
        read_only_fields = ["id", "author", "created_at", "comments", "like_count", "is_liked"]

    def get_is_liked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and obj.likes.filter(pk=user.pk).exists())
