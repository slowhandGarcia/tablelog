export type MuscleGroup =
  | "starters"
  | "mains"
  | "sides"
  | "desserts"
  | "drinks"
  | "specials"
  | "breakfast"
  | "snacks";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom?: boolean;
}

export interface SetEntry {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  date: string; // ISO string
  name: string;
  exercises: WorkoutExercise[];
  completedAt?: string; // ISO string, undefined while in progress
  images: string[];
  bodyWeight?: number;
  weightUnit?: WeightUnit;
  notes?: string;
  // True once this workout has been successfully pushed to the backend
  // (happens once, at finish — see useWorkoutStore.finishWorkout). Guards
  // whether deleteWorkout needs to also call the API.
  isSynced?: boolean;
}

export type WeightUnit = "kg" | "lbs";

export interface Comment {
  id: string;
  username: string;
  text: string;
  createdAt: string; // ISO string
}

export interface Post {
  id: string;
  authorId: number;
  username: string;
  text: string;
  images: string[];
  createdAt: string; // ISO string
  likedByMe: boolean;
  likeCount: number;
  comments: Comment[];
}

export interface Special {
  id: string;
  name: string;
  description: string;
  price?: number;
  originalPrice?: number;
  category: MuscleGroup;
  isToday: boolean;
  expiresAt?: string;
  createdAt: string;
}
