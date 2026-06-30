import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useExerciseStore } from "@/store/useExerciseStore";
import type { SetEntry, Workout, WorkoutExercise, WeightUnit } from "@/types";

interface ApiSet {
  id: number;
  exercise_name: string;
  reps: number;
  weight: number;
  completed: boolean;
  order: number;
}

interface ApiWorkout {
  id: number;
  name: string;
  date: string;
  completed_at: string | null;
  body_weight: number | null;
  weight_unit: string;
  notes: string;
  images: string[];
  sets: ApiSet[];
}

interface ActionResult {
  success: boolean;
  error?: string;
}

interface WorkoutStore {
  workouts: Workout[];
  activeWorkoutId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkouts: () => Promise<void>;
  startWorkout: (name: string) => string;
  addExerciseToWorkout: (workoutId: string, exerciseId: string) => void;
  addSet: (workoutId: string, workoutExerciseId: string) => void;
  updateSet: (
    workoutId: string,
    workoutExerciseId: string,
    setId: string,
    patch: Partial<SetEntry>
  ) => void;
  removeSet: (workoutId: string, workoutExerciseId: string, setId: string) => void;
  deleteExercise: (workoutId: string, workoutExerciseId: string) => void;
  setNotes: (workoutId: string, notes: string) => void;
  finishWorkout: (workoutId: string) => Promise<ActionResult>;
  deleteWorkout: (workoutId: string) => Promise<ActionResult>;
  /** PATCH the current workout state to the backend. Local state stays as-is
   *  whether or not the sync succeeds. */
  updateWorkout: (workoutId: string) => Promise<ActionResult>;
  /** Restore a workout to a previously captured snapshot — used when the user
   *  discards edits in the Workout Details screen. */
  revertWorkout: (workoutId: string, snapshot: Workout) => void;
  addWorkoutImages: (workoutId: string, uris: string[]) => void;
  removeWorkoutImage: (workoutId: string, index: number) => void;
  setBodyWeight: (
    workoutId: string,
    bodyWeight: number | undefined,
    weightUnit: WeightUnit
  ) => void;
  clearAllWorkouts: () => void;
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Finds an exercise in the local library by name (case-insensitive),
 *  registering it as a custom exercise if this is the first time a synced
 *  workout has referenced it — e.g. it was created on another device. */
function findOrCreateExerciseId(exerciseName: string): string {
  const trimmed = exerciseName.trim();
  const existing = useExerciseStore
    .getState()
    .exercises.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing.id;

  useExerciseStore.getState().addExercise({ name: trimmed, muscleGroup: "full body" });
  const created = useExerciseStore
    .getState()
    .exercises.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  return created?.id ?? trimmed;
}

/** The backend stores sets as one flat, ordered list per workout (no
 *  WorkoutExercise grouping) — this regroups consecutive same-named sets
 *  back into the WorkoutExercise[] shape the rest of the app expects. */
function unflattenSets(apiSets: ApiSet[]): WorkoutExercise[] {
  const exercises: WorkoutExercise[] = [];
  let currentName: string | null = null;
  let current: WorkoutExercise | null = null;

  for (const apiSet of apiSets) {
    if (apiSet.exercise_name !== currentName || !current) {
      currentName = apiSet.exercise_name;
      current = { id: newId(), exerciseId: findOrCreateExerciseId(apiSet.exercise_name), sets: [] };
      exercises.push(current);
    }
    current.sets.push({
      id: newId(),
      reps: apiSet.reps,
      weight: apiSet.weight,
      completed: apiSet.completed,
    });
  }
  return exercises;
}

function flattenExercises(exercises: WorkoutExercise[]) {
  const library = useExerciseStore.getState().exercises;
  const flat: {
    exercise_name: string;
    reps: number;
    weight: number;
    completed: boolean;
    order: number;
  }[] = [];

  let order = 0;
  for (const workoutExercise of exercises) {
    const name = library.find((e) => e.id === workoutExercise.exerciseId)?.name ?? "Exercise";
    for (const set of workoutExercise.sets) {
      flat.push({
        exercise_name: name,
        reps: set.reps,
        weight: set.weight,
        completed: set.completed,
        order: order++,
      });
    }
  }
  return flat;
}

const toWorkout = (apiWorkout: ApiWorkout): Workout => ({
  id: String(apiWorkout.id),
  date: apiWorkout.date,
  name: apiWorkout.name,
  exercises: unflattenSets(apiWorkout.sets),
  completedAt: apiWorkout.completed_at ?? undefined,
  images: apiWorkout.images,
  bodyWeight: apiWorkout.body_weight ?? undefined,
  weightUnit: (apiWorkout.weight_unit as WeightUnit) ?? "kg",
  notes: apiWorkout.notes || undefined,
  isSynced: true,
});

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      workouts: [],
      activeWorkoutId: null,
      isLoading: false,
      error: null,

      fetchWorkouts: async () => {
        // Guests never sync — their workouts are local-only by design.
        if (useAuthStore.getState().isGuest) return;

        set({ isLoading: true, error: null });
        try {
          const { data } = await api.get<{ results: ApiWorkout[] } | ApiWorkout[]>("/workouts/");
          const results = Array.isArray(data) ? data : data.results;
          const synced = results.map(toWorkout);
          set((state) => ({
            // The server only ever holds workouts that were already
            // finished+synced — keep any still-in-progress local one as-is.
            workouts: [...state.workouts.filter((w) => !w.isSynced), ...synced],
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false, error: getApiErrorMessage(error, "Failed to load workouts.") });
        }
      },

      startWorkout: (name) => {
        const id = newId();
        const workout: Workout = {
          id,
          name,
          date: new Date().toISOString(),
          exercises: [],
          images: [],
        };
        set((state) => ({
          workouts: [workout, ...state.workouts],
          activeWorkoutId: id,
        }));
        return id;
      },

      addExerciseToWorkout: (workoutId, exerciseId) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId
              ? w
              : {
                  ...w,
                  exercises: [
                    ...w.exercises,
                    { id: newId(), exerciseId, sets: [] } satisfies WorkoutExercise,
                  ],
                }
          ),
        })),

      addSet: (workoutId, workoutExerciseId) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId
              ? w
              : {
                  ...w,
                  exercises: w.exercises.map((we) =>
                    we.id !== workoutExerciseId
                      ? we
                      : {
                          ...we,
                          sets: [
                            ...we.sets,
                            { id: newId(), reps: 0, weight: 0, completed: false },
                          ],
                        }
                  ),
                }
          ),
        })),

      updateSet: (workoutId, workoutExerciseId, setId, patch) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId
              ? w
              : {
                  ...w,
                  exercises: w.exercises.map((we) =>
                    we.id !== workoutExerciseId
                      ? we
                      : {
                          ...we,
                          sets: we.sets.map((s) =>
                            s.id !== setId ? s : { ...s, ...patch }
                          ),
                        }
                  ),
                }
          ),
        })),

      removeSet: (workoutId, workoutExerciseId, setId) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId
              ? w
              : {
                  ...w,
                  exercises: w.exercises.map((we) =>
                    we.id !== workoutExerciseId
                      ? we
                      : { ...we, sets: we.sets.filter((s) => s.id !== setId) }
                  ),
                }
          ),
        })),

      deleteExercise: (workoutId, workoutExerciseId) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId
              ? w
              : { ...w, exercises: w.exercises.filter((we) => we.id !== workoutExerciseId) }
          ),
        })),

      setNotes: (workoutId, notes) =>
        set((state) => ({
          workouts: state.workouts.map((w) => (w.id !== workoutId ? w : { ...w, notes })),
        })),

      finishWorkout: async (workoutId) => {
        const completedAt = new Date().toISOString();
        set((state) => ({
          workouts: state.workouts.map((w) => (w.id !== workoutId ? w : { ...w, completedAt })),
          activeWorkoutId:
            state.activeWorkoutId === workoutId ? null : state.activeWorkoutId,
        }));

        // Guests stay fully local — nothing to sync.
        if (useAuthStore.getState().isGuest) {
          return { success: true };
        }

        const workout = get().workouts.find((w) => w.id === workoutId);
        if (!workout) return { success: false, error: "Workout not found." };

        try {
          const formData = new FormData();
          formData.append("name", workout.name);
          formData.append("date", workout.date);
          formData.append("completed_at", completedAt);
          if (workout.bodyWeight !== undefined) {
            formData.append("body_weight", String(workout.bodyWeight));
          }
          formData.append("weight_unit", workout.weightUnit ?? "kg");
          formData.append("notes", workout.notes ?? "");
          formData.append("sets", JSON.stringify(flattenExercises(workout.exercises)));

          workout.images.forEach((uri, index) => {
            const filename = uri.split("/").pop() ?? `photo-${index}.jpg`;
            const extension = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase() ?? "jpg";
            const mimeType = extension === "jpg" ? "jpeg" : extension;
            formData.append("images", {
              uri,
              name: filename,
              type: `image/${mimeType}`,
            } as unknown as Blob);
          });

          const { data } = await api.post<ApiWorkout>("/workouts/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const synced = toWorkout(data);
          set((state) => ({
            workouts: state.workouts.map((w) => (w.id !== workoutId ? w : synced)),
          }));
          return { success: true };
        } catch (error) {
          // The workout stays finished locally either way — only the sync
          // failed, so nothing the user did is lost.
          return { success: false, error: getApiErrorMessage(error, "Failed to sync workout.") };
        }
      },

      updateWorkout: async (workoutId) => {
        const workout = get().workouts.find((w) => w.id === workoutId);
        if (!workout) return { success: false, error: "Workout not found." };

        // Guests and unsynced workouts are local-only — nothing to PATCH.
        if (!workout.isSynced || useAuthStore.getState().isGuest) {
          return { success: true };
        }

        try {
          const { data } = await api.patch<ApiWorkout>(`/workouts/${workoutId}/`, {
            body_weight: workout.bodyWeight ?? null,
            weight_unit: workout.weightUnit ?? "kg",
            notes: workout.notes ?? "",
            sets: flattenExercises(workout.exercises),
          });
          const synced = toWorkout(data);
          set((state) => ({
            workouts: state.workouts.map((w) => (w.id !== workoutId ? w : synced)),
          }));
          return { success: true };
        } catch (error) {
          return { success: false, error: getApiErrorMessage(error, "Failed to save changes.") };
        }
      },

      revertWorkout: (workoutId, snapshot) =>
        set((state) => ({
          workouts: state.workouts.map((w) => (w.id !== workoutId ? w : snapshot)),
        })),

      deleteWorkout: async (workoutId) => {
        const workout = get().workouts.find((w) => w.id === workoutId);
        const previousWorkouts = get().workouts;
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== workoutId),
          activeWorkoutId:
            state.activeWorkoutId === workoutId ? null : state.activeWorkoutId,
        }));

        // Never synced (guest, or an in-progress workout never finished) —
        // nothing exists server-side to delete.
        if (!workout?.isSynced) {
          return { success: true };
        }

        try {
          await api.delete(`/workouts/${workoutId}/`);
          return { success: true };
        } catch (error) {
          set({ workouts: previousWorkouts });
          return { success: false, error: getApiErrorMessage(error, "Failed to delete workout.") };
        }
      },

      addWorkoutImages: (workoutId, uris) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId ? w : { ...w, images: [...w.images, ...uris] }
          ),
        })),

      removeWorkoutImage: (workoutId, index) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId
              ? w
              : { ...w, images: w.images.filter((_, i) => i !== index) }
          ),
        })),

      setBodyWeight: (workoutId, bodyWeight, weightUnit) =>
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.id !== workoutId ? w : { ...w, bodyWeight, weightUnit }
          ),
        })),

      clearAllWorkouts: () => set({ workouts: [], activeWorkoutId: null }),
    }),
    {
      name: "workout-storage",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as WorkoutStore;
        return {
          ...state,
          workouts: state.workouts.map((w) => ({
            ...w,
            images: w.images ?? [],
            weightUnit: w.weightUnit ?? "kg",
          })),
        };
      },
    }
  )
);
