import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Exercise } from "@/types";
import { SEED_EXERCISES } from "@/constants/exercises";

interface ExerciseStore {
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, "id" | "isCustom">) => void;
  removeExercise: (id: string) => void;
}

export const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set) => ({
      exercises: SEED_EXERCISES,
      addExercise: (exercise) =>
        set((state) => ({
          exercises: [
            ...state.exercises,
            { ...exercise, id: `custom-${Date.now()}`, isCustom: true },
          ],
        })),
      removeExercise: (id) =>
        set((state) => ({
          exercises: state.exercises.filter((e) => e.id !== id),
        })),
    }),
    {
      name: "exercise-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
