import { useEffect } from "react";
import { View, Text, Pressable, FlatList, Alert, RefreshControl, StyleSheet } from "react-native";
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

export default function HomeScreen() {
  const workouts = useWorkoutStore((s) => s.workouts);
  const isLoading = useWorkoutStore((s) => s.isLoading);
  const fetchWorkouts = useWorkoutStore((s) => s.fetchWorkouts);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const deleteWorkout = useWorkoutStore((s) => s.deleteWorkout);
  const colors = useThemeColors();

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const recent = workouts.slice(0, 5);

  const onStartWorkout = () => {
    const id = startWorkout(`Visit ${new Date().toLocaleDateString()}`);
    router.push(`/workout/${id}`);
  };

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
        data={recent}
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
        ListHeaderComponent={
          <View>
            {/* Hero start button */}
            <Pressable
              onPress={onStartWorkout}
              className="rounded-2xl mb-6 overflow-hidden active:opacity-90"
              style={styles.hero}
            >
              <View className="px-5 py-5 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Log a Visit</Text>
                  <Text className="text-blue-200 text-sm mt-0.5">Record your dining experience</Text>
                </View>
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                >
                  <Ionicons name="restaurant" size={24} color="#ffffff" />
                </View>
              </View>
            </Pressable>

            {/* Section header */}
            <Text
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: colors.muted }}
            >
              Recent Visits
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.surface }}
            >
              <Ionicons name="restaurant-outline" size={28} color={colors.muted} />
            </View>
            <Text className="text-sm" style={{ color: colors.muted }}>
              No visits logged yet. Start one above!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            className="rounded-xl mb-3 overflow-hidden flex-row items-stretch"
            style={{ backgroundColor: colors.surface }}
          >
            {/* Left accent bar */}
            <View className="w-1 bg-blue-600" />

            <Pressable
              onPress={() => router.push(`/workout/${item.id}`)}
              className="flex-1 px-4 py-3.5"
            >
              <Text className="font-semibold text-base" style={{ color: colors.text }}>
                {item.name}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1">
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

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#1d4ed8",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
});
