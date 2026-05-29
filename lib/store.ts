// ─── Global state store ───────────────────────────────────────────────────────
// Zustand for in-session state (plan, energy).
// Supabase handles persistence across sessions — this is just the live session view.

import { create } from 'zustand';

export interface PlanBlock {
  time: string;
  title: string;
  note?: string;
  type: 'task' | 'break' | 'food' | 'transition';
}

export interface DayPlan {
  id?: string;           // Supabase row id (if saved)
  energy: number;
  tasks: string;
  name?: string;
  blocks: PlanBlock[];
  date: string;          // ISO date string: 'YYYY-MM-DD'
}

interface AppStore {
  todayPlan: DayPlan | null;
  setTodayPlan: (plan: DayPlan) => void;
  clearPlan: () => void;
}

export const useStore = create<AppStore>((set) => ({
  todayPlan: null,
  setTodayPlan: (plan) => set({ todayPlan: plan }),
  clearPlan: () => set({ todayPlan: null }),
}));
