"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Nastavení v profilu: „Propojeno s Testy nanečisto“ + Zrušit propojení. Bez propojení se nic neukazuje. */
export default function PropojeniVysledky() {
  const [stav, setStav] = useState<{ propojeno: boolean; od: string | null } | null>(null);
  const [potvrdit, setPotvrdit] = useState(false);
  const [rusim, setRusim] = useState(false);

  async function token(): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  useEffect(() => {
    let zruseno = false;
    token().then(async (t) => {
      if (!t) return;
      const res = await fetch("/api/vysledky/propojeni/moje", { headers: { Authorization: `Bearer ${t}` } }).catch(() => null);
      if (!res?.ok || zruseno) return;
      setStav((await res.json()) as { propojeno: boolean; od: string | null });
    });
    return () => { zruseno = true; };
  }, []);

  async function zrusit() {
    const t = await token();
    if (!t) return;
    setRusim(true);
    const res = await fetch("/api/vysledky/propojeni/moje", { method: "DELETE", headers: { Authorization: `Bearer ${t}` } }).catch(() => null);
    setRusim(false);
    if (res?.ok) setStav({ propojeno: false, od: null });
  }

  if (!stav?.propojeno) return null;
  const od = stav.od ? new Date(stav.od).toLocaleDateString("cs-CZ") : null;

  return (
    <div className="px-4 py-3.5 flex flex-col gap-2" data-testid="profil-propojeni">
      <div className="flex items-center gap-3">
        <span className="text-xl">🔗</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Propojeno s Testy nanečisto</p>
          <p className="text-xs text-slate-400">Body z testů chodí do plánu{od ? ` · od ${od}` : ""}</p>
        </div>
        {!potvrdit && (
          <button type="button" onClick={() => setPotvrdit(true)} className="text-xs font-bold text-red-600 px-2 py-1">
            Zrušit propojení
          </button>
        )}
      </div>
      {potvrdit && (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
          <p className="text-xs text-slate-700">Výsledky testů už nebudou chodit do MateMaxu a Testy nanečisto neuvidí, co procvičuješ. Plán ti zůstane.</p>
          <div className="flex gap-2">
            <button type="button" onClick={zrusit} disabled={rusim} className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-red-600 disabled:opacity-60">
              {rusim ? "Ruším…" : "Ano, zrušit"}
            </button>
            <button type="button" onClick={() => setPotvrdit(false)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700">
              Nechat propojené
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
