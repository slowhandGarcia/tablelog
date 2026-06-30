from django.conf import settings
from django.db import models
from django.utils import timezone


class Workout(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workouts"
    )
    name = models.CharField(max_length=120)
    # Not auto_now_add: that would silently ignore the client-supplied start
    # time and stamp every workout with its *sync* time instead (sync only
    # happens once, at finish) — defaults to now only when the client omits it.
    date = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    body_weight = models.FloatField(null=True, blank=True)
    weight_unit = models.CharField(max_length=4, default="kg")
    notes = models.TextField(blank=True, default="")
    images = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.name} ({self.user})"


class ExerciseSet(models.Model):
    """One logged set of one exercise within a workout. The exercise
    *library* (name/muscle group lookup) lives in the Expo app's seeded
    constants, not here — this just records what was done, in order."""

    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="sets")
    exercise_name = models.CharField(max_length=120)
    reps = models.PositiveIntegerField(default=0)
    weight = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.exercise_name}: {self.reps} x {self.weight}"
