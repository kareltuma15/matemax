// Storage facade — localStorage now, Supabase once a user is logged in
import { supabase } from "./supabase";
import { SM2Card, UserProgress } from "@/types";

export interface SessionHistoryEntry {
  date: string;       // "YYYY-MM-DD"
  temas: string[];    // topics practiced
  correct: number;
  total: number;
  xp: number;
}

type SessionRow = {
  user_id: string;
  date: string;
  xp_earned: number;
  correct: number;
  total: number;
};

type SM2Row = {
  user_id: string;
  example_id: string;
  interval: number;
  ease: number;
  next_review: number;
};

// ── Local storage helpers (current default) ──────────────────────────────────

const CARDS_KEY    = "matemax-cards";
const PROGRESS_KEY = "matemax-progress";

export function localSaveCards(cards: SM2Card[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

export function localLoadCards(): SM2Card[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? (JSON.parse(raw) as SM2Card[]) : [];
  } catch { return []; }
}

export function localSaveProgress(p: UserProgress) {
  if (typeof window !== "undefined")
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function localLoadProgress(): UserProgress {
  if (typeof window === "undefined")
    return { xp: 0, streak: 0, lastActiveDate: null, consecutiveCorrect: 0 };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as UserProgress) : { xp: 0, streak: 0, lastActiveDate: null, consecutiveCorrect: 0 };
  } catch {
    return { xp: 0, streak: 0, lastActiveDate: null, consecutiveCorrect: 0 };
  }
}

// ── Supabase helpers (used once auth is wired up) ─────────────────────────────

export async function remoteLogSession(data: SessionRow): Promise<void> {
  if (!supabase) return;
  await supabase.from("sessions").insert(data);
}

export async function remoteSaveSM2Card(data: SM2Row): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("sm2_cards")
    .upsert(data, { onConflict: "user_id,example_id" });
}

export async function remoteSyncXP(userId: string, totalXp: number, levelKey: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("user_xp")
    .upsert(
      { user_id: userId, total_xp: totalXp, current_level: levelKey, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

// ── Session history (local) ───────────────────────────────────────────────────

const SESSION_HISTORY_KEY = "matemax-session-history";

export function localSaveSession(entry: SessionHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = localLoadSessions();
    const updated = [entry, ...existing].slice(0, 50);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function localLoadSessions(): SessionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSION_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as SessionHistoryEntry[]) : [];
  } catch { return []; }
}

export async function remoteSyncBadges(userId: string, badgeIds: string[]): Promise<void> {
  if (!supabase || badgeIds.length === 0) return;
  const rows = badgeIds.map((badge_id) => ({
    user_id: userId,
    badge_id,
    earned_at: new Date().toISOString(),
    seen: false,
  }));
  await supabase.from("user_badges").upsert(rows, { onConflict: "user_id,badge_id" });
}
