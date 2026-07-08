from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChessGame",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fen", models.TextField(default="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")),
                ("moves", models.JSONField(blank=True, default=list)),
                ("last_move", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("waiting", "Waiting for opponent"), ("active", "In progress"), ("finished", "Finished"), ("aborted", "Aborted")], default="waiting", max_length=10)),
                ("result", models.CharField(blank=True, choices=[("white", "White wins"), ("black", "Black wins"), ("draw", "Draw")], default="", max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("black", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="chess_as_black", to=settings.AUTH_USER_MODEL)),
                ("creator", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chess_created", to=settings.AUTH_USER_MODEL)),
                ("white", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="chess_as_white", to=settings.AUTH_USER_MODEL)),
                ("winner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="chess_won", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
