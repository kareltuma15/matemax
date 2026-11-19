"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AdminUser } from "@/app/api/admin/users/route";
import type { AdminUserDetail } from "@/app/api/admin/user-detail/route";

const denCz = (iso: string) => { const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const cas = (s: number) => (s <= 0 ? "–" : s < 3600 ? `${Math.max(1, Math.round(s / 60))} min` : `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")} min`);

async function token() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Detail žáka (Karel 19. 11. 2026): klepnutí na jméno kdekoli v adminu. Souhrn, akce na jednom místě
 * (Premium, reset diagnostiky, testovací účet) a časová osa (registrace, diagnostika, tréninky, propojení, testy).
 */
export default function DetailZaka({ id, onZavrit, onZmena }: { id: string; onZavrit: () => void; onZmena?: () => void }) {
  const [u, setU] = useState<AdminUser | null>(null);
  const [d, setD] = useState<AdminUserDetail | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [premiumDo, setPremiumDo] = useState("");
  const [ptat, setPtat] = useState<"premium" | "reset" | null>(null);
  const [pracuji, setPracuji] = useState(false);

  const nacti = useCallback(async () => {
    const t = await token(); if (!t) return;
    const h = { Authorization: `Bearer ${t}` };
    const [ru, rd] = await Promise.all([fetch("/api/admin/users", { headers: h, cache: "no-store" }), fetch(`/api/admin/user-detail?id=${id}`, { headers: h, cache: "no-store" })]);
    if (!ru.ok || !rd.ok) { setChyba("Detail se nepodařilo načíst."); return; }
    const ju = await ru.json();
    setU((ju.users as AdminUser[]).find((x) => x.id === id) ?? null);
    setD((await rd.json()) as AdminUserDetail);
  }, [id]);
  useEffect(() => { void nacti(); }, [nacti]); // eslint-disable-line react-hooks/set-state-in-effect

  async function akce(url: string, telo: object) {
    const t = await token(); if (!t) return;
    setPracuji(true); setChyba(null);
    const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify(telo) });
    const j = await r.json().catch(() => ({}));
    setPracuji(false);
    if (!r.ok) { setChyba(j.error ?? "Nepovedlo se."); return; }
    setPtat(null); await nacti(); onZmena?.();
  }

  const premiumAktivni = u ? u.plan !== "free" : false;
  // Časová osa (nejnovější nahoře)
  const osa: { kdy: string; co: string }[] = [];
  if (u) osa.push({ kdy: u.createdAt, co: "Registrace" });
  if (d?.vysledky.propojeno) osa.push({ kdy: d.vysledky.propojeno, co: "Propojil MateMax s Vyhodnocením testů" });
  for (const t of d?.vysledky.testy ?? []) osa.push({ kdy: t.d, co: `Test nanečisto${t.celkem ? `: ${t.celkem.pts} z ${t.celkem.max} bodů` : ""}` });
  if (d?.sessions.length) osa.push({ kdy: d.sessions[0].date, co: `Poslední trénink (${d.sessions[0].correct} z ${d.sessions[0].total} správně)` });
  for (const e of (d?.events ?? []).slice(0, 6)) osa.push({ kdy: e.at, co: e.name });
  osa.sort((a, b) => b.kdy.localeCompare(a.kdy));
  const nejslabsi = [...(d?.diagnostics ?? [])].filter((x) => x.total > 0).sort((a, b) => a.correct / a.total - b.correct / b.total).slice(0, 2);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="Detail žáka" data-testid="detail-zaka">
      <button type="button" className="absolute inset-0" style={{ background: "rgba(13,27,62,.35)" }} onClick={onZavrit} aria-label="Zavřít" />
      <div className="relative w-full max-w-md h-full overflow-y-auto p-5 flex flex-col gap-4" style={{ background: "#F5F6FB", boxShadow: "-20px 0 40px rgba(13,27,62,.2)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold truncate" style={{ color: "#0D1B3E" }}>{u ? (u.name ?? u.email.split("@")[0]) : "Načítám…"}</h2>
            {u && <p className="text-xs truncate" style={{ color: "#5F6982" }}>{u.trida}. třída · {u.email} · reg. {denCz(u.createdAt)}</p>}
          </div>
          <button type="button" onClick={onZavrit} className="shrink-0 w-9 h-9 rounded-xl grid place-items-center font-bold" style={{ background: "#fff", color: "#0D1B3E" }} aria-label="Zavřít">✕</button>
        </div>
        {chyba && <p className="text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: "#FDECEC", color: "#B42318" }}>{chyba}</p>}
        {u && (
          <>
            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-full" style={premiumAktivni ? { background: "#DFF7E8", color: "#14663D" } : { background: "#EEF0F6", color: "#33405F" }}>{u.plan === "paid" ? "Premium (platí)" : u.plan === "trial" ? `Premium do ${u.trialUntil ? denCz(u.trialUntil) : "?"}` : "Zdarma"}</span>
              <span className="px-2 py-0.5 rounded-full" style={u.diagDone ? { background: "#E9F8EF", color: "#14663D" } : { background: "#F3F4F8", color: "#8A93AA" }}>{u.diagDone ? "✓ diagnostika" : "bez diagnostiky"}</span>
              {u.propojeni && <span className="px-2 py-0.5 rounded-full" style={{ background: "#E8F4FF", color: "#1E5FA8" }}>✓ Vyhodnocení</span>}
              {u.online && <span className="px-2 py-0.5 rounded-full" style={{ background: "#E9F8EF", color: "#1F9D55" }}>● online</span>}
              {u.testovaci && <span className="px-2 py-0.5 rounded-full" style={{ background: "#FFF4E6", color: "#A66300" }}>testovací</span>}
            </div>
            <div className="mm-karta p-4 grid grid-cols-2 gap-3 text-sm">
              {[["Čas tento týden", cas(u.cas.tyden)], ["Čas celkem", cas(u.cas.celkem)], ["Příklady", String(u.answered)], ["Série", `${u.streak} dní`], ["Tréninků", String(u.sessionCount)], ["XP", String(u.totalXp)]].map(([l, v]) => (
                <div key={l}><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8A93AA" }}>{l}</p><p className="font-black tabular-nums" style={{ color: "#0D1B3E" }}>{v}</p></div>
              ))}
              {nejslabsi.length > 0 && <div className="col-span-2"><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8A93AA" }}>Nejslabší v diagnostice</p><p style={{ color: "#0D1B3E" }}>{nejslabsi.map((x) => `${x.tema} (${Math.round((x.correct / x.total) * 100)} %)`).join(", ")}</p></div>}
            </div>

            <div className="mm-karta p-4 flex flex-col gap-2">
              <b className="text-sm" style={{ color: "#0D1B3E" }}>Akce</b>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPtat(ptat === "premium" ? null : "premium")} className="px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "#0D1B3E" }} data-testid="detail-premium">{premiumAktivni && u.source !== "stripe" ? "Prodloužit / odebrat Premium" : premiumAktivni ? "Premium přes Stripe" : "Udělit Premium"}</button>
                <button type="button" onClick={() => setPtat(ptat === "reset" ? null : "reset")} className="px-3 py-2 rounded-xl text-sm font-bold border" style={{ borderColor: "#E4E6EF", color: "#0D1B3E", background: "#fff" }}>Reset diagnostiky</button>
                <button type="button" disabled={pracuji} onClick={() => void akce("/api/admin/testovaci", { id, testovaci: !u.testovaci })} className="px-3 py-2 rounded-xl text-sm font-bold border" style={{ borderColor: "#E4E6EF", color: "#0D1B3E", background: "#fff" }} data-testid="detail-testovaci">{u.testovaci ? "Vrátit mezi skutečné" : "Označit jako testovací"}</button>
              </div>
              {ptat === "premium" && u.source !== "stripe" && (
                <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: "#F5F6FB" }}>
                  <label className="text-sm" style={{ color: "#33405F" }} htmlFor="premium-do">Premium do (prázdné = bez omezení)</label>
                  <input id="premium-do" type="date" value={premiumDo} onChange={(e) => setPremiumDo(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E4E6EF" }} />
                  <div className="flex gap-2">
                    <button type="button" disabled={pracuji} onClick={() => void akce("/api/admin/premium", { userId: id, action: "grant", until: premiumDo || null })} className="px-3 py-2 rounded-lg text-sm font-bold text-white" style={{ background: "#1F9D55" }}>{premiumAktivni ? "Prodloužit" : "Udělit"}</button>
                    {premiumAktivni && <button type="button" disabled={pracuji} onClick={() => void akce("/api/admin/premium", { userId: id, action: "revoke", until: null })} className="px-3 py-2 rounded-lg text-sm font-bold" style={{ background: "#FDECEC", color: "#B42318" }}>Odebrat Premium</button>}
                  </div>
                </div>
              )}
              {ptat === "premium" && u.source === "stripe" && <p className="text-sm" style={{ color: "#5F6982" }}>Platí přes Stripe, předplatné se spravuje ve Stripe.</p>}
              {ptat === "reset" && (
                <div className="flex items-center gap-2 flex-wrap rounded-xl p-3" style={{ background: "#FDECEC" }}>
                  <span className="text-sm" style={{ color: "#8A1C1C" }}>Smazat výsledky diagnostiky? Žák ji udělá znovu.</span>
                  <button type="button" disabled={pracuji} onClick={() => void akce("/api/admin/reset-diagnostics", { userId: id })} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{ background: "#B42318" }}>Resetovat</button>
                </div>
              )}
            </div>

            <div className="mm-karta p-4 flex flex-col gap-2">
              <b className="text-sm" style={{ color: "#0D1B3E" }}>Časová osa</b>
              <ul className="flex flex-col gap-2 border-l-2 pl-3" style={{ borderColor: "#E4E6EF" }}>
                {osa.map((o, i) => (
                  <li key={i} className="relative text-sm" style={{ color: "#0D1B3E" }}>
                    <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: "#5B55D6" }} />
                    {o.co}<span className="block text-xs" style={{ color: "#8A93AA" }}>{denCz(o.kdy)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
