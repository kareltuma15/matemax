/** Lidský čas v adminu (Europe/Prague): „před 5 min“, „před 2 h“, „včera 16:00“, „24. 11. 7:00“. */
import { pragueDateStr } from "@/lib/date";

export function kdy(iso: string, ted: number = Date.now()): string {
  const t = Date.parse(iso);
  const min = Math.round((ted - t) / 60000);
  if (min < 1) return "teď";
  if (min < 60) return `před ${min} min`;
  if (min < 6 * 60) return `před ${Math.round(min / 60)} h`;
  const cas = new Date(t).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit", timeZone: "Europe/Prague" });
  const den = pragueDateStr(new Date(t));
  if (den === pragueDateStr(new Date(ted))) return `dnes ${cas}`;
  if (den === pragueDateStr(new Date(ted - 86400000))) return `včera ${cas}`;
  return `${new Date(t).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" })} ${cas}`;
}

/** Doba mezi dvěma časy: „3 min“, „2 h“, „1 den“. */
export function doba(odIso: string, doIso: string): string {
  const min = Math.max(0, Math.round((Date.parse(doIso) - Date.parse(odIso)) / 60000));
  if (min < 60) return `${min} min`;
  if (min < 48 * 60) return `${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return `${d} ${d >= 2 && d <= 4 ? "dny" : "dní"}`;
}
