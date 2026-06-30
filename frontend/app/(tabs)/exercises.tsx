import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useExerciseStore } from "@/store/useExerciseStore";
import { useThemeColors } from "@/store/useThemeStore";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";

export default function ExercisesScreen() {
  const exercises = useExerciseStore((s) => s.exercises);
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  return (
    <View className="flex-1 px-4 pt-4" style={{ backgroundColor: colors.background }}>
      <View
        className="flex-row items-center rounded-lg px-3 mb-4 border"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search dishes"
          placeholderTextColor={colors.placeholder}
          className="flex-1 py-2 px-2"
          style={{ color: colors.text }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/exercise/${item.id}`)}
            className="rounded-lg p-4 mb-3 flex-row justify-between items-center border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text className="text-base font-medium" style={{ color: colors.text }}>
              {item.name}
            </Text>
            <Text className="text-sm capitalize" style={{ color: colors.muted }}>
              {item.muscleGroup}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="text-center mt-4" style={{ color: colors.muted }}>
            No dishes match "{query}"
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      <Pressable
        onPress={() => setIsCreateModalVisible(true)}
        className="border border-blue-600 rounded-xl py-3 items-center mb-3"
      >
        <Text className="text-blue-600 font-medium">+ Add Custom Dish</Text>
      </Pressable>

      <ExercisePickerModal
        visible={isCreateModalVisible}
        startInCreateMode
        onClose={() => setIsCreateModalVisible(false)}
        onSelect={() => setIsCreateModalVisible(false)}
      />
    </View>
  );
}
