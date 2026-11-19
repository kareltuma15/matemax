"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AdminUser } from "@/app/api/admin/users/route";
import DetailZaka from "./DetailZaka";

type Filtr = "skutecne" | "testovaci" | "online" | "propojene" | "premium";

const cas = (s: number) => (s <= 0 ? "–" : s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")} min`);
const denCz = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const pred = (iso: string) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 60 ? `před ${m} min` : m < 1440 ? `před ${Math.round(m / 60)} h` : `před ${Math.round(m / 1440)} d`; };
const STRANKA: Record<string, string> = { "/": "Domov", "/trenink": "Trénink", "/sbirka": "Sbírka", "/profil": "Profil", "/testy": "Testy", "/diagnostika": "Diagnostika" };
const nazevStranky = (c: string | null) => (c ? STRANKA[c] ?? STRANKA["/" + c.split("/")[1]] ?? c : "appka");

/**
 * Přehled účtů pro admina (Karel 19. 11. 2026): diagnostika u jména, plán, propojení s Vyhodnocením,
 * kdo je teď online, čas v appce za týden a celkem. Testovací účty jdou skrýt (značka u účtu).
 */
export default function UctyTabulka() {
  const [ucty, setUcty] = useState<AdminUser[] | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [filtr, setFiltr] = useState<Filtr>("skutecne");
  const [menu, setMenu] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    if (!supabase) return;
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { setChyba("Přihlas se jako admin."); return; }
    const r = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${s.session.access_token}` }, cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setChyba(j.error ?? "Chyba"); else setUcty(j.users as AdminUser[]);
  }, []);
  useEffect(() => { void nacti(); const t = setInterval(() => void nacti(), 60_000); return () => clearInterval(t); }, [nacti]); // eslint-disable-line react-hooks/set-state-in-effect

  async function oznacit(id: string, testovaci: boolean) {
    if (!supabase) return;
    const { data: s } = await supabase.auth.getSession();
    setMenu(null);
    const r = await fetch("/api/admin/testovaci", { method: "POST", headers: { Authorization: `Bearer ${s.session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id, testovaci }) });
    if (r.ok) setUcty((u) => u?.map((x) => (x.id === id ? { ...x, testovaci } : x)) ?? null);
  }

  if (chyba) return <p className="mm-karta p-4 text-sm" style={{ color: "#B4232F" }}>{chyba}</p>;
  if (!ucty) return <div className="skeleton rounded-[20px]" style={{ height: 220 }} />;

  const skutecne = ucty.filter((u) => !u.testovaci);
  const pocty: Record<Filtr, number> = {
    skutecne: skutecne.length, testovaci: ucty.length - skutecne.length,
    online: skutecne.filter((u) => u.online).length, propojene: skutecne.filter((u) => u.propojeni).length,
    premium: skutecne.filter((u) => u.plan !== "free").length,
  };
  const NAZVY: Record<Filtr, string> = { skutecne: "Skutečné účty", testovaci: "Testovací", online: "Online teď", propojene: "Propojené", premium: "Premium" };
  const seznam = (filtr === "testovaci" ? ucty.filter((u) => u.testovaci) : skutecne.filter((u) => filtr === "skutecne" || (filtr === "online" && u.online) || (filtr === "propojene" && u.propojeni) || (filtr === "premium" && u.plan !== "free")))
    .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0) || (b.posledniAktivita ?? b.lastSession ?? b.createdAt).localeCompare(a.posledniAktivita ?? a.lastSession ?? a.createdAt));
  const maxTyden = Math.max(1, ...skutecne.map((u) => u.cas.tyden));

  return (
    <section className="mm-karta p-4 flex flex-col gap-3" data-testid="ucty">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <b style={{ color: "#0D1B3E" }}>Účty</b>
        <span className="text-xs" style={{ color: "#5F6982" }}>Čas v appce se měří od 19. 11. (dřív jen čas tréninků od 17. 11.)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(NAZVY) as Filtr[]).map((f) => (
          <button key={f} type="button" onClick={() => setFiltr(f)} className="px-3 py-1.5 rounded-full text-xs font-bold" style={filtr === f ? { background: "#0D1B3E", color: "#fff" } : { background: "#fff", color: "#0D1B3E", border: "1px solid #E4E6EF" }} data-testid={`ucty-filtr-${f}`}>
            {NAZVY[f]} ({pocty[f]})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#EEF0F6" }}>
        <table className="w-full text-sm" style={{ minWidth: 860 }}>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: "#8A93AA" }}>
              <th className="p-2.5">Účet</th><th className="p-2.5">Plán</th><th className="p-2.5">Propojení</th><th className="p-2.5">Teď</th><th className="p-2.5">Čas tento týden</th><th className="p-2.5">Čas celkem</th><th className="p-2.5">Příklady</th><th className="p-2.5" />
            </tr>
          </thead>
          <tbody>
            {seznam.map((u) => (
              <tr key={u.id} className="border-t align-middle" style={{ borderColor: "#EEF0F6", opacity: u.testovaci ? 0.55 : 1 }} data-testid="ucet-radek">
                <td className="p-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button" onClick={() => setDetail(u.id)} className="font-bold underline-offset-2 hover:underline" style={{ color: "#0D1B3E" }} data-testid="ucet-jmeno">{u.name ?? u.email.split("@")[0]}</button>
                    <span className="text-[11px] font-bold px-1.5 rounded" style={{ background: u.trida === 5 ? "#FFF4E6" : "#EEF0FF", color: u.trida === 5 ? "#A66300" : "#3B2F9E" }}>{u.trida}. tř.</span>
                    <span className="text-[11px] font-bold px-1.5 rounded" style={u.diagDone ? { background: "#E9F8EF", color: "#14663D" } : { background: "#F3F4F8", color: "#8A93AA" }} data-testid="ucet-diagnostika">
                      {u.diagDone ? "✓ diagnostika" : "bez diagnostiky"}
                    </span>
                  </div>
                  <div className="text-xs truncate max-w-[240px]" style={{ color: "#8A93AA" }}>{u.email} · reg. {denCz(u.createdAt)}</div>
                </td>
                <td className="p-2.5"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={u.plan === "free" ? { background: "#EEF0F6", color: "#33405F" } : { background: "#DFF7E8", color: "#14663D" }}>{u.plan === "paid" ? "Premium" : u.plan === "trial" ? "Zkušební" : "Zdarma"}</span></td>
                <td className="p-2.5">{u.propojeni ? <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#E8F4FF", color: "#1E5FA8" }} data-testid="ucet-propojeny">✓ Vyhodnocení{u.propojeni.posledniTest ? ` · test ${denCz(u.propojeni.posledniTest)}` : ""}</span> : <span className="text-xs" style={{ color: "#8A93AA" }}>nepropojeno</span>}</td>
                <td className="p-2.5 whitespace-nowrap">{u.online
                  ? <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: "#1F9D55" }} data-testid="ucet-online"><i className="w-2 h-2 rounded-full" style={{ background: "#1F9D55", boxShadow: "0 0 0 3px rgba(31,157,85,.2)" }} />online, {nazevStranky(u.online.cesta)}</span>
                  : <span className="text-xs" style={{ color: "#8A93AA" }}>{u.posledniAktivita ? pred(u.posledniAktivita) : u.lastLogin ? `přihlášen ${denCz(u.lastLogin)}` : "–"}</span>}</td>
                <td className="p-2.5 whitespace-nowrap tabular-nums"><span className="inline-block h-2 rounded-full align-middle mr-1.5" style={{ width: `${Math.round((u.cas.tyden / maxTyden) * 70)}px`, background: "#5B55D6" }} />{cas(u.cas.tyden)}</td>
                <td className="p-2.5 whitespace-nowrap tabular-nums">{cas(u.cas.celkem)}</td>
                <td className="p-2.5 tabular-nums font-bold" style={{ color: "#0D1B3E" }}>{u.answered}</td>
                <td className="p-2.5 relative">
                  <button type="button" className="px-2 py-1 rounded-lg text-xs font-bold border" style={{ borderColor: "#E4E6EF" }} onClick={() => setMenu(menu === u.id ? null : u.id)} aria-label="Akce s účtem" data-testid="ucet-menu">⋯</button>
                  {menu === u.id && (
                    <div className="absolute right-2 top-10 z-10 mm-karta p-1.5 flex flex-col min-w-[190px]">
                      <button type="button" className="text-left px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50" onClick={() => void oznacit(u.id, !u.testovaci)} data-testid="ucet-testovaci">
                        {u.testovaci ? "Vrátit mezi skutečné" : "Označit jako testovací"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {seznam.length === 0 && <tr><td colSpan={8} className="p-4 text-sm" style={{ color: "#8A93AA" }}>Žádné účty.</td></tr>}
          </tbody>
        </table>
      </div>
      {detail && <DetailZaka id={detail} onZavrit={() => setDetail(null)} onZmena={() => void nacti()} />}
    </section>
  );
}
