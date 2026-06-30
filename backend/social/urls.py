from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, CommunityPostViewSet

router = DefaultRouter()
router.register("posts", CommunityPostViewSet, basename="post")
router.register("comments", CommentViewSet, basename="comment")

urlpatterns = router.urls
