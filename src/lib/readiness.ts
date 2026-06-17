import { loadGamification } from "./gamification";
import { TEMA_LABELS } from "@/types";

// 9 sjednocených témat (souhrnne = mix → mimo readiness skill skóre)
export const CERMAT_TOPICS = [
  "zlomky", "vyrazy", "rovnice", "geometrie",
  "slovni_ulohy", "grafy_logika", "konstrukce", "uhly",
];

export interface TopicReadiness {
  tema: string;
  label: string;
  score: number;    // 0–100
  practiced: number; // total examples answered in training
}

export interface ReadinessData {
  score: number;   // 0–100 overall
  label: string;
  color: string;
  topics: TopicReadiness[];
  hasData: boolean;
  weakest: TopicReadiness | null;
}

export function getReadiness(): ReadinessData {
  if (typeof window === "undefined") return empty();

  const gam = loadGamification();
  let diag: Record<string, { correct: number; total: number }> = {};
  try {
    const raw = localStorage.getItem("matemax-diag-results");
    if (raw) diag = JSON.parse(raw);
  } catch { /* ignore */ }

  const topics: TopicReadiness[] = CERMAT_TOPICS.map((tema) => {
    const g = gam.topicStats[tema];
    const d = diag[tema];

    let score = 0;
    if (g && g.total >= 3) {
      const practiceScore = (g.correct / g.total) * 100;
      const diagScore = d && d.total > 0 ? (d.correct / d.total) * 100 : practiceScore;
      // Practice is more current; diagnostic gives a baseline
      score = practiceScore * 0.65 + diagScore * 0.35;
    } else if (g && g.total > 0) {
      // Too few reps — discount proportionally
      score = (g.correct / g.total) * 100 * (g.total / 3) * 0.8;
    } else if (d && d.total > 0) {
      // Only diagnostic — discount for lack of actual practice
      score = (d.correct / d.total) * 100 * 0.55;
    }

    return {
      tema,
      label: TEMA_LABELS[tema] ?? tema,
      score: Math.round(Math.min(100, Math.max(0, score))),
      practiced: g?.total ?? 0,
    };
  });

  const overall = Math.round(
    topics.reduce((sum, t) => sum + t.score, 0) / topics.length
  );

  const hasData = topics.some((t) => t.score > 0);
  const scoredTopics = topics.filter((t) => t.score > 0 || t.practiced > 0);
  const weakest = scoredTopics.length > 0
    ? [...scoredTopics].sort((a, b) => a.score - b.score)[0]
    : null;

  return { score: overall, label: toLabel(overall), color: toColor(overall), topics, hasData, weakest };
}

function toLabel(s: number): string {
  if (s >= 80) return "Výborná příprava";
  if (s >= 60) return "Dobrá příprava";
  if (s >= 35) return "Rozvíjíš se";
  if (s >= 10) return "Začínáš";
  return "Teprve začínáš";
}

function toColor(s: number): string {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#2563eb";
  if (s >= 35) return "#d97706";
  return "#ef4444";
}

function empty(): ReadinessData {
  return {
    score: 0,
    label: "Teprve začínáš",
    color: "#ef4444",
    topics: CERMAT_TOPICS.map((tema) => ({
      tema,
      label: TEMA_LABELS[tema] ?? tema,
      score: 0,
      practiced: 0,
    })),
    hasData: false,
    weakest: null,
  };
}
