import { getReadiness, TopicReadiness } from "./readiness";
import { getDaysUntilCermat } from "./cermat-date";

export interface DayPlan {
  dayIdx: number;       // 0=Mon … 5=Sat, 6=Sun
  dayName: string;
  isToday: boolean;
  isRest: boolean;
  topic: TopicReadiness | null;
  sessionsTarget: number;
}

const DAY_NAMES = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

export function generateWeeklyPlan(): { days: DayPlan[]; daysUntil: number; hasData: boolean } {
  const r = getReadiness();
  const daysUntil = getDaysUntilCermat();

  if (!r.hasData) {
    return { days: emptyPlan(), daysUntil, hasData: false };
  }

  // Sort: weakest first; skip topics with score ≥ 90 (mastered) unless all mastered
  const sorted = [...r.topics].sort((a, b) => a.score - b.score);
  const needsPractice = sorted.filter((t) => t.score < 90);
  const pool = needsPractice.length > 0 ? needsPractice : sorted;

  // Intensity based on time left
  const sessionsTarget = daysUntil <= 30 ? 15 : daysUntil <= 90 ? 12 : 10;

  // ISO weekday: 1=Mon … 7=Sun → convert to 0-based
  const todayJs = new Date().getDay(); // 0=Sun,1=Mon…6=Sat
  const todayIdx = todayJs === 0 ? 6 : todayJs - 1; // 0=Mon…6=Sun

  const days: DayPlan[] = DAY_NAMES.map((dayName, dayIdx) => {
    const isRest = dayIdx === 6;
    return {
      dayIdx,
      dayName,
      isToday: dayIdx === todayIdx,
      isRest,
      topic: isRest ? null : pool[dayIdx % pool.length],
      sessionsTarget: isRest ? 0 : sessionsTarget,
    };
  });

  return { days, daysUntil, hasData: true };
}

function emptyPlan(): DayPlan[] {
  const todayJs = new Date().getDay();
  const todayIdx = todayJs === 0 ? 6 : todayJs - 1;
  return DAY_NAMES.map((dayName, dayIdx) => ({
    dayIdx, dayName, isToday: dayIdx === todayIdx,
    isRest: dayIdx === 6, topic: null, sessionsTarget: 0,
  }));
}

export function getTodayTopic(): TopicReadiness | null {
  const { days } = generateWeeklyPlan();
  return days.find((d) => d.isToday)?.topic ?? null;
}
