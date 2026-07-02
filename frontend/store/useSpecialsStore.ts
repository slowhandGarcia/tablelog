import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Special } from "@/types";

const NOW = new Date().toISOString();

const SEED_SPECIALS: Special[] = [
  {
    id: "special-chefs-tasting",
    name: "Chef's Tasting Menu",
    description:
      "A five-course culinary journey through the season's finest ingredients, curated daily by our head chef.",
    price: 85,
    originalPrice: 110,
    category: "mains",
    isToday: true,
    expiresAt: "Tonight only",
    createdAt: NOW,
  },
  {
    id: "special-happy-hour",
    name: "Happy Hour Cocktails",
    description:
      "Two-for-one on all signature cocktails. Featuring the house sangria, craft G&T, and our seasonal mojito.",
    price: 12,
    category: "drinks",
    isToday: true,
    expiresAt: "5 PM – 8 PM",
    createdAt: NOW,
  },
  {
    id: "special-catch-of-day",
    name: "Fresh Catch of the Day",
    description:
      "Market-fresh fish grilled to perfection with herb butter, roasted seasonal vegetables, and hand-cut fries.",
    price: 32,
    category: "mains",
    isToday: true,
    expiresAt: "Limited portions",
    createdAt: NOW,
  },
  {
    id: "special-brunch-board",
    name: "Weekend Brunch Board",
    description:
      "Avocado toast, smoked salmon, eggs your way, fresh fruit, granola, and bottomless fresh-squeezed orange juice.",
    price: 28,
    originalPrice: 38,
    category: "breakfast",
    isToday: false,
    expiresAt: "Weekends only",
    createdAt: NOW,
  },
  {
    id: "special-dessert-duo",
    name: "Dessert Duo",
    description:
      "Choose any two from our dessert menu. Perfect for sharing — we recommend the tiramisu and crème brûlée.",
    price: 18,
    originalPrice: 24,
    category: "desserts",
    isToday: false,
    expiresAt: "This week",
    createdAt: NOW,
  },
];

interface SpecialsState {
  specials: Special[];
  addSpecial: (data: Omit<Special, "id" | "createdAt">) => void;
  removeSpecial: (id: string) => void;
  toggleToday: (id: string) => void;
}

export const useSpecialsStore = create<SpecialsState>()(
  persist(
    (set) => ({
      specials: SEED_SPECIALS,

      addSpecial: (data) => {
        const id = `special-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({
          specials: [{ ...data, id, createdAt: new Date().toISOString() }, ...s.specials],
        }));
      },

      removeSpecial: (id) => {
        set((s) => ({ specials: s.specials.filter((sp) => sp.id !== id) }));
      },

      toggleToday: (id) => {
        set((s) => ({
          specials: s.specials.map((sp) =>
            sp.id === id ? { ...sp, isToday: !sp.isToday } : sp
          ),
        }));
      },
    }),
    {
      name: "specials-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
