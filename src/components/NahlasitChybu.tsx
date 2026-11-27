"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * „Nahlásit chybu v úloze“ (úprava appky 8, mockup fáze B, obrazovka 12): malý šedý odkaz pod vyhodnocením.
 * Pošle jen ID úlohy, důvod, nepovinnou poznámku (max 300 znaků) a odpověď žáka (číslo nebo volba). Hlášení přijde
 * do Schránky v adminu. Jednu úlohu jde nahlásit jednou za den (pamatuje si prohlížeč).
 */
const DUVODY = [["spatny_vysledek", "Špatný výsledek"], ["nejasne_zadani", "Nejasné zadání"], ["chyba_obrazku", "Chyba v obrázku"], ["jine", "Jiné"]] as const;

export default function NahlasitChybu({ ulohaId, odpoved }: { ulohaId: string; odpoved?: string | null }) {
  const klic = `nahlaseno-${ulohaId}-${new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" })}`;
  const [stav, setStav] = useState<"zavreno" | "otevreno" | "odesilam" | "hotovo" | "chyba">("zavreno");
  // Už nahlášeno dnes? Zjistí se až při kliknutí (čtení z prohlížeče při vykreslení by rozbilo hydrataci)
  const otevri = () => { let uz = false; try { uz = !!localStorage.getItem(klic); } catch { uz = false; } setStav(uz ? "hotovo" : "otevreno"); };
  const [duvod, setDuvod] = useState<string>("spatny_vysledek");
  const [poznamka, setPoznamka] = useState("");

  if (stav === "hotovo") return <p className="text-center text-xs text-slate-400 pt-2" data-testid="nahlasit-hotovo">Díky, Karel se na to podívá.</p>;
  if (stav === "zavreno") return (
    <div className="flex justify-center pt-2">
      <button type="button" onClick={otevri} className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 min-h-[32px]" data-testid="nahlasit-chybu">
        Nahlásit chybu v úloze
      </button>
    </div>
  );

  const odeslat = async () => {
    setStav("odesilam");
    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
      const r = await fetch("/api/nahlasit-chybu", {
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uloha: ulohaId, duvod, poznamka: poznamka.trim().slice(0, 300), odpoved: odpoved ?? null }),
      });
      if (!r.ok) throw new Error();
      try { localStorage.setItem(klic, "1"); } catch { /* nic */ }
      setStav("hotovo");
    } catch { setStav("chyba"); }
  };

  return (
    <div className="mt-2 rounded-2xl p-3 flex flex-col gap-2" style={{ background: "#F5F6FA", border: "1px solid #E4E6EF" }} data-testid="nahlasit-formular">
      <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Co je na úloze špatně?</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Důvod">
        {DUVODY.map(([k, n]) => (
          <button key={k} type="button" role="radio" aria-checked={duvod === k} onClick={() => setDuvod(k)}
            className="text-xs font-semibold rounded-full px-3 min-h-[36px]"
            style={duvod === k ? { background: "#0D1B3E", color: "#fff" } : { background: "#fff", color: "#0D1B3E", border: "1px solid #E4E6EF" }}>{n}</button>
        ))}
      </div>
      <textarea value={poznamka} onChange={(e) => setPoznamka(e.target.value)} maxLength={300} rows={2} placeholder="Co přesně? (nepovinné)" aria-label="Poznámka"
        className="w-full rounded-xl p-2 text-sm" style={{ border: "1px solid #E4E6EF", background: "#fff", color: "#0D1B3E" }} />
      <div className="flex gap-2">
        <button type="button" onClick={odeslat} disabled={stav === "odesilam"} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: "#0D1B3E" }}>{stav === "odesilam" ? "Posílám…" : "Odeslat"}</button>
        <button type="button" onClick={() => setStav("zavreno")} className="py-2.5 px-4 rounded-xl text-sm font-bold" style={{ color: "#0D1B3E", border: "1px solid #E4E6EF" }}>Zrušit</button>
      </div>
      {stav === "chyba" && <p className="text-xs" style={{ color: "#B4232F" }}>Nepodařilo se odeslat. Zkus to za chvíli.</p>}
      <p className="text-[11px] text-slate-400">Pošle se jen úloha{odpoved ? ", tvoje odpověď" : ""} a důvod.</p>
    </div>
  );
}
