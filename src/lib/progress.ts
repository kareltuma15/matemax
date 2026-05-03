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

export function recordActivity(p: UserProgress, wasCorrect: boolean): UserProgress {
  const t = today();
  let streak = p.streak;

  if (p.lastActiveDate === null) {
    streak = 1;
  } else if (p.lastActiveDate === t) {
    // Already active today, streak unchanged
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    streak = p.lastActiveDate === yStr ? streak + 1 : 1;
  }

  const xpDelta = wasCorrect ? 10 : 5;
  const consecutiveCorrect = wasCorrect ? p.consecutiveCorrect + 1 : 0;

  return {
    xp: p.xp + xpDelta,
    streak,
    lastActiveDate: t,
    consecutiveCorrect,
  };
}
