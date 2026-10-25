"use client";

import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import TopicMap5 from "@/components/TopicMap5";
import { usePremium } from "@/lib/premium";
import { vokativ } from "@/lib/vokativ";

/** První jednotný termín přijímaček na víceletá gymnázia (ověřený fakt: 14.–15. 4. 2027). */
const TERMIN_5 = new Date(2027, 3, 14);

function dnyDo(cil: Date): number {
  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((cil.getTime() - dnes.getTime()) / 86400000));
}

/** Úvodní stránka přihlášeného žáka 5. třídy: pozdrav, odpočet k přijímačkám a mapa okruhů. */
export default function Dashboard5({ session }: { session: Session }) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
  const jmeno = meta.first_name || (meta.full_name ?? meta.name ?? "").split(" ")[0] || "";
  const dni = dnyDo(TERMIN_5);

  return (
    <div className="flex flex-col gap-4" data-testid="dashboard-5">
      <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#93c5fd" }}>5. třída</p>
        <h1 className="text-2xl font-black mt-1">{jmeno ? `Ahoj, ${vokativ(jmeno)}!` : "Ahoj!"}</h1>
        <p className="text-sm mt-1" style={{ color: "#dbeafe" }}>
          Do přijímaček na víceletá gymnázia zbývá <strong className="text-white">{dni} dní</strong>. Procvičuj po malých krocích, ať to stihneš v klidu.
        </p>
      </div>
      <TopicMap5 isPremium={isPremium} onSelectTopic={(tema) => router.push(`/trenink?tema=${tema}`)} />
    </div>
  );
}
