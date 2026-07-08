from django.contrib import admin

from .models import ChessGame


@admin.register(ChessGame)
class ChessGameAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "creator", "white", "black", "result", "updated_at")
    list_filter = ("status", "result")
    readonly_fields = ("created_at", "updated_at")
