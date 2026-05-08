import { UserProgress } from "@/types";

const KEY = "matemax-progress";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadProgress(): UserProgress {
  if (typeof window === "undefined") return { xp: 0, streak: 0, lastActiveDate: null, consecutiveCorrect: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as UserProgress;
  } catch { /* ignore */ }
  return { xp: 0, streak: 0, lastActiveDate: null, consecutiveCorrect: 0 };
}

export function saveProgress(p: UserProgress) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function recordActivity(p: UserProgress, wasCorrect: boolean, xpDelta?: number): UserProgress {
  const t = today();
  let streak = p.streak;
  let freezeCount = p.freezeCount ?? 0;
  let lastFreezeEarnedAtStreak = p.lastFreezeEarnedAtStreak;

  if (p.lastActiveDate === null) {
    streak = 1;
  } else if (p.lastActiveDate === t) {
    // Already active today, streak unchanged
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (p.lastActiveDate === yStr) {
      streak = streak + 1;
    } else if (freezeCount > 0) {
      // Missed a day but have a freeze — consume it, preserve streak
      freezeCount--;
      if (typeof window !== "undefined") {
        localStorage.setItem("matemax-freeze-used", t);
      }
    } else {
      streak = 1;
    }
  }

  // Award one freeze every 7 streak days (max 2 stored)
  if (streak > 0 && streak % 7 === 0 && streak !== lastFreezeEarnedAtStreak && freezeCount < 2) {
    freezeCount = Math.min(2, freezeCount + 1);
    lastFreezeEarnedAtStreak = streak;
  }

  const delta = xpDelta ?? (wasCorrect ? 10 : 1);
  const consecutiveCorrect = wasCorrect ? p.consecutiveCorrect + 1 : 0;

  return {
    xp: p.xp + delta,
    streak,
    lastActiveDate: t,
    consecutiveCorrect,
    freezeCount,
    lastFreezeEarnedAtStreak,
  };
}
