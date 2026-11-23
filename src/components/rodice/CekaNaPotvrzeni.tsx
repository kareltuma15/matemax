"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Rodičovský přehled, dokud dítě žádost nepotvrdilo: jen e-mail, který rodič sám zadal, žádná data dítěte.
 * Stránka /rodice/dashboard, náhled /nahled?rodic=ceka.
 */
export default function CekaNaPotvrzeni({ emaily, onZruseno }: { emaily: string[]; onZruseno: () => void }) {
  const [rusim, setRusim] = useState(false);

  async function zrusit() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    setRusim(true);
    // Rodič bez ověřeného dítěte má jen čekající žádosti, /api/parent-unlink smaže právě ty.
    const res = await fetch("/api/parent-unlink", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    }).catch(() => null);
    setRusim(false);
    if (res?.ok) onZruseno();
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-6 items-center text-center pt-8" data-testid="rodic-ceka">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl" style={{ background: "#fef3c7" }}>⏳</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#047857" }}>Rodičovský portál</p>
        <h2 className="text-2xl font-extrabold" style={{ color: "#064E3B" }}>Čeká na potvrzení dítětem</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed break-words">
          Žádost o propojení s účtem <strong>{emaily.join(", ")}</strong> zatím dítě nepotvrdilo.
          Až se přihlásí do MateMaxu, uvidí ji na Domově. Přehled se vám ukáže hned po potvrzení.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full py-4 rounded-2xl text-white font-extrabold text-base shadow-md"
        style={{ background: "linear-gradient(135deg,#064E3B 0%,#047857 100%)" }}
      >
        Zkontrolovat znovu
      </button>
      <button type="button" onClick={zrusit} disabled={rusim} className="text-sm text-slate-500 underline disabled:opacity-60">
        {rusim ? "Ruším…" : "Zrušit žádost"}
      </button>
    </div>
  );
}
