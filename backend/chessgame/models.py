from django.conf import settings
from django.db import models

# Standard chess starting position (Forsyth–Edwards Notation).
STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


class ChessGame(models.Model):
    """A single online chess match.

    Move legality is validated on the client with chess.js (the source of
    truth for the rules); the server owns the authoritative game record and
    enforces *whose turn it is* and *who is allowed to move*. It stores the
    current FEN plus the SAN move history so a client can rebuild the board
    at any time by polling the game.
    """

    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting for opponent"
        ACTIVE = "active", "In progress"
        FINISHED = "finished", "Finished"
        ABORTED = "aborted", "Aborted"

    class Result(models.TextChoices):
        WHITE = "white", "White wins"
        BLACK = "black", "Black wins"
        DRAW = "draw", "Draw"

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chess_created"
    )
    white = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="chess_as_white",
        null=True,
        blank=True,
    )
    black = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="chess_as_black",
        null=True,
        blank=True,
    )
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="chess_won",
        null=True,
        blank=True,
    )

    fen = models.TextField(default=STARTING_FEN)
    moves = models.JSONField(default=list, blank=True)   # list of SAN strings
    last_move = models.JSONField(default=dict, blank=True)  # {"from": "e2", "to": "e4"}

    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.WAITING
    )
    result = models.CharField(max_length=10, choices=Result.choices, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"ChessGame #{self.pk} ({self.status})"

    @property
    def side_to_move(self):
        """'white' or 'black', parsed from the active-color field of the FEN."""
        try:
            return "white" if self.fen.split(" ")[1] == "w" else "black"
        except (IndexError, AttributeError):
            return "white"
