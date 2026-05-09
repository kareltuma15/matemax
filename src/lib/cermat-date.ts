const MONTH = 3; // April (0-indexed)
const DAY = 17;

export function getDaysUntilCermat(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const year = now.getFullYear();
  let target = new Date(year, MONTH, DAY);
  if (target <= now) target = new Date(year + 1, MONTH, DAY);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export function getCermatUrgency(days: number) {
  if (days <= 30)  return { label: "Poslední spurt!",      color: "#dc2626", bg: "#fef2f2", border: "#fecaca", emoji: "🔥" };
  if (days <= 90)  return { label: "Finální příprava",     color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", emoji: "⚡" };
  if (days <= 180) return { label: "Přijímačky se blíží", color: "#d97706", bg: "#fffbeb", border: "#fde68a", emoji: "📅" };
  return                   { label: "Čas se připravit",   color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", emoji: "🎯" };
}
