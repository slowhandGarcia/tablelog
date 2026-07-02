import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TierDef {
  name: string;
  minPoints: number;
  color: string;
}

export interface MilestoneDef {
  points: number;
  title: string;
  description: string;
}

export interface ScanEntry {
  id: string;
  amount: number;
  pointsEarned: number;
  date: string;
}

export const TIERS: TierDef[] = [
  { name: "Member",   minPoints: 0,   color: "#6b7280" },
  { name: "Silver",   minPoints: 100, color: "#94a3b8" },
  { name: "Gold",     minPoints: 250, color: "#f59e0b" },
  { name: "Platinum", minPoints: 500, color: "#a78bfa" },
];

export const MILESTONES: MilestoneDef[] = [
  { points: 100, title: "Free Dessert",    description: "Any dessert from our menu, on us" },
  { points: 250, title: "15% Off",         description: "Applied to your next full visit"  },
  { points: 500, title: "Free Appetizer",  description: "Any starter, our treat"           },
];

export function getTierInfo(points: number): {
  tier: TierDef;
  next: TierDef | null;
  progress: number;
} {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  const nextIdx = TIERS.indexOf(tier) + 1;
  const next = nextIdx < TIERS.length ? TIERS[nextIdx] : null;
  const progress = next
    ? Math.min((points - tier.minPoints) / (next.minPoints - tier.minPoints), 1)
    : 1;
  return { tier, next, progress };
}

export function getNextMilestone(points: number): MilestoneDef | null {
  return MILESTONES.find((m) => m.points > points) ?? null;
}

interface RewardsState {
  points: number;
  totalEarned: number;
  scans: ScanEntry[];
  addPointsFromReceipt: (amount: number) => number;
}

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set) => ({
      points: 0,
      totalEarned: 0,
      scans: [],

      addPointsFromReceipt: (amount) => {
        const earned = Math.floor(amount);
        if (earned <= 0) return 0;
        const entry: ScanEntry = {
          id: `scan-${Date.now()}`,
          amount,
          pointsEarned: earned,
          date: new Date().toISOString(),
        };
        set((s) => ({
          points: s.points + earned,
          totalEarned: s.totalEarned + earned,
          scans: [entry, ...s.scans],
        }));
        return earned;
      },
    }),
    {
      name: "rewards-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
