import random

from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import STARTING_FEN, ChessGame
from .serializers import ChessGameSerializer


class ChessGameViewSet(viewsets.ModelViewSet):
    """Online chess at /api/chess/games/.

    List filters (?filter=):
      - open  (default) — games waiting for an opponent that you may join
      - mine            — games you're playing (waiting or active)

    Custom actions:
      - POST /api/chess/games/{id}/join/    take the empty seat, game goes active
      - POST /api/chess/games/{id}/move/    submit a move (must be your turn)
      - POST /api/chess/games/{id}/resign/  forfeit; the opponent wins
    """

    serializer_class = ChessGameSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ChessGame.objects.select_related("creator", "white", "black", "winner")
        which = self.request.query_params.get("filter", "open")

        if which == "mine":
            return qs.filter(
                Q(white=user) | Q(black=user) | Q(creator=user)
            ).filter(status__in=[ChessGame.Status.WAITING, ChessGame.Status.ACTIVE])

        if self.action == "list":
            # Joinable games: still waiting, created by someone else, with a free seat.
            return qs.filter(status=ChessGame.Status.WAITING).exclude(creator=user)

        return qs

    def create(self, request, *args, **kwargs):
        color = (request.data.get("color") or "random").lower()
        if color not in ("white", "black", "random"):
            color = "random"
        if color == "random":
            color = random.choice(("white", "black"))

        game = ChessGame.objects.create(
            creator=request.user,
            white=request.user if color == "white" else None,
            black=request.user if color == "black" else None,
            fen=STARTING_FEN,
            status=ChessGame.Status.WAITING,
        )
        return Response(self._data(game), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        with transaction.atomic():
            game = ChessGame.objects.select_for_update().get(pk=pk)

            if game.status != ChessGame.Status.WAITING:
                return Response({"detail": "This game is no longer open."}, status=400)
            if request.user.id in (game.white_id, game.black_id):
                return Response({"detail": "You're already in this game."}, status=400)

            if game.white_id is None:
                game.white = request.user
            else:
                game.black = request.user
            game.status = ChessGame.Status.ACTIVE
            game.save(update_fields=["white", "black", "status", "updated_at"])

        return Response(self._data(game))

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        with transaction.atomic():
            game = ChessGame.objects.select_for_update().get(pk=pk)

            if game.status != ChessGame.Status.ACTIVE:
                return Response({"detail": "Game is not in progress."}, status=400)

            mover = game.white if game.side_to_move == "white" else game.black
            if mover is None or mover.id != request.user.id:
                return Response({"detail": "It's not your move."}, status=403)

            new_fen = request.data.get("fen")
            san = request.data.get("san")
            frm = request.data.get("from")
            to = request.data.get("to")
            if not new_fen or not san or not frm or not to:
                return Response({"detail": "Missing move data."}, status=400)

            game.fen = new_fen
            game.moves = list(game.moves) + [san]
            game.last_move = {"from": frm, "to": to}

            if request.data.get("is_game_over"):
                game.status = ChessGame.Status.FINISHED
                result = request.data.get("result")
                if result in (ChessGame.Result.WHITE, ChessGame.Result.BLACK, ChessGame.Result.DRAW):
                    game.result = result
                    if result == ChessGame.Result.WHITE:
                        game.winner = game.white
                    elif result == ChessGame.Result.BLACK:
                        game.winner = game.black

            game.save()

        return Response(self._data(game))

    @action(detail=True, methods=["post"])
    def resign(self, request, pk=None):
        with transaction.atomic():
            game = ChessGame.objects.select_for_update().get(pk=pk)

            if game.status not in (ChessGame.Status.ACTIVE, ChessGame.Status.WAITING):
                return Response({"detail": "Game already over."}, status=400)
            if request.user.id not in (game.white_id, game.black_id):
                return Response({"detail": "You're not in this game."}, status=403)

            game.status = ChessGame.Status.FINISHED
            if request.user.id == game.white_id:
                game.result = ChessGame.Result.BLACK
                game.winner = game.black
            else:
                game.result = ChessGame.Result.WHITE
                game.winner = game.white
            game.save(update_fields=["status", "result", "winner", "updated_at"])

        return Response(self._data(game))

    def _data(self, game):
        return ChessGameSerializer(game, context=self.get_serializer_context()).data
