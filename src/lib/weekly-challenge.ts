export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nickname: string;
  avatar_emoji: string;
  score: number;
  total: number;
  time_seconds: number;
  xp_earned: number;
  is_own?: boolean;
}

/** Returns the ISO week key for a given date, e.g. "2026-W22". */
export function getWeekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // Move to Thursday of this week (ISO week definition)
  d.setDate(d.getDate() + 4 - (day === 0 ? 7 : day));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${week.toString().padStart(2, "0")}`;
}

/** Returns the Monday of the current ISO week as a display string "26.5. – 1.6." */
export function getWeekDateRange(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}
