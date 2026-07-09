from rest_framework import serializers

from accounts.serializers import PublicUserSerializer

from .models import ChessGame


class ChessGameSerializer(serializers.ModelSerializer):
    creator = PublicUserSerializer(read_only=True)
    white = PublicUserSerializer(read_only=True)
    black = PublicUserSerializer(read_only=True)
    winner = PublicUserSerializer(read_only=True)
    turn = serializers.CharField(source="side_to_move", read_only=True)
    my_color = serializers.SerializerMethodField()

    class Meta:
        model = ChessGame
        fields = [
            "id",
            "creator",
            "white",
            "black",
            "winner",
            "fen",
            "moves",
            "last_move",
            "status",
            "result",
            "turn",
            "my_color",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_my_color(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            return None
        if obj.white_id == user.id:
            return "white"
        if obj.black_id == user.id:
            return "black"
        return None
