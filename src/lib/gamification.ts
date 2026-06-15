import gamData from "@/data/matemax-gamification-system.json";

export type LevelKey = "zacatecnik" | "zak" | "pokrocily" | "expert" | "mistr";
export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface LevelData {
  id: number;
  key: LevelKey;
  label: string;
  xp_min: number;
  xp_max: number | null;
  color: string;
  icon_emoji: string;
  rank_title: string;
  progress_bar_color: string;
}

export interface BadgeConfig {
  id: string;
  category: string;
  label: string;
  description: string;
  icon_emoji: string;
  icon_color: string;
  rarity: BadgeRarity;
  xp_reward: number;
  ui: { toast_text: string; modal_title: string; modal_text: string };
}

export interface GamificationState {
  totalSolved: number;
  perfectSessions: number;
  earnedBadges: string[];
  lastLevelKey: LevelKey;
  topicStats: Record<string, { correct: number; total: number }>;
  lastSessionDate: string | null;
  lastDailyGoalDate: string | null;
  dailyGoalsCompleted: number;
  consecutiveCorrect: number;
  weekendDaysSeen: number[];
}

const GAMIFICATION_KEY = "matemax-gamification";

const DEFAULT_STATE: GamificationState = {
  totalSolved: 0,
  perfectSessions: 0,
  earnedBadges: [],
  lastLevelKey: "zacatecnik",
  topicStats: {},
  lastSessionDate: null,
  lastDailyGoalDate: null,
  dailyGoalsCompleted: 0,
  consecutiveCorrect: 0,
  weekendDaysSeen: [],
};

export function loadGamification(): GamificationState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_STATE };
}

export function saveGamification(state: GamificationState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(state));
  }
}

// ── Level system ──────────────────────────────────────────────────────────────

const LEVELS = gamData.level_system.levels as unknown as LevelData[];

export function getLevelFromXP(xp: number): LevelData {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp_min) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getLevelData(key: LevelKey): LevelData {
  return LEVELS.find((l) => l.key === key) ?? LEVELS[0];
}

export function xpToNextLevel(xp: number): number | null {
  const current = getLevelFromXP(xp);
  if (current.xp_max === null) return null;
  return current.xp_max + 1 - xp;
}

// ── XP / streak ───────────────────────────────────────────────────────────────

const STREAK_TIERS = gamData.xp_config.streak_multiplier.tiers;

export function getStreakMultiplier(streakDays: number): number {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (streakDays >= STREAK_TIERS[i].min_days) return STREAK_TIERS[i].multiplier;
  }
  return 1.0;
}

export function getStreakMultiplierLabel(streakDays: number): string {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (streakDays >= STREAK_TIERS[i].min_days) return STREAK_TIERS[i].label;
  }
  return "Žádný bonus";
}

type XPActionKey = keyof typeof gamData.xp_config.actions;

export function calculateXP(action: XPActionKey, streakDays: number): number {
  const cfg = gamData.xp_config.actions[action];
  if (!cfg) return 0;
  const xp = cfg.xp;
  return cfg.multiplier_streak ? Math.round(xp * getStreakMultiplier(streakDays)) : xp;
}

// ── Badges ────────────────────────────────────────────────────────────────────

const ALL_BADGES = gamData.badges as unknown as BadgeConfig[];

export function getBadgeConfig(id: string): BadgeConfig | undefined {
  return ALL_BADGES.find((b) => b.id === id);
}

export function getAllBadges(): BadgeConfig[] {
  return ALL_BADGES;
}

export function getBadgeCategoryConfig(category: string): { label: string; icon: string; color: string } | undefined {
  const cats = gamData.badge_categories as Record<string, { label: string; icon: string; color: string }>;
  return cats[category];
}

// ── Badge checkers ────────────────────────────────────────────────────────────

function notYet(earned: string[], id: string): boolean {
  return !earned.includes(id);
}

export function checkBadgesOnExampleSolved(state: GamificationState): string[] {
  const { totalSolved, consecutiveCorrect, earnedBadges: e } = state;
  const r: string[] = [];
  if (totalSolved >= 1   && notYet(e, "badge_first_example"))  r.push("badge_first_example");
  if (totalSolved >= 10  && notYet(e, "badge_10_examples"))    r.push("badge_10_examples");
  if (totalSolved >= 50  && notYet(e, "badge_50_examples"))    r.push("badge_50_examples");
  if (totalSolved >= 100 && notYet(e, "badge_100_examples"))   r.push("badge_100_examples");
  if (totalSolved >= 250 && notYet(e, "badge_250_examples"))   r.push("badge_250_examples");
  if (totalSolved >= 500 && notYet(e, "badge_500_examples"))   r.push("badge_500_examples");
  if (consecutiveCorrect >= 10 && notYet(e, "badge_no_mistakes_10")) r.push("badge_no_mistakes_10");
  return r;
}

export function checkBadgesOnStreak(state: GamificationState, streakDays: number): string[] {
  const e = state.earnedBadges;
  const r: string[] = [];
  if (streakDays >= 3   && notYet(e, "badge_streak_3"))   r.push("badge_streak_3");
  if (streakDays >= 7   && notYet(e, "badge_streak_7"))   r.push("badge_streak_7");
  if (streakDays >= 14  && notYet(e, "badge_streak_14"))  r.push("badge_streak_14");
  if (streakDays >= 30  && notYet(e, "badge_streak_30"))  r.push("badge_streak_30");
  if (streakDays >= 100 && notYet(e, "badge_streak_100")) r.push("badge_streak_100");
  return r;
}

export function checkBadgesOnSession(
  state: GamificationState,
  params: { correct: number; total: number; sessionDurationMinutes?: number }
): string[] {
  const { perfectSessions, earnedBadges: e } = state;
  const { correct, total, sessionDurationMinutes } = params;
  const r: string[] = [];
  if (total >= 10 && correct === total    && notYet(e, "badge_perfect_session_5"))   r.push("badge_perfect_session_5");
  if (perfectSessions >= 3               && notYet(e, "badge_perfect_session_3x"))  r.push("badge_perfect_session_3x");
  if ((sessionDurationMinutes ?? 0) >= 30 && notYet(e, "badge_marathon_session"))   r.push("badge_marathon_session");
  return r;
}

export function checkBadgesOnLevelUp(state: GamificationState, newLevelKey: LevelKey): string[] {
  const e = state.earnedBadges;
  const r: string[] = [];
  if (newLevelKey === "zak"       && notYet(e, "badge_level_up_zak"))       r.push("badge_level_up_zak");
  if (newLevelKey === "pokrocily" && notYet(e, "badge_level_up_pokrocily")) r.push("badge_level_up_pokrocily");
  if (newLevelKey === "expert"    && notYet(e, "badge_level_up_expert"))    r.push("badge_level_up_expert");
  if (newLevelKey === "mistr"     && notYet(e, "badge_level_up_mistr"))     r.push("badge_level_up_mistr");
  return r;
}

const ALL_TOPIC_KEYS = ["zlomky", "vyrazy", "rovnice", "geometrie", "slovni_ulohy", "grafy_logika", "uhly"];
const TOPIC_BADGE_MAP: [string, string][] = [
  ["badge_zlomky_master",       "zlomky"],
  ["badge_rovnice_master",      "rovnice"],
  ["badge_geometrie_master",    "geometrie"],
  ["badge_mocniny_master",      "vyrazy"],       // mocniny sloučeny do vyrazy
  ["badge_slovni_ulohy_master", "slovni_ulohy"],
  ["badge_procenta_master",     "procenta"],     // legacy: procenta = podtéma slovních úloh, badge subsumován (netriggeruje)
];

function topicMastered(
  stats: GamificationState["topicStats"],
  topic: string,
  accMin: number,
  exMin: number
): boolean {
  const s = stats[topic];
  return !!s && s.total >= exMin && s.correct / s.total >= accMin;
}

export function checkBadgesOnTopics(state: GamificationState): string[] {
  const { topicStats, earnedBadges: e } = state;
  const r: string[] = [];
  for (const [badgeId, topic] of TOPIC_BADGE_MAP) {
    if (topicMastered(topicStats, topic, 0.8, 30) && notYet(e, badgeId)) r.push(badgeId);
  }
  if (ALL_TOPIC_KEYS.every((t) => topicMastered(topicStats, t, 0.8, 30)) && notYet(e, "badge_all_topics_master")) {
    r.push("badge_all_topics_master");
  }
  if (ALL_TOPIC_KEYS.every((t) => topicMastered(topicStats, t, 0.75, 20)) && notYet(e, "badge_cermat_ready")) {
    r.push("badge_cermat_ready");
  }
  return r;
}

export function checkBadgesOnSessionStart(state: GamificationState, now: Date): string[] {
  const { earnedBadges: e, lastSessionDate, weekendDaysSeen } = state;
  const r: string[] = [];
  const hour = now.getHours();
  const dow = now.getDay();

  if (hour >= 6 && hour < 8 && notYet(e, "badge_early_bird")) r.push("badge_early_bird");
  if (hour >= 21             && notYet(e, "badge_night_owl"))  r.push("badge_night_owl");

  if (lastSessionDate) {
    const diffDays = Math.floor(
      (now.getTime() - new Date(lastSessionDate + "T00:00:00").getTime()) / 86400000
    );
    if (diffDays >= 7 && notYet(e, "badge_comeback_kid")) r.push("badge_comeback_kid");
  }

  const updatedWeekend = [...new Set([...weekendDaysSeen, dow])];
  if (updatedWeekend.includes(0) && updatedWeekend.includes(6) && notYet(e, "badge_weekend_warrior")) {
    r.push("badge_weekend_warrior");
  }
  return r;
}

export function checkBadgesOnDailyGoal(state: GamificationState): string[] {
  if (state.dailyGoalsCompleted >= 7 && notYet(state.earnedBadges, "badge_daily_goal_7x")) {
    return ["badge_daily_goal_7x"];
  }
  return [];
}
