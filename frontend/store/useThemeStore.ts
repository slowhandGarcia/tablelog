import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  placeholder: string;
}

const THEME_COLORS: Record<ThemeMode, ThemeColors> = {
  light: {
    background: "#ffffff",
    surface: "#f4f4f5",
    border: "#e4e4e7",
    text: "#111827",
    muted: "#71717a",
    placeholder: "#a1a1aa",
  },
  dark: {
    background: "#0a0a0a",
    surface: "#141414",
    border: "#222222",
    text: "#f5f5f5",
    muted: "#6b7280",
    placeholder: "#4b5563",
  },
};

// Apply the default immediately so there's no flash of the system color
// scheme before AsyncStorage rehydration finishes below.
colorScheme.set("dark");

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "dark",

      setTheme: (theme) => {
        colorScheme.set(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        colorScheme.set(next);
        set({ theme: next });
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) colorScheme.set(state.theme);
      },
    }
  )
);

// Resolved color values for the current theme. Use this anywhere a plain
// className (e.g. for a root screen background) isn't reliably enough —
// inline styles computed here always react instantly to theme changes,
// independent of NativeWind's compiled `dark:` stylesheet.
export function useThemeColors(): ThemeColors {
  const theme = useThemeStore((s) => s.theme);
  return THEME_COLORS[theme];
}
