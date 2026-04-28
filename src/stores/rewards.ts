"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";

export type RewardEvent = {
  id: string;
  xp: number;
  gold: number;
  gems: number;
  fate: number;
  areaKey: string | null;
  label?: string;
  createdAt: number;
};

type RewardsState = {
  events: RewardEvent[];
  push: (e: Omit<RewardEvent, "id" | "createdAt">) => void;
  dismiss: (id: string) => void;
};

export const useRewardsStore = create<RewardsState>((set) => ({
  events: [],
  push: (e) =>
    set((s) => ({
      events: [
        ...s.events,
        { ...e, id: nanoid(6), createdAt: Date.now() },
      ].slice(-5), // cap the queue
    })),
  dismiss: (id) => set((s) => ({ events: s.events.filter((x) => x.id !== id) })),
}));
