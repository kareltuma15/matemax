"use client";

import { useState } from "react";
import { localDateStr } from "@/lib/date";

/** Nejbližší sobota (dnes, když je sobota): termíny testů nanečisto jsou v sobotu. */
function nejblizsiSobota(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return localDateStr(d);
}

/**
 * Admin: kód Generálka pro test nanečisto daného dne. Karel ho řekne nebo napíše na tabuli v učebně,
 * žáci ho uplatní ve Sbírce (Hexík → Truhly) do 45 dní. Stejný kód umí spočítat i appka Vyhodnocení testů.
 */
export default function AdminKodGeneralka({ token }: { token: string | null }) {
  const [den, setDen] = useState(nejblizsiSobota);
  const [kod, setKod] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  async function zobraz() {
    if (!token) return;
    setChyba(null);
    setKod(null);
    const res = await fetch(`/api/admin/generalka?d=${den}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = (await res.json()) as { kod?: string; error?: string };
    if (!res.ok || !j.kod) { setChyba(j.error ?? "Nepodařilo se načíst kód."); return; }
    setKod(j.kod);
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }} data-testid="admin-kod-generalka">
      <div>
        <div className="font-bold" style={{ color: "#0D1B3E" }}>🏫 Kód Generálka pro test nanečisto</div>
        <p className="text-xs" style={{ color: "#64748b" }}>
          Řekni ho žákům v učebně nebo ho napiš na tabuli. Ve Sbírce (Hexík → Truhly) za něj dostanou Truhlu Generálka, za první test i legendární pozadí. Platí 45 dní a je stejný pro 5. i 9. třídu.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={den} onChange={(e) => setDen(e.target.value)} className="rounded-lg px-3 py-2 text-sm border" style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }} />
        <button type="button" onClick={zobraz} className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: "#0D1B3E" }}>Zobrazit kód</button>
        {kod && <span className="text-2xl font-black tracking-widest" style={{ color: "#A66300" }} data-testid="admin-kod">{kod}</span>}
        {chyba && <span className="text-sm font-bold" style={{ color: "#B4232F" }}>{chyba}</span>}
      </div>
    </div>
  );
}
