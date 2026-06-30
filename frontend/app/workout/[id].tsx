import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { useWorkoutStore } from "@/store/useWorkoutStore";
import { useExerciseStore } from "@/store/useExerciseStore";
import { useThemeColors } from "@/store/useThemeStore";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { FullScreenImageViewer } from "@/components/FullScreenImageViewer";
import { PhotoGallery } from "@/components/PhotoGallery";
import type { MuscleGroup, Workout, WeightUnit } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KG_TO_LBS = 2.20462;

function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  const converted = from === "kg" ? value * KG_TO_LBS : value / KG_TO_LBS;
  return Math.round(converted * 10) / 10;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatSetLabel(reps: number, weight: number, _unit: WeightUnit): string {
  if (weight === 0) return `${reps}x`;
  return `${reps} × $${weight}`;
}

const CATEGORY_COLORS: Record<MuscleGroup, string> = {
  starters: "#ef4444",
  mains: "#3b82f6",
  sides: "#22c55e",
  desserts: "#f59e0b",
  drinks: "#8b5cf6",
  specials: "#f97316",
  breakfast: "#06b6d4",
  snacks: "#ec4899",
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();

  const workout = useWorkoutStore((s) => s.workouts.find((w) => w.id === id));
  const addSet = useWorkoutStore((s) => s.addSet);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const deleteExercise = useWorkoutStore((s) => s.deleteExercise);
  const addExerciseToWorkout = useWorkoutStore((s) => s.addExerciseToWorkout);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const deleteWorkout = useWorkoutStore((s) => s.deleteWorkout);
  const updateWorkout = useWorkoutStore((s) => s.updateWorkout);
  const revertWorkout = useWorkoutStore((s) => s.revertWorkout);
  const addWorkoutImages = useWorkoutStore((s) => s.addWorkoutImages);
  const removeWorkoutImage = useWorkoutStore((s) => s.removeWorkoutImage);
  const setBodyWeight = useWorkoutStore((s) => s.setBodyWeight);
  const setNotes = useWorkoutStore((s) => s.setNotes);
  const exercises = useExerciseStore((s) => s.exercises);

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Edit mode state — only relevant for completed workouts.
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<Workout | null>(null);
  const [weightText, setWeightText] = useState(() =>
    workout?.bodyWeight !== undefined ? String(workout.bodyWeight) : ""
  );

  // Re-sync weightText only when switching workouts, not on every store update
  // (otherwise typing a trailing "." gets round-tripped through Number() and
  // stripped back to an integer mid-keystroke).
  useEffect(() => {
    setWeightText(workout?.bodyWeight !== undefined ? String(workout.bodyWeight) : "");
  }, [workout?.id]);

  const isCompleted = !!workout?.completedAt;
  // True when the body/set inputs should be shown — always for active
  // workouts, and for completed workouts only while the user is editing.
  const canEdit = !isCompleted || isEditing;

  // ── Edit mode helpers ──────────────────────────────────────────────────────

  const enterEditMode = () => {
    if (!workout) return;
    setSnapshot({ ...workout }); // shallow copy is enough — we restore whole object
    setIsEditing(true);
  };

  const handleDiscardChanges = () => {
    if (snapshot) {
      revertWorkout(workout!.id, snapshot);
      setWeightText(snapshot.bodyWeight !== undefined ? String(snapshot.bodyWeight) : "");
    }
    setIsEditing(false);
    setSnapshot(null);
  };

  const handleSaveChanges = async () => {
    if (!workout) return;
    setIsSaving(true);
    const result = await updateWorkout(workout.id);
    setIsSaving(false);
    if (!result.success) {
      Alert.alert(
        "Couldn't save changes",
        `${result.error}\n\nYour changes are saved on this device — try again when you have a connection.`
      );
      return;
    }
    setIsEditing(false);
    setSnapshot(null);
  };

  // ── Photo handlers ─────────────────────────────────────────────────────────

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setIsViewerVisible(true);
  };

  const pickFromCamera = async (workoutId: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access needed", "Enable camera access in Settings to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      addWorkoutImages(workoutId, [result.assets[0].uri]);
    }
  };

  const pickFromLibrary = async (workoutId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Photo access needed", "Enable photo library access in Settings to choose photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      addWorkoutImages(workoutId, result.assets.map((a) => a.uri));
    }
  };

  const handleAddPhoto = (workoutId: string) => {
    Alert.alert("Add Photo", undefined, [
      { text: "Take Photo", onPress: () => pickFromCamera(workoutId) },
      { text: "Choose from Library", onPress: () => pickFromLibrary(workoutId) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDeletePhoto = (workoutId: string, index: number) => {
    Alert.alert("Delete this photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeWorkoutImage(workoutId, index) },
    ]);
  };

  // ── Workout / exercise / set handlers ─────────────────────────────────────

  const handleDeleteSet = (workoutId: string, workoutExerciseId: string, setId: string) => {
    Alert.alert("Delete this item?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeSet(workoutId, workoutExerciseId, setId),
      },
    ]);
  };

  const handleDeleteExercise = (workoutId: string, workoutExerciseId: string) => {
    Alert.alert("Remove dish?", "All items for this dish will be deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteExercise(workoutId, workoutExerciseId),
      },
    ]);
  };

  const handleDeleteWorkout = (workoutId: string) => {
    Alert.alert("Delete this visit?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          const result = await deleteWorkout(workoutId);
          setIsDeleting(false);
          if (!result.success) {
            Alert.alert("Couldn't delete visit", result.error);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  const handleFinishWorkout = async (workoutId: string) => {
    setIsFinishing(true);
    const result = await finishWorkout(workoutId);
    setIsFinishing(false);
    if (!result.success) {
      Alert.alert(
        "Visit saved, but didn't sync",
        `${result.error}\n\nIt's saved on this device — you can try again later.`
      );
    }
    router.back();
  };

  const handleWeightChange = (text: string) => {
    if (!/^\d*\.?\d*$/.test(text)) return;
    setWeightText(text);
    if (!workout) return;
    const unit = workout.weightUnit ?? "kg";
    if (text === "" || text === ".") {
      setBodyWeight(workout.id, undefined, unit);
      return;
    }
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) setBodyWeight(workout.id, parsed, unit);
  };

  const handleUnitChange = (newUnit: WeightUnit) => {
    if (!workout) return;
    const currentUnit = workout.weightUnit ?? "kg";
    if (newUnit === currentUnit) return;
    const converted =
      workout.bodyWeight !== undefined
        ? convertWeight(workout.bodyWeight, currentUnit, newUnit)
        : undefined;
    setBodyWeight(workout.id, converted, newUnit);
    setWeightText(converted !== undefined ? String(converted) : "");
  };

  const handleGoBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!workout) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Stack.Screen
          options={{
            title: "Visit Details",
            headerLeft: () => (
              <Pressable onPress={handleGoBack} style={styles.headerLeftBtn}>
                <Ionicons name="chevron-back" size={28} color={colors.text} />
              </Pressable>
            ),
          }}
        />
        <Text style={{ color: colors.muted }}>Visit not found.</Text>
      </View>
    );
  }

  const unit = workout.weightUnit ?? "kg";
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]} style={{ backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: isCompleted ? (isEditing ? "Edit Visit" : "Visit Details") : "New Visit",
          headerLeft: () => (
            <Pressable onPress={handleGoBack} hitSlop={12} style={{ marginLeft: -4, padding: 8 }}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          ),
          // "Edit" / "Cancel" in the header — only for completed workouts.
          // Fixed width sized to "Cancel" (the longer label) so React Navigation
          // never shrinks the right slot when the text switches from "Edit".
          headerRight: isCompleted
            ? () => (
                <Pressable
                  onPress={isEditing ? handleDiscardChanges : enterEditMode}
                  style={[
                    styles.headerRightBtn,
                    { backgroundColor: isEditing ? colors.surface : "#3b82f6" },
                  ]}
                >
                  <Text style={[styles.headerAction, { color: isEditing ? colors.text : "#ffffff", textAlign: "center" }]}>
                    {isEditing ? "Cancel" : "Edit"}
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero header ─────────────────────────────────────────────── */}
          <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.workoutName, { color: colors.text }]}>{workout.name}</Text>
            <Text style={[styles.workoutDate, { color: colors.muted }]}>
              {formatDate(workout.date)}
            </Text>

            <View style={styles.chipRow}>
              <View style={[styles.chip, { backgroundColor: colors.background }]}>
                <Ionicons name="restaurant-outline" size={13} color={colors.muted} />
                <Text style={[styles.chipText, { color: colors.muted }]}>
                  {workout.exercises.length} dish{workout.exercises.length !== 1 ? "es" : ""}
                </Text>
              </View>
              {totalSets > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.background }]}>
                  <Ionicons name="layers-outline" size={13} color={colors.muted} />
                  <Text style={[styles.chipText, { color: colors.muted }]}>
                    {totalSets} set{totalSets !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
              {workout.bodyWeight !== undefined && !canEdit && (
                <View style={[styles.chip, { backgroundColor: colors.background }]}>
                  <Ionicons name="people-outline" size={13} color={colors.muted} />
                  <Text style={[styles.chipText, { color: colors.muted }]}>
                    {workout.bodyWeight} guest{workout.bodyWeight !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
              {isEditing && (
                <View style={[styles.chip, { backgroundColor: "#1d4ed822" }]}>
                  <Ionicons name="pencil-outline" size={13} color="#3b82f6" />
                  <Text style={[styles.chipText, { color: "#3b82f6" }]}>Editing</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Body weight ─────────────────────────────────────────────── */}
          {canEdit ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>Party Size</Text>
              <View style={styles.weightRow}>
                <View style={[styles.weightInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="people-outline" size={16} color={colors.muted} />
                  <TextInput
                    style={[styles.weightInput, { color: colors.text }]}
                    placeholderTextColor={colors.placeholder}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    placeholder="Number of guests"
                    value={weightText}
                    onChangeText={handleWeightChange}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {/* ── Notes ───────────────────────────────────────────────────── */}
          {(workout.notes || canEdit) && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>Notes</Text>
              {canEdit ? (
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholderTextColor={colors.placeholder}
                  placeholder="How was your dining experience?"
                  multiline
                  value={workout.notes ?? ""}
                  onChangeText={(t) => setNotes(workout.id, t)}
                />
              ) : (
                <View style={[styles.notesReadOnly, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.notesText, { color: colors.text }]}>{workout.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Photos ──────────────────────────────────────────────────── */}
          {(workout.images.length > 0 || canEdit) && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>Photos</Text>
              <PhotoGallery
                images={workout.images}
                onPressPhoto={openViewer}
                onLongPressPhoto={(index) => handleDeletePhoto(workout.id, index)}
                onAddPhoto={() => handleAddPhoto(workout.id)}
              />
            </View>
          )}

          {/* ── Exercises ───────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Dishes Ordered</Text>

            {workout.exercises.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                <Ionicons name="restaurant-outline" size={28} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  No dishes added yet.
                </Text>
              </View>
            ) : (
              workout.exercises.map((item) => {
                const exercise = exercises.find((e) => e.id === item.exerciseId);
                const accentColor = exercise
                  ? (CATEGORY_COLORS[exercise.muscleGroup] ?? "#3b82f6")
                  : "#3b82f6";

                return (
                  <View key={item.id} style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
                    {/* Left accent bar */}
                    <View style={[styles.exerciseAccent, { backgroundColor: accentColor }]} />

                    <View style={styles.exerciseContent}>
                      {/* Exercise header */}
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseMeta}>
                          <Text style={[styles.exerciseName, { color: colors.text }]}>
                            {exercise?.name ?? "Unknown dish"}
                          </Text>
                          {exercise && (
                            <View style={[styles.muscleBadge, { backgroundColor: accentColor + "22" }]}>
                              <Text style={[styles.muscleBadgeText, { color: accentColor }]}>
                                {exercise.muscleGroup}
                              </Text>
                            </View>
                          )}
                        </View>
                        {canEdit && (
                          <Pressable
                            onPress={() => handleDeleteExercise(workout.id, item.id)}
                            hitSlop={10}
                            style={styles.deleteExerciseBtn}
                          >
                            <Ionicons name="trash-outline" size={17} color="#6b7280" />
                          </Pressable>
                        )}
                      </View>

                      <View style={[styles.divider, { backgroundColor: colors.border }]} />

                      {/* Set column headers */}
                      {item.sets.length > 0 && (
                        <View style={styles.setHeaderRow}>
                          <Text style={[styles.setHeaderCell, styles.setNumCol, { color: colors.muted }]}>
                            ITEM
                          </Text>
                          {canEdit ? (
                            <>
                              <Text style={[styles.setHeaderCell, styles.setInputCol, { color: colors.muted }]}>
                                PRICE
                              </Text>
                              <Text style={[styles.setHeaderCell, styles.setInputCol, { color: colors.muted }]}>
                                QTY
                              </Text>
                              <View style={styles.setDeletePlaceholder} />
                            </>
                          ) : (
                            <Text style={[styles.setHeaderCell, { flex: 1, color: colors.muted }]}>
                              QTY × PRICE
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Set rows */}
                      {item.sets.map((set, idx) =>
                        canEdit ? (
                          <View key={set.id} style={styles.setRow}>
                            <View style={[styles.setNumBadge, { backgroundColor: colors.background }]}>
                              <Text style={[styles.setNumText, { color: colors.muted }]}>{idx + 1}</Text>
                            </View>
                            <TextInput
                              style={[styles.setInput, { backgroundColor: colors.background, color: colors.text }]}
                              placeholderTextColor={colors.placeholder}
                              keyboardType="decimal-pad"
                              placeholder="—"
                              value={set.weight ? String(set.weight) : ""}
                              onChangeText={(v) =>
                                updateSet(workout.id, item.id, set.id, { weight: Number(v) || 0 })
                              }
                            />
                            <Text style={[styles.setX, { color: colors.muted }]}>×</Text>
                            <TextInput
                              style={[styles.setInput, { backgroundColor: colors.background, color: colors.text }]}
                              placeholderTextColor={colors.placeholder}
                              keyboardType="numeric"
                              placeholder="—"
                              value={set.reps ? String(set.reps) : ""}
                              onChangeText={(v) =>
                                updateSet(workout.id, item.id, set.id, { reps: Number(v) || 0 })
                              }
                            />
                            <Pressable
                              onPress={() => handleDeleteSet(workout.id, item.id, set.id)}
                              hitSlop={10}
                              style={styles.setDeleteBtn}
                            >
                              <Ionicons name="close" size={16} color="#6b7280" />
                            </Pressable>
                          </View>
                        ) : (
                          <View key={set.id} style={styles.setRow}>
                            <View style={[styles.setNumBadge, { backgroundColor: colors.background }]}>
                              <Text style={[styles.setNumText, { color: colors.muted }]}>{idx + 1}</Text>
                            </View>
                            <Text style={[styles.setValueText, { color: colors.text }]}>
                              {formatSetLabel(set.reps, set.weight, unit)}
                            </Text>
                          </View>
                        )
                      )}

                      {/* Add item */}
                      {canEdit && (
                        <Pressable onPress={() => addSet(workout.id, item.id)} style={styles.addSetBtn}>
                          <Ionicons name="add" size={15} color="#3b82f6" />
                          <Text style={styles.addSetText}>Add Item</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ── Action buttons ───────────────────────────────────────────── */}
          <View style={styles.actions}>
            {/* Add dish — active visits + edit mode */}
            {canEdit && (
              <Pressable
                onPress={() => setIsPickerVisible(true)}
                style={[styles.addExerciseBtn, { borderColor: "#3b82f6" }]}
              >
                <Ionicons name="add" size={18} color="#3b82f6" />
                <Text style={styles.addExerciseText}>Add Dish</Text>
              </Pressable>
            )}

            {/* Finish visit — active only */}
            {!isCompleted && (
              <Pressable
                onPress={() => handleFinishWorkout(workout.id)}
                disabled={isFinishing}
                style={[styles.finishBtn, { opacity: isFinishing ? 0.7 : 1 }]}
              >
                {isFinishing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.finishBtnText}>Finish Visit</Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Save changes — edit mode for completed workouts */}
            {isCompleted && isEditing && (
              <Pressable
                onPress={handleSaveChanges}
                disabled={isSaving}
                style={[styles.saveBtn, { opacity: isSaving ? 0.7 : 1 }]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Delete visit — always visible */}
            <Pressable
              onPress={() => handleDeleteWorkout(workout.id)}
              disabled={isDeleting}
              style={[styles.deleteBtn, { opacity: isDeleting ? 0.7 : 1 }]}
            >
              {isDeleting ? (
                <ActivityIndicator color="#dc2626" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  <Text style={styles.deleteBtnText}>Delete Visit</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePickerModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={(exercise) => addExerciseToWorkout(workout.id, exercise.id)}
      />

      <FullScreenImageViewer
        visible={isViewerVisible}
        images={workout.images}
        initialIndex={viewerIndex}
        onClose={() => setIsViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  headerLeftBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerRightBtn: {
    width: 80,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAction: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  // Hero
  heroCard: {
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  workoutName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  workoutDate: {
    fontSize: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Sections
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Body weight
  weightRow: {
    flexDirection: "row",
    gap: 10,
  },
  weightInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  weightInput: {
    flex: 1,
    fontSize: 15,
  },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  unitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unitBtnActive: {
    backgroundColor: "#2563eb",
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Notes
  notesReadOnly: {
    borderRadius: 12,
    padding: 14,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Exercise cards
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
  },
  exerciseCard: {
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 12,
  },
  exerciseAccent: {
    width: 4,
  },
  exerciseContent: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  exerciseMeta: {
    flex: 1,
    gap: 5,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  muscleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  muscleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  deleteExerciseBtn: {
    padding: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },

  // Set rows
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    gap: 8,
  },
  setHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  setNumCol: {
    width: 32,
  },
  setInputCol: {
    width: 72,
    textAlign: "center",
  },
  setDeletePlaceholder: {
    width: 28,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  setNumBadge: {
    width: 32,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumText: {
    fontSize: 13,
    fontWeight: "600",
  },
  setValueText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  setInput: {
    width: 72,
    height: 38,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
  },
  setX: {
    fontSize: 14,
    fontWeight: "600",
    width: 12,
    textAlign: "center",
  },
  setDeleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 6,
  },
  addSetText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },

  // Action buttons
  actions: {
    gap: 12,
    paddingTop: 4,
  },
  addExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  addExerciseText: {
    color: "#3b82f6",
    fontSize: 15,
    fontWeight: "600",
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1d4ed8",
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finishBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1d4ed8",
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: 14,
    paddingVertical: 14,
  },
  deleteBtnText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "600",
  },
});
