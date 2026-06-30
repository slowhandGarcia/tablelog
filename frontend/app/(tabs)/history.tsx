import { useEffect } from "react";
import { View, Text, FlatList, Pressable, Alert, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useWorkoutStore } from "@/store/useWorkoutStore";
import { useThemeColors } from "@/store/useThemeStore";
import type { Workout } from "@/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryScreen() {
  const workouts = useWorkoutStore((s) => s.workouts);
  const isLoading = useWorkoutStore((s) => s.isLoading);
  const fetchWorkouts = useWorkoutStore((s) => s.fetchWorkouts);
  const deleteWorkout = useWorkoutStore((s) => s.deleteWorkout);
  const completed = workouts.filter((w) => w.completedAt);
  const colors = useThemeColors();

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const confirmDelete = (workout: Workout) => {
    Alert.alert("Delete this visit?", workout.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteWorkout(workout.id);
          if (!result.success) Alert.alert("Couldn't delete visit", result.error);
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <FlatList
        data={completed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchWorkouts}
            tintColor={colors.muted}
            colors={["#3b82f6"]}
          />
        }
        ListEmptyComponent={
          <View className="items-center py-16">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.surface }}
            >
              <Ionicons name="time-outline" size={28} color={colors.muted} />
            </View>
            <Text className="font-semibold mb-1" style={{ color: colors.text }}>
              No completed visits
            </Text>
            <Text className="text-sm" style={{ color: colors.muted }}>
              Finish a visit to see it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            className="rounded-xl mb-3 overflow-hidden flex-row items-stretch"
            style={{ backgroundColor: colors.surface }}
          >
            {/* Left accent bar — green for completed */}
            <View className="w-1 bg-emerald-500" />

            <Pressable
              onPress={() => router.push(`/workout/${item.id}`)}
              className="flex-1 px-4 py-3.5"
            >
              <Text className="font-semibold text-base" style={{ color: colors.text }}>
                {item.name}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                <Ionicons name="calendar-outline" size={12} color={colors.muted} />
                <Text className="text-xs" style={{ color: colors.muted }}>
                  {formatDate(item.date)}
                </Text>
                {item.exercises.length > 0 && (
                  <>
                    <Text style={{ color: colors.border }}>·</Text>
                    <Text className="text-xs" style={{ color: colors.muted }}>
                      {item.exercises.length} dish{item.exercises.length !== 1 ? "es" : ""}
                    </Text>
                  </>
                )}
                {item.bodyWeight !== undefined && (
                  <>
                    <Text style={{ color: colors.border }}>·</Text>
                    <Text className="text-xs" style={{ color: colors.muted }}>
                      {item.bodyWeight} {item.weightUnit ?? "kg"}
                    </Text>
                  </>
                )}
              </View>
            </Pressable>

            <Pressable
              onPress={() => confirmDelete(item)}
              className="px-4 items-center justify-center"
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
