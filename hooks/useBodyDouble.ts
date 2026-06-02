// hooks/useBodyDouble.ts
// Manages body double session timing, check-in pings, and calendar wrap-up logic.
//
// HOW IT WORKS:
// - Timer runs locally on device — zero server activity during silent windows
// - At each interval boundary, fires a check-in (one API call)
// - Watches nextFixedBlock: 25 min before start time, triggers wrap-up interrupt
// - "25 min" is intentional: enough for save + bathroom + water + open the link
// - No open network connection held between intervals

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from '../lib/store';

const API_BASE = 'https://i-assist-you.vercel.app';
const WRAP_UP_LEAD_MINUTES = 25; // How far before an event we interrupt the session

// Parse a time string like "15:00" or "3:00 PM" into today's Date
function parseBlockTime(timeStr: string): Date | null {
  try {
    const now = new Date();
    // Try "HH:MM" 24h format
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const d = new Date(now);
      d.setHours(parseInt(match24[1], 10), parseInt(match24[2], 10), 0, 0);
      return d;
    }
    // Try "H:MM AM/PM"
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const mins = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const d = new Date(now);
      d.setHours(hours, mins, 0, 0);
      return d;
    }
    return null;
  } catch {
    return null;
  }
}

interface UseBodyDoubleReturn {
  minutesUntilCheckIn: () => number;
  minutesUntilWrapUp: () => number | null;
  triggerCheckIn: () => Promise<string>;
  triggerWrapUp: () => Promise<string>;
}

export function useBodyDouble(
  onCheckIn: (message: string) => void,
  onWrapUp: (message: string, eventName: string, minutesLeft: number) => void,
): UseBodyDoubleReturn {
  const { bodyDouble, todayPlan, recordCheckIn, markWrapUpShown, endBodyDouble } = useStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const minutesUntilCheckIn = useCallback((): number => {
    if (!bodyDouble) return 0;
    const elapsedSinceLastCheckIn = (Date.now() - bodyDouble.lastCheckInAt) / 60000;
    return Math.max(0, bodyDouble.intervalMinutes - elapsedSinceLastCheckIn);
  }, [bodyDouble]);

  const minutesUntilWrapUp = useCallback((): number | null => {
    if (!bodyDouble?.nextFixedBlock || bodyDouble.wrapUpShown) return null;
    const blockTime = parseBlockTime(bodyDouble.nextFixedBlock.time);
    if (!blockTime) return null;
    const minutesLeft = (blockTime.getTime() - Date.now()) / 60000;
    return minutesLeft > 0 ? minutesLeft : null;
  }, [bodyDouble]);

  const triggerCheckIn = useCallback(async (): Promise<string> => {
    if (!bodyDouble) return "I'm here.";
    recordCheckIn();

    const energy = todayPlan?.energy ?? 3;
    const elapsed = Math.round((Date.now() - bodyDouble.startedAt) / 60000);

    // Condensed context — not full history, keeps tokens lean
    const contextSummary = bodyDouble.sessionMessages.length > 0
      ? `Earlier: ${bodyDouble.sessionMessages
          .slice(-4)
          .map(m => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
          .join(' | ')}`
      : '';

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `[Body double check-in — ${elapsed} min into session, working on: "${bodyDouble.taskDescription}". ${contextSummary}] How's it going?`,
          }],
          system: `You are a body double companion for someone with AuDHD. Energy today: ${energy}/5.
Check-in rules:
- 1-2 sentences max. Calm. No pressure.
- If they've been going ${elapsed} min, acknowledge the time briefly.
- Give one tiny next action or just affirm presence.
- Never say "great job", "amazing", "you've got this".
- If distress detected: validate first, then one physical suggestion.`,
          context: { energy, screen: 'body-double-checkin' },
        }),
      });
      const data = await res.json();
      return data?.content ?? "Still here. Keep going.";
    } catch {
      return "Still here.";
    }
  }, [bodyDouble, todayPlan, recordCheckIn]);

  const triggerWrapUp = useCallback(async (): Promise<string> => {
    if (!bodyDouble?.nextFixedBlock) return '';
    markWrapUpShown();

    const energy = todayPlan?.energy ?? 3;
    const blockTitle = bodyDouble.nextFixedBlock.title;
    const minsLeft = minutesUntilWrapUp() ?? 25;

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `[Session wrap-up needed — "${blockTitle}" starts in ${Math.round(minsLeft)} minutes. Working on: "${bodyDouble.taskDescription}"]`,
          }],
          system: `You are a body double companion wrapping up a work session for someone with AuDHD. Energy today: ${energy}/5.
Wrap-up rules:
- 2-3 sentences. Warm but direct.
- Acknowledge what they were working on.
- Tell them to save and close. Don't list every step — they'll see the prep list below.
- Don't say "great work" or inflate. Calm handoff tone.`,
          context: { energy, screen: 'body-double-wrapup' },
        }),
      });
      const data = await res.json();
      return data?.content ?? `Time to wrap up — ${blockTitle} is coming up.`;
    } catch {
      return `Time to wrap up. ${blockTitle} is coming up in ${Math.round(minsLeft)} minutes.`;
    }
  }, [bodyDouble, todayPlan, markWrapUpShown, minutesUntilWrapUp]);

  // Main timer — runs every 30 seconds to check whether a check-in or wrap-up is due
  useEffect(() => {
    if (!bodyDouble?.active) return;

    const tick = async () => {
      if (!bodyDouble?.active) return;

      // Check-in due?
      const minsToCheckIn = minutesUntilCheckIn();
      if (minsToCheckIn <= 0) {
        const message = await triggerCheckIn();
        onCheckIn(message);
      }

      // Wrap-up due? (25 min before next fixed block)
      const minsToWrapUp = minutesUntilWrapUp();
      if (
        minsToWrapUp !== null &&
        minsToWrapUp <= WRAP_UP_LEAD_MINUTES &&
        !bodyDouble.wrapUpShown &&
        bodyDouble.nextFixedBlock
      ) {
        const message = await triggerWrapUp();
        onWrapUp(message, bodyDouble.nextFixedBlock.title, minsToWrapUp);
      }
    };

    timerRef.current = setInterval(tick, 30_000); // check every 30s
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bodyDouble, minutesUntilCheckIn, minutesUntilWrapUp, triggerCheckIn, triggerWrapUp, onCheckIn, onWrapUp]);

  // Resume check on app foregrounding — catches missed intervals
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        bodyDouble?.active
      ) {
        const minsToCheckIn = minutesUntilCheckIn();
        if (minsToCheckIn <= 0) {
          const message = await triggerCheckIn();
          onCheckIn(message);
        }
        const minsToWrapUp = minutesUntilWrapUp();
        if (
          minsToWrapUp !== null &&
          minsToWrapUp <= WRAP_UP_LEAD_MINUTES &&
          !bodyDouble.wrapUpShown &&
          bodyDouble.nextFixedBlock
        ) {
          const message = await triggerWrapUp();
          onWrapUp(message, bodyDouble.nextFixedBlock.title, minsToWrapUp);
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [bodyDouble, minutesUntilCheckIn, minutesUntilWrapUp, triggerCheckIn, triggerWrapUp, onCheckIn, onWrapUp]);

  return { minutesUntilCheckIn, minutesUntilWrapUp, triggerCheckIn, triggerWrapUp };
}
