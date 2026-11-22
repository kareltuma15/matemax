"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TEMA_LABELS } from "@/types";
import DetailZaka from "@/components/admin/DetailZaka";
import type { Panel, PolozkaPozornosti } from "@/app/api/admin/panel/route";

const IKONA: Record<PolozkaPozornosti["druh"], [string, string]> = {
  premium: ["⏳", "#FDECEC"], odpada: ["📉", "#FFF4E6"], diagnostika: ["🩺", "#FFF4E6"], zpetna: ["💬", "#E8F4FF"],
  propojeni: ["🔗", "#E8F4FF"], chyby: ["⚠️", "#FDECEC"], novinky: ["📰", "#E9F8EF"],
};
const ODKAZ: Partial<Record<PolozkaPozornosti["druh"], [string, string]>> = { chyby: ["/admin/navstevnost", "Statistiky"], novinky: ["/admin/obsah", "Obsah"] };

/**
 * Řídicí panel adminu (Karel 19. 11. 2026): co dnes potřebuje pozornost, dnešek, byznys a učení.
 * Návštěvnost a účty jsou ve Statistikách, akce u žáka v jeho detailu (klepnutí na jméno).
 */
export default function AdminPanel() {
  const router = useRouter();
  const [p, setP] = useState<Panel | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    if (!supabase) { setChyba("Supabase není dostupné."); return; }
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.replace("/prihlaseni"); return; }
    const r = await fetch("/api/admin/panel", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) setChyba("Přístup odepřen, nejsi admin.");
    else if (!r.ok) setChyba(j.error ?? "Chyba při načítání.");
    else { setChyba(null); setP(j as Panel); }
  }, [router]);
  useEffect(() => { void nacti(); const t = setInterval(() => void nacti(), 60_000); return () => clearInterval(t); }, [nacti]); // eslint-disable-line react-hooks/set-state-in-effect

  const trend = p ? p.dnes.noveTyden - p.dnes.noveMinulyTyden : 0;

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full mm-siroke" data-testid="admin-panel">
      <div className="rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#93c5fd" }}>Admin</div>
          <h1 className="text-2xl font-black text-white">Řídicí panel</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[["/admin/analytika", "📈 Analytika"], ["/admin/navstevnost", "📊 Statistiky"], ["/admin/testy", "📝 Testy"], ["/admin/obsah", "📚 Obsah"]].map(([h, t]) => (
            <Link key={h} href={h} className="px-3 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.25)" }}>{t}</Link>
          ))}
        </div>
      </div>

      {chyba && <p className="mm-karta p-4 text-sm" style={{ color: "#B4232F" }}>{chyba}</p>}
      {!p && !chyba && <div className="skeleton rounded-[20px]" style={{ height: 360 }} />}

      {p && (
        <>
          {/* 1. Dnes */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="panel-dnes">
            {[
              ["Nové účty", String(p.dnes.noveUcty), `týden ${p.dnes.noveTyden} · ${trend >= 0 ? "+" : ""}${trend} proti minulému`],
              ["Trénovalo dnes", String(p.dnes.trenovalo), `z ${p.dnes.zaku} žáků`],
              ["Online teď", String(p.dnes.online.length), p.dnes.online.slice(0, 3).join(", ") || "nikdo"],
              ["Premium", String(p.dnes.premium.plati + p.dnes.premium.rucne + p.dnes.premium.zkousi), `${p.dnes.premium.plati} platí · ${p.dnes.premium.rucne} ručně · ${p.dnes.premium.zkousi} zkouší`],
              ["Zpětná vazba", String(p.dnes.zpetnaVazba), "za posledních 7 dní"],
            ].map(([l, v, s]) => (
              <div key={l} className="mm-karta p-3.5 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8A93AA" }}>{l}</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: "#0D1B3E" }}>{v}</p>
                <p className="text-xs truncate" style={{ color: "#5F6982" }}>{s}</p>
              </div>
            ))}
          </section>

          {/* 2. Potřebuje pozornost */}
          <section className="flex flex-col gap-2" data-testid="panel-pozornost">
            <h2 className="text-lg font-black" style={{ color: "#0D1B3E" }}>Potřebuje pozornost</h2>
            {p.pozornost.length === 0 && <p className="mm-karta p-4 text-sm" style={{ color: "#1F9D55" }}>✓ Dnes nic nečeká. Všechno běží.</p>}
            {p.pozornost.map((x) => (
              <div key={x.druh} className="mm-karta p-3 grid gap-3 items-start" style={{ gridTemplateColumns: "36px minmax(0,1fr) auto" }} data-testid={`pozornost-${x.druh}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center text-lg" style={{ background: IKONA[x.druh][1] }} aria-hidden="true">{IKONA[x.druh][0]}</span>
                <div className="min-w-0">
                  <b className="block" style={{ color: "#0D1B3E" }}>{x.titulek}</b>
                  <p className="text-sm break-words" style={{ color: "#5F6982" }}>{x.popis}</p>
                  {x.ucty.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {x.ucty.slice(0, 12).map((u) => (
                        <button key={u.id} type="button" onClick={() => setDetail(u.id)} className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ borderColor: "#E4E6EF", color: "#2E6DA4", background: "#fff" }} data-testid="pozornost-ucet">{u.jmeno}</button>
                      ))}
                      {x.ucty.length > 12 && <span className="text-xs" style={{ color: "#8A93AA" }}>+{x.ucty.length - 12}</span>}
                    </div>
                  )}
                </div>
                {ODKAZ[x.druh] && <Link href={ODKAZ[x.druh]![0]} className="px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap" style={{ borderColor: "#E4E6EF", color: "#0D1B3E" }}>{ODKAZ[x.druh]![1]}</Link>}
              </div>
            ))}
          </section>

          <div className="grid lg:grid-cols-2 gap-3">
            {/* 3. Byznys */}
            <section className="mm-karta p-4 flex flex-col gap-2" data-testid="panel-byznys">
              <h2 className="text-lg font-black" style={{ color: "#0D1B3E" }}>Byznys</h2>
              {[
                ["Platící Premium (Stripe)", p.byznys.plati],
                ["Ručně udělené (plány z webu)", p.byznys.rucne],
                ["Zkušební období", p.byznys.zkousi],
                ["Premium končí do 7 dní", p.byznys.konciDo7],
                ["Otevřeli stránku Premium (30 dní)", p.byznys.premiumZobrazeno],
                ["Začali platit (30 dní)", p.byznys.platbaStart],
                ["Podíl žáků s Premium", `${p.byznys.podilPremium} %`],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between gap-3 text-sm"><span style={{ color: "#33405F" }}>{l}</span><b className="tabular-nums" style={{ color: "#0D1B3E" }}>{v}</b></div>
              ))}
            </section>

            {/* 4. Učení */}
            <section className="mm-karta p-4 flex flex-col gap-2" data-testid="panel-uceni">
              <h2 className="text-lg font-black" style={{ color: "#0D1B3E" }}>Učení</h2>
              {[
                ["Průměrný odhad bodů, 9. třída", p.uceni.odhad9 === null ? "–" : `${p.uceni.odhad9} / 50`],
                ["Průměrný odhad bodů, 5. třída", p.uceni.odhad5 === null ? "–" : `${p.uceni.odhad5} / 50`],
                ["Příkladů za posledních 7 dní", p.uceni.prikladuTyden],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between gap-3 text-sm"><span style={{ color: "#33405F" }}>{l}</span><b className="tabular-nums" style={{ color: "#0D1B3E" }}>{v}</b></div>
              ))}
              <p className="text-xs mt-1" style={{ color: "#8A93AA" }}>Úspěšnost po tématech za 30 dní (nejslabší nahoře)</p>
              {p.uceni.temata.length === 0 && <p className="text-sm" style={{ color: "#8A93AA" }}>Zatím málo dat.</p>}
              {p.uceni.temata.slice(0, 6).map((t) => {
                const pr = Math.round((t.ok / t.n) * 100);
                return (
                  <div key={t.k} className="text-sm">
                    <div className="flex justify-between gap-3"><span style={{ color: "#33405F" }}>{(TEMA_LABELS as Record<string, string>)[t.k] ?? t.k}</span><b className="tabular-nums" style={{ color: pr < 60 ? "#C2410C" : "#0D1B3E" }}>{pr} % <span className="font-normal text-xs" style={{ color: "#8A93AA" }}>({t.n})</span></b></div>
                    <span className="block h-1.5 rounded-full mt-0.5" style={{ background: "#EEF0F6" }}><span className="block h-full rounded-full" style={{ width: `${pr}%`, background: pr < 60 ? "#F59E0B" : "#5B55D6" }} /></span>
                  </div>
                );
              })}
            </section>
          </div>
        </>
      )}

      {detail && <DetailZaka id={detail} onZavrit={() => setDetail(null)} onZmena={() => void nacti()} />}
    </div>
  );
}
