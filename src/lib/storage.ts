// Storage facade — localStorage now, Supabase once a user is logged in
import { supabase } from "./supabase";
import { SM2Card, UserProgress } from "@/types";
import { loadGamification, saveGamification, GamificationState } from "./gamification";

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
  repetitions?: number;
  last_quality?: number;
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

export async function remoteSyncXP(userId: string, totalXp: number, levelKey: string, freezeCount = 0, streak = 0): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("user_xp")
    .upsert(
      { user_id: userId, total_xp: totalXp, current_level: levelKey, freeze_count: freezeCount, streak, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

export async function remoteSyncDiagResults(
  userId: string,
  results: Record<string, { correct: number; total: number }>
): Promise<void> {
  if (!supabase) return;
  const rows = Object.entries(results).map(([tema, v]) => ({
    user_id: userId,
    tema,
    correct: v.correct,
    total: v.total,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  await supabase.from("diagnostic_results").upsert(rows, { onConflict: "user_id,tema" });
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

// ── Záloha gamifikace ────────────────────────────────────────────────────────
// `topicStats` (úspěšnost po tématech) se dřív neposílala nikam a odhlášení ji
// smazalo nenávratně — a s ní připravenost, slabá místa i mapa učení.

export async function remoteSyncGamification(
  userId: string,
  state: GamificationState
): Promise<void> {
  if (!supabase) return;
  await supabase.from("user_gamification").upsert(
    { user_id: userId, state, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

// ── Obnovení postupu po přihlášení ───────────────────────────────────────────
//
// Odhlášení lokální data maže (správně — sdílené zařízení). Bez tohoto kroku by
// se ale žák po přihlášení choval jako nový: bez opakování, odznaků i statistik.
//
// Slučujeme po polích, ne „server přepíše lokál". Kdyby se přepisovalo naslepo,
// přihlášení na starším zařízení by zahodilo novější postup. Takhle se postup
// nemůže ztratit ani z jedné strany.

/** U každého tématu vyhrává záznam s více odpověďmi. */
function mergeTopicStats(
  a: Record<string, { correct: number; total: number }>,
  b: Record<string, { correct: number; total: number }>
): Record<string, { correct: number; total: number }> {
  const out: Record<string, { correct: number; total: number }> = { ...a };
  for (const [tema, rb] of Object.entries(b)) {
    const ra = out[tema];
    if (!ra || rb.total > ra.total || (rb.total === ra.total && rb.correct > ra.correct)) {
      out[tema] = rb;
    }
  }
  return out;
}

function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function mergeGamification(
  local: GamificationState,
  remote: GamificationState
): GamificationState {
  const dominant = remote.totalSolved > local.totalSolved ? remote : local;
  return {
    totalSolved:         Math.max(local.totalSolved, remote.totalSolved),
    perfectSessions:     Math.max(local.perfectSessions, remote.perfectSessions),
    dailyGoalsCompleted: Math.max(local.dailyGoalsCompleted, remote.dailyGoalsCompleted),
    earnedBadges:        [...new Set([...local.earnedBadges, ...remote.earnedBadges])],
    weekendDaysSeen:     [...new Set([...local.weekendDaysSeen, ...remote.weekendDaysSeen])],
    topicStats:          mergeTopicStats(local.topicStats, remote.topicStats),
    lastSessionDate:     laterDate(local.lastSessionDate, remote.lastSessionDate),
    lastDailyGoalDate:   laterDate(local.lastDailyGoalDate, remote.lastDailyGoalDate),
    lastLevelKey:        dominant.lastLevelKey,
    // Série správných odpovědí platí jen pro rozdělaný trénink — nepřenáší se.
    consecutiveCorrect:  local.consecutiveCorrect,
  };
}

/** U každého příkladu vyhrává karta s víc opakováními, při shodě pozdější termín. */
export function mergeCards(local: SM2Card[], remote: SM2Card[]): SM2Card[] {
  const byId = new Map<string, SM2Card>();
  for (const c of remote) byId.set(c.exampleId, c);
  for (const c of local) {
    const r = byId.get(c.exampleId);
    if (!r || c.repetitions > r.repetitions ||
        (c.repetitions === r.repetitions && c.nextReview > r.nextReview)) {
      byId.set(c.exampleId, c);
    }
  }
  return [...byId.values()];
}

export interface HydrateResult {
  cards: number;
  topics: number;
  badges: number;
  diagRestored: boolean;
  todayCount: number;
}

/**
 * Natáhne postup ze Supabase a sloučí ho s tím, co je v prohlížeči.
 * Volat po přihlášení. Bezpečné volat opakovaně.
 */
export async function hydrateFromRemote(userId: string): Promise<HydrateResult | null> {
  if (!supabase || typeof window === "undefined") return null;
  const result: HydrateResult = { cards: 0, topics: 0, badges: 0, diagRestored: false, todayCount: 0 };

  try {
    const [gamRes, cardsRes, badgesRes, diagRes] = await Promise.all([
      supabase.from("user_gamification").select("state").eq("user_id", userId).maybeSingle(),
      supabase.from("sm2_cards").select("example_id, interval, ease, next_review, repetitions, last_quality").eq("user_id", userId),
      supabase.from("user_badges").select("badge_id").eq("user_id", userId),
      supabase.from("diagnostic_results").select("tema, correct, total").eq("user_id", userId),
    ]);

    // ── Gamifikace (topicStats, odznaky, počty) ──────────────────────────────
    const local = loadGamification();
    let merged = local;
    const remoteState = gamRes.data?.state as GamificationState | undefined;
    if (remoteState) merged = mergeGamification(local, remoteState);

    // Odznaky z vlastní tabulky doplníme taky — je to zdroj pravdy o odznacích
    const remoteBadges = (badgesRes.data ?? []).map((b) => b.badge_id as string);
    if (remoteBadges.length > 0) {
      merged = { ...merged, earnedBadges: [...new Set([...merged.earnedBadges, ...remoteBadges])] };
    }
    result.badges = merged.earnedBadges.length;
    result.topics = Object.keys(merged.topicStats).length;
    saveGamification(merged);

    // ── SM-2 karty (stav opakování) ──────────────────────────────────────────
    const remoteCards: SM2Card[] = (cardsRes.data ?? []).map((r) => ({
      exampleId:   r.example_id as string,
      interval:    (r.interval as number) ?? 0,
      easeFactor:  (r.ease as number) ?? 2.5,
      nextReview:  (r.next_review as number) ?? 0,
      repetitions: (r.repetitions as number) ?? 0,
      lastQuality: (r.last_quality as number) ?? 0,
    }));
    if (remoteCards.length > 0) {
      const mergedCards = mergeCards(localLoadCards(), remoteCards);
      localSaveCards(mergedCards);
      result.cards = mergedCards.length;
    }

    // ── Dnešní počet příkladů ────────────────────────────────────────────────
    // Žije jen v localStorage, který odhlášení maže. Bez obnovy ukazoval domov
    // „Dnešní cíl 0/10" a mise „Začít trénink", i když žák ten den už trénoval.
    try {
      // Stejný formát data jako zapisovatelé (trénink, localSaveSession) — UTC.
      // Lokální datum by se s nimi po půlnoci rozešlo a počet by zmizel.
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: todayRows } = await supabase
        .from("sessions")
        .select("total")
        .eq("user_id", userId)
        .eq("date", todayStr);
      const serverToday = (todayRows ?? []).reduce((s, r) => s + ((r.total as number) ?? 0), 0);
      if (serverToday > 0) {
        let local = 0;
        try {
          const raw = localStorage.getItem("matemax-today");
          if (raw) {
            const parsed = JSON.parse(raw) as { date?: string; count?: number };
            if (parsed.date === todayStr) local = parsed.count ?? 0;
          }
        } catch { /* ignore */ }
        // Vyšší vyhrává — stejně jako u zbytku slučování
        localStorage.setItem(
          "matemax-today",
          JSON.stringify({ date: todayStr, count: Math.max(local, serverToday) })
        );
        result.todayCount = Math.max(local, serverToday);
      }
    } catch { /* ignore */ }

    // ── Diagnostika (aby appka nenabízela test, který už žák udělal) ─────────
    const diagRows = diagRes.data ?? [];
    if (diagRows.length > 0 && localStorage.getItem("matemax-diag-done") !== "1") {
      const results: Record<string, { correct: number; total: number }> = {};
      for (const r of diagRows) {
        results[r.tema as string] = { correct: r.correct as number, total: r.total as number };
      }
      localStorage.setItem("matemax-diag-results", JSON.stringify(results));
      localStorage.setItem("matemax-diag-done", "1");
      result.diagRestored = true;
    }

    return result;
  } catch (err) {
    console.error("[hydrateFromRemote] selhalo:", err);
    return null;
  }
}
