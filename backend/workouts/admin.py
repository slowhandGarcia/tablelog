from django.contrib import admin

from .models import ExerciseSet, Workout

admin.site.register(Workout)
admin.site.register(ExerciseSet)
