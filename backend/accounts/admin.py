from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ["email"]
    list_display = ["email", "username", "is_staff", "is_active", "date_joined"]
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Profile", {"fields": ("bio", "location", "avatar_url")}),
    )
