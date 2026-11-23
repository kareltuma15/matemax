"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Zadost, ZadostiDitete } from "@/lib/propojeni-rodice";

type Hlaska = { druh: "ok" | "info" | "chyba"; text: string };

async function token(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Souhlas dítěte s propojením rodiče. Domov: jen čekající žádosti (povolit / odmítnout), bez žádosti nic.
 * Profil: navíc kdo už přehled vidí, se zrušením. Bez souhlasu rodič nevidí žádná data ani nedostává report.
 */
export default function ZadostiRodicu({ misto }: { misto: "domov" | "profil" }) {
  const [stav, setStav] = useState<ZadostiDitete | null>(null);
  const [pracuji, setPracuji] = useState<string | null>(null);
  const [rusit, setRusit] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<Hlaska | null>(null);

  useEffect(() => {
    let zruseno = false;
    token().then(async (t) => {
      if (!t) return;
      const res = await fetch("/api/parent-link/zadosti", { headers: { Authorization: `Bearer ${t}` } }).catch(() => null);
      if (!res?.ok || zruseno) return;
      setStav((await res.json()) as ZadostiDitete);
    });
    return () => { zruseno = true; };
  }, []);

  async function odpovez(z: Zadost, akce: "povolit" | "odmitnout" | "zrusit") {
    const t = await token();
    if (!t) return;
    setPracuji(z.token);
    setHlaska(null);
    const res = await fetch("/api/parent-link/zadosti", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ token: z.token, akce }),
    }).catch(() => null);
    setPracuji(null);
    setRusit(null);
    if (!res?.ok) {
      setHlaska({ druh: "chyba", text: "Nepovedlo se to uložit. Zkus to prosím znovu." });
      return;
    }
    setStav((s) => {
      if (!s) return s;
      const cekajici = s.cekajici.filter((x) => x.token !== z.token);
      const overene = akce === "povolit" ? [...s.overene, z] : s.overene.filter((x) => x.token !== z.token);
      return { cekajici, overene };
    });
    setHlaska(
      akce === "povolit"
        ? { druh: "ok", text: `Propojeno. ${z.rodic} teď vidí tvůj přehled. Zrušit to můžeš kdykoli v Profilu.` }
        : akce === "odmitnout"
          ? { druh: "info", text: `Odmítnuto. ${z.rodic} nic neuvidí.` }
          : { druh: "info", text: `Zrušeno. ${z.rodic} už tvůj přehled nevidí.` },
    );
  }

  const cekajici = stav?.cekajici ?? [];
  const overene = misto === "profil" ? stav?.overene ?? [] : [];
  if (cekajici.length === 0 && overene.length === 0 && !hlaska) return null;

  const barvaHlasky = hlaska?.druh === "ok" ? "#166534" : hlaska?.druh === "chyba" ? "#B91C1C" : "#334155";

  return (
    <div
      className={misto === "domov" ? "mm-karta p-4 lg:p-5 flex flex-col gap-3" : "px-4 py-3.5 flex flex-col gap-3"}
      style={misto === "domov" ? { border: "2px solid #5B55D6" } : undefined}
      data-testid={`zadosti-rodicu-${misto}`}
    >
      {cekajici.map((z) => (
        <div key={z.token} className="flex flex-col gap-2.5" data-testid="zadost-rodice">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">👨‍👩‍👧</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold" style={{ color: "#0D1B3E" }}>Rodič se chce propojit</p>
              <p className="text-sm leading-relaxed break-words" style={{ color: "#5F6982" }}>
                <b style={{ color: "#0D1B3E" }}>{z.rodic}</b> chce vidět tvůj přehled v MateMaxu: kolik trénuješ,
                úspěšnost v tématech a odhad bodů. Povol to, jen když je to tvůj rodič.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => odpovez(z, "povolit")}
              disabled={pracuji === z.token}
              className="flex-1 py-2.5 rounded-xl text-sm font-extrabold text-white disabled:opacity-60"
              style={{ background: "#5B55D6" }}
            >
              Povolit
            </button>
            <button
              type="button"
              onClick={() => odpovez(z, "odmitnout")}
              disabled={pracuji === z.token}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 disabled:opacity-60"
            >
              Odmítnout
            </button>
          </div>
        </div>
      ))}

      {overene.map((z) => (
        <div key={z.token} className="flex flex-col gap-2" data-testid="propojeny-rodic">
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">👨‍👩‍👧</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Propojeno s rodičem</p>
              <p className="text-xs text-slate-400 break-words">{z.rodic} vidí tvůj přehled</p>
            </div>
            {rusit !== z.token && (
              <button type="button" onClick={() => setRusit(z.token)} className="text-xs font-bold text-red-600 px-2 py-1">
                Zrušit
              </button>
            )}
          </div>
          {rusit === z.token && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-xs text-slate-700">{z.rodic} přestane vidět tvůj přehled a nebude dostávat týdenní report.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => odpovez(z, "zrusit")} disabled={pracuji === z.token} className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-red-600 disabled:opacity-60">
                  {pracuji === z.token ? "Ruším…" : "Ano, zrušit"}
                </button>
                <button type="button" onClick={() => setRusit(null)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700">
                  Nechat propojené
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {hlaska && (
        <p className="text-sm font-semibold break-words" style={{ color: barvaHlasky }} role="status" data-testid="zadosti-hlaska">
          {hlaska.text}
        </p>
      )}
    </div>
  );
}
