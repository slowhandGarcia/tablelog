from django.contrib import admin

from .models import Comment, CommunityPost

admin.site.register(CommunityPost)
admin.site.register(Comment)
