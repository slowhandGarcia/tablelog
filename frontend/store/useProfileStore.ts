import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEFAULT_PROFILE_NAME = "Your Name";
export const DEFAULT_PROFILE_BIO = "Add a short bio about yourself.";

interface ProfileStore {
  name: string;
  bio: string;
  location: string;
  email?: string;
  /** ISO date string set the first time this profile is ever created (guest or signed-up). */
  createdAt: string;
  avatarUri: string | null;
  setName: (name: string) => void;
  setBio: (bio: string) => void;
  setLocation: (location: string) => void;
  setEmail: (email: string | undefined) => void;
  setAvatar: (uri: string | null) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      name: DEFAULT_PROFILE_NAME,
      bio: DEFAULT_PROFILE_BIO,
      location: "",
      email: undefined,
      // Only ever assigned here, on first creation of the persisted store —
      // rehydration restores the original value rather than re-running this.
      createdAt: new Date().toISOString(),
      avatarUri: null,
      setName: (name) => set({ name }),
      setBio: (bio) => set({ bio }),
      setLocation: (location) => set({ location }),
      setEmail: (email) => set({ email }),
      setAvatar: (avatarUri) => set({ avatarUri }),
      resetProfile: () =>
        set({
          name: DEFAULT_PROFILE_NAME,
          bio: DEFAULT_PROFILE_BIO,
          location: "",
          email: undefined,
          avatarUri: null,
          createdAt: new Date().toISOString(),
        }),
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
