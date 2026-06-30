import { View, Text } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { useExerciseStore } from "@/store/useExerciseStore";
import { useWorkoutStore } from "@/store/useWorkoutStore";
import { useThemeColors } from "@/store/useThemeStore";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExerciseStore((s) => s.exercises.find((e) => e.id === id));
  const workouts = useWorkoutStore((s) => s.workouts);
  const colors = useThemeColors();

  const history = workouts
    .filter((w) => w.exercises.some((we) => we.exerciseId === id))
    .flatMap((w) =>
      w.exercises
        .filter((we) => we.exerciseId === id)
        .map((we) => ({ date: w.date, sets: we.sets }))
    );

  return (
    <View className="flex-1 px-4 pt-4" style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: exercise?.name ?? "Dish" }} />
      <Text className="text-xl font-bold mb-1" style={{ color: colors.text }}>
        {exercise?.name ?? "Dish"}
      </Text>
      <Text className="capitalize mb-4" style={{ color: colors.muted }}>
        {exercise?.muscleGroup}
      </Text>

      <Text className="text-base font-semibold mb-2" style={{ color: colors.muted }}>
        Order History
      </Text>
      {history.length === 0 ? (
        <Text style={{ color: colors.muted }}>No history for this dish yet.</Text>
      ) : (
        history.map((entry, idx) => (
          <View
            key={idx}
            className="rounded-lg p-3 mb-2 border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text className="text-sm mb-1" style={{ color: colors.muted }}>
              {new Date(entry.date).toLocaleDateString()}
            </Text>
            <Text style={{ color: colors.text }}>
              {entry.sets.map((s) => `${s.reps}x $${s.weight}`).join(", ") || "No items"}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
