from rest_framework.routers import DefaultRouter

from .views import ChessGameViewSet

router = DefaultRouter()
router.register("games", ChessGameViewSet, basename="chess-game")

urlpatterns = router.urls
