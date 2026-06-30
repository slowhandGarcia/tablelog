import { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, TextInput, FlatList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useExerciseStore } from "@/store/useExerciseStore";
import { useThemeColors } from "@/store/useThemeStore";
import type { Exercise, MuscleGroup } from "@/types";

const MUSCLE_GROUPS: MuscleGroup[] = [
  "starters",
  "mains",
  "sides",
  "desserts",
  "drinks",
  "specials",
  "breakfast",
  "snacks",
];

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  startInCreateMode?: boolean;
}

export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  startInCreateMode = false,
}: ExercisePickerModalProps) {
  const exercises = useExerciseStore((s) => s.exercises);
  const addExercise = useExerciseStore((s) => s.addExercise);
  const colors = useThemeColors();

  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscleGroup, setNewMuscleGroup] = useState<MuscleGroup>("starters");

  useEffect(() => {
    if (visible && startInCreateMode) setIsCreating(true);
  }, [visible, startInCreateMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  const reset = () => {
    setQuery("");
    setIsCreating(false);
    setNewName("");
    setNewMuscleGroup("starters");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    handleClose();
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    addExercise({ name, muscleGroup: newMuscleGroup });
    const created = useExerciseStore
      .getState()
      .exercises.find((e) => e.name === name && e.isCustom);
    if (created) handleSelect(created);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 pt-14 px-4" style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            {isCreating ? "New Dish" : "Add Dish"}
          </Text>
          <Pressable onPress={handleClose} className="p-1">
            <Ionicons name="close" size={26} color={colors.muted} />
          </Pressable>
        </View>

        {isCreating ? (
          <View>
            <Text className="text-sm mb-1" style={{ color: colors.muted }}>
              Name
            </Text>
            <TextInput
              autoFocus
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Tiramisu"
              placeholderTextColor={colors.placeholder}
              className="rounded-lg px-3 py-2 mb-4 border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
            />

            <Text className="text-sm mb-2" style={{ color: colors.muted }}>
              Course
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {MUSCLE_GROUPS.map((group) => (
                <Pressable
                  key={group}
                  onPress={() => setNewMuscleGroup(group)}
                  className={`px-3 py-1.5 rounded-full border ${
                    newMuscleGroup === group ? "bg-blue-600 border-blue-600" : ""
                  }`}
                  style={newMuscleGroup === group ? undefined : { borderColor: colors.border }}
                >
                  <Text
                    className="capitalize text-sm"
                    style={{ color: newMuscleGroup === group ? "#ffffff" : colors.muted }}
                  >
                    {group}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={!newName.trim()}
              className="rounded-xl py-3 items-center mb-3"
              style={{ backgroundColor: newName.trim() ? "#2563eb" : colors.surface }}
            >
              <Text
                className="font-semibold"
                style={{ color: newName.trim() ? "#ffffff" : colors.muted }}
              >
                Add & Select
              </Text>
            </Pressable>
            <Pressable onPress={() => setIsCreating(false)} className="items-center py-2">
              <Text style={{ color: colors.muted }}>Back to list</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              className="flex-row items-center rounded-lg px-3 mb-4 border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Ionicons name="search" size={18} color={colors.placeholder} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises"
                placeholderTextColor={colors.placeholder}
                className="flex-1 py-2 px-2"
                style={{ color: colors.text }}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  className="rounded-lg p-3 mb-2 flex-row justify-between items-center border"
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
              onPress={() => {
                setIsCreating(true);
                setNewName(query);
              }}
              className="border border-blue-600 rounded-xl py-3 items-center mb-6"
            >
              <Text className="text-blue-600 font-medium">+ Create Custom Dish</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}
