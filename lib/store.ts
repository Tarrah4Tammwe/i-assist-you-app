// ─── Global state store ───────────────────────────────────────────────────────
// Zustand for in-session state (plan, energy, body double session).
// Supabase handles persistence across sessions — this is just the live session view.

import { create } from 'zustand';

export interface PlanBlock {
  time: string;
  title: string;
  note?: string;
  type: 'task' | 'break' | 'food' | 'transition';
  fixed?: boolean;
  duration?: number;
  appointmentAddress?: string;
  travelMinutes?: number;
  isAutoPlaced?: boolean;
}

export interface DayPlan {
  id?: string;
  energy: number;
  tasks: string;
  name?: string;
  blocks: PlanBlock[];
  date: string;
}

export type CheckInInterval = 5 | 10 | 25 | number; // minutes; 25 = Pomodoro default

export interface BodyDoubleSession {
  active: boolean;
  taskDescription: string;
  intervalMinutes: CheckInInterval;
  startedAt: number;        // Date.now() timestamp
  lastCheckInAt: number;    // Date.now() timestamp of last check-in
  sessionMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  // Next fixed block the session needs to watch for
  nextFixedBlock: PlanBlock | null;
  // Whether the wrap-up interrupt has been shown
  wrapUpShown: boolean;
}

interface AppStore {
  todayPlan: DayPlan | null;
  setTodayPlan: (plan: DayPlan) => void;
  clearPlan: () => void;

  bodyDouble: BodyDoubleSession | null;
  startBodyDouble: (taskDescription: string, intervalMinutes: CheckInInterval, nextFixedBlock: PlanBlock | null) => void;
  updateBodyDoubleMessages: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
  recordCheckIn: () => void;
  markWrapUpShown: () => void;
  endBodyDouble: () => void;
}

export const useStore = create<AppStore>((set) => ({
  todayPlan: null,
  setTodayPlan: (plan) => set({ todayPlan: plan }),
  clearPlan: () => set({ todayPlan: null }),

  bodyDouble: null,

  startBodyDouble: (taskDescription, intervalMinutes, nextFixedBlock) => set({
    bodyDouble: {
      active: true,
      taskDescription,
      intervalMinutes,
      startedAt: Date.now(),
      lastCheckInAt: Date.now(),
      sessionMessages: [],
      nextFixedBlock,
      wrapUpShown: false,
    },
  }),

  updateBodyDoubleMessages: (messages) => set((state) => ({
    bodyDouble: state.bodyDouble ? { ...state.bodyDouble, sessionMessages: messages } : null,
  })),

  recordCheckIn: () => set((state) => ({
    bodyDouble: state.bodyDouble
      ? { ...state.bodyDouble, lastCheckInAt: Date.now() }
      : null,
  })),

  markWrapUpShown: () => set((state) => ({
    bodyDouble: state.bodyDouble ? { ...state.bodyDouble, wrapUpShown: true } : null,
  })),

  endBodyDouble: () => set({ bodyDouble: null }),
}));
