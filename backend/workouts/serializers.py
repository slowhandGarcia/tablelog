from rest_framework import serializers

from .models import ExerciseSet, Workout


class ExerciseSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseSet
        fields = ["id", "exercise_name", "reps", "weight", "completed", "order"]


class WorkoutSerializer(serializers.ModelSerializer):
    """Accepts a nested `sets[]` list on create/update so the whole workout
    can be saved in a single request, mirroring the shape the Expo app
    already builds locally in useWorkoutStore."""

    sets = ExerciseSetSerializer(many=True, required=False)

    class Meta:
        model = Workout
        fields = [
            "id",
            "name",
            "date",
            "completed_at",
            "body_weight",
            "weight_unit",
            "notes",
            "images",
            "sets",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        sets_data = validated_data.pop("sets", [])
        workout = Workout.objects.create(user=self.context["request"].user, **validated_data)
        self._save_sets(workout, sets_data)
        return workout

    def update(self, instance, validated_data):
        sets_data = validated_data.pop("sets", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if sets_data is not None:
            instance.sets.all().delete()
            self._save_sets(instance, sets_data)
        return instance

    @staticmethod
    def _save_sets(workout, sets_data):
        for set_data in sets_data:
            ExerciseSet.objects.create(workout=workout, **set_data)
