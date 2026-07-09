from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import ChessGame

User = get_user_model()

E4_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
E5_FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"


class ChessFlowTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", email="a@x.com", password="pw")
        self.bob = User.objects.create_user(username="bob", email="b@x.com", password="pw")

    def test_full_game_flow(self):
        # Alice creates a game as white
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/chess/games/", {"color": "white"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        gid = res.data["id"]
        self.assertEqual(res.data["status"], "waiting")
        self.assertEqual(res.data["white"]["username"], "alice")
        self.assertEqual(res.data["my_color"], "white")

        # It shows in Bob's open list, not Alice's
        self.client.force_authenticate(self.bob)
        openlist = self.client.get("/api/chess/games/?filter=open").data
        ids = [g["id"] for g in openlist.get("results", openlist)]
        self.assertIn(gid, ids)

        self.client.force_authenticate(self.alice)
        openlist = self.client.get("/api/chess/games/?filter=open").data
        ids = [g["id"] for g in openlist.get("results", openlist)]
        self.assertNotIn(gid, ids)  # own game excluded from joinable

        # Bob joins -> active, black
        self.client.force_authenticate(self.bob)
        res = self.client.post(f"/api/chess/games/{gid}/join/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "active")
        self.assertEqual(res.data["black"]["username"], "bob")
        self.assertEqual(res.data["turn"], "white")

        # Bob cannot move (white to move)
        res = self.client.post(
            f"/api/chess/games/{gid}/move/",
            {"from": "e2", "to": "e4", "san": "e4", "fen": E4_FEN, "is_game_over": False},
            format="json",
        )
        self.assertEqual(res.status_code, 403, res.data)

        # Alice (white) moves e4
        self.client.force_authenticate(self.alice)
        res = self.client.post(
            f"/api/chess/games/{gid}/move/",
            {"from": "e2", "to": "e4", "san": "e4", "fen": E4_FEN, "is_game_over": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["moves"], ["e4"])
        self.assertEqual(res.data["turn"], "black")
        self.assertEqual(res.data["last_move"], {"from": "e2", "to": "e4"})

        # Alice cannot move again
        res = self.client.post(
            f"/api/chess/games/{gid}/move/",
            {"from": "d2", "to": "d4", "san": "d4", "fen": E4_FEN, "is_game_over": False},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

        # Bob moves e5
        self.client.force_authenticate(self.bob)
        res = self.client.post(
            f"/api/chess/games/{gid}/move/",
            {"from": "e7", "to": "e5", "san": "e5", "fen": E5_FEN, "is_game_over": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["moves"], ["e4", "e5"])

        # Alice resigns -> Bob (black) wins
        self.client.force_authenticate(self.alice)
        res = self.client.post(f"/api/chess/games/{gid}/resign/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "finished")
        self.assertEqual(res.data["result"], "black")
        self.assertEqual(res.data["winner"]["username"], "bob")

    def test_checkmate_sets_winner(self):
        self.client.force_authenticate(self.alice)
        gid = self.client.post("/api/chess/games/", {"color": "white"}, format="json").data["id"]
        self.client.force_authenticate(self.bob)
        self.client.post(f"/api/chess/games/{gid}/join/")

        # White claims a checkmating move
        self.client.force_authenticate(self.alice)
        res = self.client.post(
            f"/api/chess/games/{gid}/move/",
            {
                "from": "d1", "to": "h5", "san": "Qh5#",
                "fen": "rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2",
                "is_game_over": True, "result": "white",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "finished")
        self.assertEqual(res.data["result"], "white")
        self.assertEqual(res.data["winner"]["username"], "alice")

    def test_requires_auth(self):
        res = self.client.get("/api/chess/games/")
        self.assertEqual(res.status_code, 401)

    def test_players_omit_email(self):
        # Nested player fields must not leak PII (email / is_staff).
        self.client.force_authenticate(self.alice)
        gid = self.client.post("/api/chess/games/", {"color": "white"}, format="json").data["id"]
        self.client.force_authenticate(self.bob)
        res = self.client.post(f"/api/chess/games/{gid}/join/")
        for field in ("creator", "white", "black"):
            player = res.data[field]
            if player is not None:
                self.assertIn("username", player)
                self.assertNotIn("email", player)
                self.assertNotIn("is_staff", player)

    def test_creator_can_cancel_waiting_game(self):
        self.client.force_authenticate(self.alice)
        gid = self.client.post("/api/chess/games/", {"color": "white"}, format="json").data["id"]

        # Non-creator cannot cancel
        self.client.force_authenticate(self.bob)
        res = self.client.post(f"/api/chess/games/{gid}/cancel/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(ChessGame.objects.filter(pk=gid).exists())

        # Creator cancels -> row deleted
        self.client.force_authenticate(self.alice)
        res = self.client.post(f"/api/chess/games/{gid}/cancel/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(ChessGame.objects.filter(pk=gid).exists())

    def test_cannot_cancel_active_game(self):
        self.client.force_authenticate(self.alice)
        gid = self.client.post("/api/chess/games/", {"color": "white"}, format="json").data["id"]
        self.client.force_authenticate(self.bob)
        self.client.post(f"/api/chess/games/{gid}/join/")  # now active

        self.client.force_authenticate(self.alice)
        res = self.client.post(f"/api/chess/games/{gid}/cancel/")
        self.assertEqual(res.status_code, 400)
        self.assertTrue(ChessGame.objects.filter(pk=gid).exists())
