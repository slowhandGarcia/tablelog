import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { api, getApiErrorMessage, tokenStorage } from "@/lib/api";
import { useProfileStore } from "@/store/useProfileStore";
import { useWorkoutStore } from "@/store/useWorkoutStore";
import { usePostStore } from "@/store/usePostStore";

export interface User {
  id: number;
  email: string;
  username: string;
  isLoggedIn: boolean;
  createdAt: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthStore {
  user: User | null;
  isGuest: boolean;
  hasHydrated: boolean;
  setGuest: (isGuest: boolean) => void;
  /** Validates any tokens already on the device against the API. Call once
   *  on app start (see app/_layout.tsx) before trusting `user`/`isGuest`. */
  restoreSession: () => Promise<void>;
  signUp: (params: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  }) => Promise<AuthResult>;
  login: (params: { email: string; password: string }) => Promise<AuthResult>;
  /** Signed-in user signing out: revoke the token, keep their data, revert to guest. */
  logout: () => Promise<void>;
  /** Guest wiping their local data: clear profile + all workouts, stay in guest mode. */
  resetGuestData: () => void;
  /** Permanently deletes the account server-side (cascades to their posts/
   *  comments/workouts there), then wipes this device's local copies of the
   *  same data and reverts to guest mode. */
  deleteAccount: () => Promise<AuthResult>;
}

interface ApiUser {
  id: number;
  email: string;
  username: string;
  bio: string;
  location: string;
  avatar_url: string;
  created_at: string;
}

const toUser = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  email: apiUser.email,
  username: apiUser.username,
  isLoggedIn: true,
  createdAt: apiUser.created_at,
});

const applyLoggedInUser = (user: User) => {
  useProfileStore.getState().setName(user.username);
  useProfileStore.getState().setEmail(user.email);
};

/** Persists tokens + updates auth/profile state after a successful
 *  register/login call. Exported so a screen that calls `api.post(...)`
 *  directly (e.g. for one-off debugging) can still finish the session the
 *  same way the store's own `signUp`/`login` do. */
export async function applyAuthSession(
  apiUser: ApiUser,
  access: string,
  refresh: string
): Promise<User> {
  await tokenStorage.setTokens(access, refresh);
  const user = toUser(apiUser);
  useAuthStore.setState({ user, isGuest: false });
  applyLoggedInUser(user);
  return user;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isGuest: true,
      hasHydrated: false,

      setGuest: (isGuest) => set({ isGuest }),

      restoreSession: async () => {
        const [access, refresh] = await Promise.all([
          tokenStorage.getAccess(),
          tokenStorage.getRefresh(),
        ]);
        if (!access && !refresh) {
          set({ hasHydrated: true });
          return;
        }
        try {
          const { data } = await api.get<ApiUser>("/auth/me/");
          const user = toUser(data);
          set({ user, isGuest: false, hasHydrated: true });
          applyLoggedInUser(user);
        } catch {
          await tokenStorage.clear();
          set({ user: null, isGuest: true, hasHydrated: true });
        }
      },

      signUp: async ({ email, username, password, confirmPassword }) => {
        if (password !== confirmPassword) {
          return { success: false, error: "Passwords do not match." };
        }

        try {
          const { data } = await api.post<{
            user: ApiUser;
            access: string;
            refresh: string;
          }>("/auth/register/", {
            email,
            username,
            password,
            password2: confirmPassword,
          });

          await tokenStorage.setTokens(data.access, data.refresh);
          const user = toUser(data.user);
          set({ user, isGuest: false });
          applyLoggedInUser(user);
          return { success: true };
        } catch (error) {
          return { success: false, error: getApiErrorMessage(error, "Sign up failed.") };
        }
      },

      login: async ({ email, password }) => {
        try {
          const { data } = await api.post<{
            user: ApiUser;
            access: string;
            refresh: string;
          }>("/auth/login/", { email, password });

          await tokenStorage.setTokens(data.access, data.refresh);
          const user = toUser(data.user);
          set({ user, isGuest: false });
          applyLoggedInUser(user);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: getApiErrorMessage(error, "Invalid email or password."),
          };
        }
      },

      logout: async () => {
        const refresh = await tokenStorage.getRefresh();
        try {
          if (refresh) await api.post("/auth/logout/", { refresh });
        } catch {
          // Token may already be expired/blacklisted — sign out locally regardless.
        }
        await tokenStorage.clear();
        useProfileStore.getState().setEmail(undefined);
        set({ user: null, isGuest: true });
      },

      resetGuestData: () => {
        useProfileStore.getState().resetProfile();
        useWorkoutStore.getState().clearAllWorkouts();
        set({ isGuest: true });
      },

      deleteAccount: async () => {
        try {
          await api.delete("/auth/me/");
        } catch (error) {
          return {
            success: false,
            error: getApiErrorMessage(error, "Failed to delete account. Please try again."),
          };
        }

        await tokenStorage.clear();
        useProfileStore.getState().resetProfile();
        useWorkoutStore.getState().clearAllWorkouts();
        usePostStore.getState().clearAllPosts();
        set({ user: null, isGuest: true });
        return { success: true };
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Tokens live in SecureStore, never here — only cache the non-sensitive
      // bits needed to paint the UI instantly before restoreSession() confirms.
      partialize: (state) => ({ user: state.user, isGuest: state.isGuest }),
    }
  )
);
