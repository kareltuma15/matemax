"use client";

import { najdiVideolekci } from "@/data/videolekce";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

/**
 * Po chybě nabídne videolekci k tématu úlohy (jen když nějaká veřejná existuje).
 * Otevře YouTube v nové záložce, ať žák nepřijde o rozpracovaný trénink; klepnutí se měří.
 */
export default function VideoLessonHint({ tema, podtema }: { tema: string; podtema?: string | null }) {
  const nalez = najdiVideolekci(tema, podtema);
  if (!nalez) return null;
  const { lekce, presna } = nalez;

  function zmerit() {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      trackEvent(data.session?.user.id ?? null, "videolekce_klik", { lekce: lekce.id, tema, podtema: podtema ?? null, presna }).catch(() => {});
    });
  }

  return (
    <a
      href={lekce.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={zmerit}
      data-testid="videolekce-odkaz"
      className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-indigo-50"
      style={{ background: "#eef2ff", borderColor: "#c7d2fe" }}
    >
      <span className="text-2xl shrink-0" aria-hidden>🎬</span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wide" style={{ color: "#6366f1" }}>
          {presna ? "Nechápeš? Pusť si lekci" : "Zopakuj si základy"}
        </span>
        <span className="block text-sm font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{lekce.nazev}</span>
        <span className="block text-xs" style={{ color: "#64748b" }}>Krátké video s výkladem od lektora, otevře se na YouTube</span>
      </span>
      <span className="text-sm font-black shrink-0" style={{ color: "#4f46e5" }} aria-hidden>▶</span>
    </a>
  );
}
