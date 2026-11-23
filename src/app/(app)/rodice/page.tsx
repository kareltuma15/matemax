"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/**
 * Vstup pro rodiče. Dřív tu byl formulář „přihlásit k odběru“, který ukládal e-maily do staré tabulky,
 * ze které týdenní report nikdy nečetl (rodič dostal jen potvrzení). Report chodí jen rodičům s ověřeným
 * propojením (parent_child_link), proto stránka vede na účet rodiče a propojení s dítětem.
 */
export default function RodicePage() {
  const [prihlasen, setPrihlasen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setPrihlasen(!!data.session));
  }, []);

  const kroky = [
    { cislo: "1", nadpis: "Účet rodiče", text: "Vytvořte si vlastní účet rodiče (e-mail a heslo), nebo se přihlaste." },
    { cislo: "2", nadpis: "Propojení s dítětem", text: "Zadejte e-mail, pod kterým je dítě registrované v MateMaxu." },
    { cislo: "3", nadpis: "Každé pondělí ráno", text: "Přijde přehled. Kdykoli ho najdete i v rodičovském přehledu." },
  ];

  return (
    <div className="flex flex-col gap-5" data-testid="rodice-vstup">
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}>
        <p className="text-3xl mb-2">👨‍👩‍👧</p>
        <h1 className="text-2xl font-black leading-tight">Týdenní report pro rodiče</h1>
        <p className="text-blue-200 text-sm mt-2 leading-relaxed">
          Každé pondělí dostanete přehled, jak se dítě připravuje na přijímačky. Bez zkoušení u večeře, jen fakta z tréninku.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Co v reportu najdete</p>
        {[
          { icon: "🎯", text: "Odhad bodů u přijímaček a jak se mění po týdnech" },
          { icon: "📊", text: "Kolik příkladů dítě za týden vyřešilo a s jakou úspěšností" },
          { icon: "🧩", text: "Témata, kde má mezery, a co procvičovat dál" },
          { icon: "💡", text: "Jeden konkrétní tip na příští týden" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <span className="text-lg shrink-0" aria-hidden="true">{icon}</span>
            <p className="text-sm text-slate-700">{text}</p>
          </div>
        ))}
        <p className="text-xs text-slate-500 leading-relaxed" data-testid="rodice-premium">
          Týdenní report je součástí MateMax Premium. Rodičovský přehled v appce můžete po propojení používat i bez Premium.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Jak report zapnout</p>
        <ol className="flex flex-col gap-3">
          {kroky.map((k) => (
            <li key={k.cislo} className="flex items-start gap-3">
              <span className="w-7 h-7 shrink-0 rounded-full text-white text-sm font-black flex items-center justify-center" style={{ background: "#2E6DA4" }}>{k.cislo}</span>
              <span className="text-sm text-slate-700"><b style={{ color: "var(--text-primary)" }}>{k.nadpis}.</b> {k.text}</span>
            </li>
          ))}
        </ol>
        {prihlasen ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/rodice/propojeni" className="flex-1 py-3 text-white font-bold rounded-xl text-sm text-center" style={{ background: "#0D1B3E" }} data-testid="rodice-propojit">
              Propojit s dítětem →
            </Link>
            <Link href="/rodice/dashboard" className="flex-1 py-3 font-bold rounded-xl text-sm text-center border border-slate-200" style={{ color: "#0D1B3E" }}>
              Rodičovský přehled
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/rodice/prihlaseni?rezim=registrace" className="flex-1 py-3 text-white font-bold rounded-xl text-sm text-center" style={{ background: "#0D1B3E" }} data-testid="rodice-registrace">
              Vytvořit účet rodiče →
            </Link>
            <Link href="/rodice/prihlaseni" className="flex-1 py-3 font-bold rounded-xl text-sm text-center border border-slate-200" style={{ color: "#0D1B3E" }} data-testid="rodice-prihlasit">
              Už mám účet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
