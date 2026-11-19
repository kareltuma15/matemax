"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Graf, { Pruhy } from "@/components/admin/Graf";
import UctyTabulka from "@/components/admin/UctyTabulka";
import { NEMERIT_KEY } from "@/components/Mereni";

interface Zive {
  cas: string;
  pet: number; tricet: number;
  dnes: { navstevniku: number; stranek: number };
  vceraDoTed: number; vceraCelkem: number;
  hodinaTed: number;
  poHodinach: { h: number; dnes: number; vcera: number }[];
  strankyTed: { k: string; n: number }[];
  posledni: { cas: string; co: string; kde?: string; zarizeni: string | null }[];
  ziveUcty: { jmeno: string; trida: number; cesta: string | null; zarizeni: string | null; minutDnes: number }[];
  bezUctuOnline: number;
  bezUctuStranky: { k: string; n: number }[];
  dnesMinut: number;
  dnesTrenovalo: number;
}

interface DetailDne {
  den: string; lidi: number; stranek: number;
  navstevnici: { ucet: { jmeno: string; trida: number; propojeny: boolean } | null; stranek: number; kliku: number; trasa: string[]; dalsich: number; sekund: number; zarizeni: string | null; zdroj: string | null; od: string | null }[];
}

interface Data {
  dni: number;
  mereniOd: string | null;
  souhrn: { navstevniku: number; stranek: number; novychUctu: number };
  poDnech: { den: string; navstevniku: number; prihlaseni: number; bezUctu: number; stranek: number; ucty: number }[];
  zdroje: { k: string; n: number }[];
  stranky: { k: string; n: number }[];
  kliky: { k: string; n: number }[];
  zarizeni: { k: string; n: number }[];
  trychtyr: { krok: string; n: number }[];
  trenink: { tyden: string; zaku: number; dniNaZaka: number; prikladuNaZaka: number; uspesnost: number | null }[];
  uvod: { zobrazeni: number; navstevniku: number; odesliHned: number; bezKliku: number; medianSekund: number | null; scroll: { min: number; podil: number }[]; posledniSekce: { k: string; n: number }[]; kliky: { k: string; n: number }[]; pokracovali: number; formular: { k: string; n: number }[]; chyby: { k: string; n: number }[] };
  odmeny: { zaku: number; ziskano: number; utraceno: number; truhel: number; odmen: number } | null;
}

function Seznam({ nadpis, polozky, barva }: { nadpis: string; polozky: { k: string; n: number }[]; barva?: string }) {
  return (
    <div className="mm-karta p-4 min-w-0">
      <b className="text-sm" style={{ color: "#0D1B3E" }}>{nadpis}</b>
      <Pruhy polozky={polozky} barva={barva} />
    </div>
  );
}

const denCz = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${d}. ${m}.`; };
const DNY_TYDNE = ["ne", "po", "út", "st", "čt", "pá", "so"];
const denTydne = (iso: string) => DNY_TYDNE[new Date(iso + "T12:00:00").getDay()];
const pred = (iso: string, ted: number) => { const s = Math.max(0, Math.round((ted - Date.parse(iso)) / 1000)); return s < 60 ? `před ${s} s` : s < 3600 ? `před ${Math.round(s / 60)} min` : `před ${Math.floor(s / 3600)} h`; };
const OBNOVA_S = 30;
const trvani = (s: number) => (s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const STR: Record<string, string> = { "/": "Úvod / Domov", "/trenink": "Trénink", "/sbirka": "Sbírka", "/profil": "Profil", "/registrace": "Registrace", "/prihlaseni": "Přihlášení", "/cenik": "Ceník", "/testy": "Testy", "/diagnostika": "Diagnostika" };
const str = (c: string | null) => (c ? STR[c] ?? STR["/" + c.split("/")[1]] ?? c : "appka");

/** „Nepočítat toto zařízení“: Karlovy návštěvy z tohoto prohlížeče se neměří (localStorage). */
function NepocitatZarizeni() {
  const [vyp, setVyp] = useState<boolean | null>(null);
  useEffect(() => { try { setVyp(localStorage.getItem(NEMERIT_KEY) === "1"); } catch { setVyp(false); } }, []); // eslint-disable-line react-hooks/set-state-in-effect
  if (vyp === null) return null;
  const prepni = () => { try { if (vyp) localStorage.removeItem(NEMERIT_KEY); else localStorage.setItem(NEMERIT_KEY, "1"); setVyp(!vyp); } catch { /* bez úložiště */ } };
  return (
    <button type="button" onClick={prepni} className="px-3 py-1.5 rounded-full text-sm font-bold" style={vyp ? { background: "#E9F8EF", color: "#14663D", border: "1px solid #A8E0BE" } : { background: "#fff", color: "#0D1B3E", border: "1px solid #E4E6EF" }} data-testid="nepocitat-zarizeni">
      {vyp ? "✓ Toto zařízení se nepočítá" : "🚫 Nepočítat toto zařízení"}
    </button>
  );
}

async function nacti<T>(url: string): Promise<{ data?: T; chyba?: string }> {
  if (!supabase) return { chyba: "Supabase není dostupné." };
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return { chyba: "Přihlas se jako admin." };
  const r = await fetch(url, { headers: { Authorization: `Bearer ${s.session.access_token}` }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { data: j as T } : { chyba: (j as { error?: string }).error ?? "Chyba" };
}

/** Návštěvnost a trychtýř od návštěvy po platbu (jen pro admina). Data z měření bez cookies. */
export default function NavstevnostPage() {
  const [dni, setDni] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [zive, setZive] = useState<Zive | null>(null);
  const [obnovovat, setObnovovat] = useState(true);
  const [ted, setTed] = useState(() => Date.now());
  const [detail, setDetail] = useState<DetailDne | null>(null);
  const [detailNacita, setDetailNacita] = useState(false);
  const otevriDen = (denD: string) => { setDetailNacita(true); nacti<DetailDne>(`/api/admin/navstevnost?den=${denD}`).then((r) => { setDetailNacita(false); if (r.data) setDetail(r.data); }); };

  useEffect(() => {
    let zruseno = false;
    nacti<Data>(`/api/admin/navstevnost?dni=${dni}`).then((r) => {
      if (zruseno) return;
      if (r.chyba) setChyba(r.chyba); else { setChyba(null); setData(r.data!); }
    });
    return () => { zruseno = true; };
  }, [dni]);

  // Živý přehled: hned a pak každých 30 s (jen když je karta vidět)
  useEffect(() => {
    let zruseno = false;
    const obnov = () => { if (document.hidden) return; nacti<Zive>("/api/admin/navstevnost?zive=1").then((r) => { if (!zruseno && r.data) setZive(r.data); }); };
    obnov();
    if (!obnovovat) return () => { zruseno = true; };
    const t = setInterval(obnov, OBNOVA_S * 1000);
    const vid = () => { if (!document.hidden) obnov(); };
    document.addEventListener("visibilitychange", vid);
    return () => { zruseno = true; clearInterval(t); document.removeEventListener("visibilitychange", vid); };
  }, [obnovovat]);
  // Hodiny pro „před X s“
  useEffect(() => { const t = setInterval(() => setTed(Date.now()), 5000); return () => clearInterval(t); }, []);

  const prvni = data?.trychtyr[0]?.n || 1;
  const rozdil = zive ? zive.dnes.navstevniku - zive.vceraDoTed : 0;

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full mm-siroke" data-testid="navstevnost">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin" className="text-sm font-semibold mm-odkaz" style={{ color: "#4741B8" }}>← Admin</Link>
          <h1 className="text-[26px] font-extrabold" style={{ color: "#0D1B3E" }}>Statistiky</h1>
          <p className="text-sm" style={{ color: "#5F6982" }}>Měření bez cookies: unikátní návštěvník = stejné zařízení během jednoho dne.{data?.mereniOd ? ` Měří se od ${new Date(data.mereniOd).toLocaleDateString("cs-CZ")}.` : ""}</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <NepocitatZarizeni />
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDni(d)} className="px-3 py-1.5 rounded-full text-sm font-bold" style={dni === d ? { background: "#0D1B3E", color: "#fff" } : { background: "#fff", color: "#0D1B3E", border: "1px solid #E4E6EF" }}>{d} dní</button>
          ))}
        </div>
      </div>

      {chyba && <p className="mm-karta p-4 text-sm" style={{ color: "#B4232F" }}>{chyba}</p>}

      {/* ── Živě ── */}
      {zive && (
        <section className="mm-karta p-4 flex flex-col gap-4" data-testid="zive">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2.5 h-2.5" aria-hidden="true">
                {obnovovat && <span className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping" style={{ background: "#1F9D55" }} />}
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full" style={{ background: obnovovat ? "#1F9D55" : "#8A93AA" }} />
              </span>
              <b style={{ color: "#0D1B3E" }}>Živě</b>
              <span className="text-xs" style={{ color: "#5F6982" }}>aktualizováno {new Date(zive.cas).toLocaleTimeString("cs-CZ")}{obnovovat ? `, obnovuje se každých ${OBNOVA_S} s` : ""}</span>
            </div>
            <button type="button" onClick={() => setObnovovat((x) => !x)} className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "#EEF0F6", color: "#0D1B3E" }} data-testid="zive-prepinac">
              {obnovovat ? "Zastavit obnovu" : "Zapnout obnovu"}
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Přihlášení online", String(zive.ziveUcty.length), "žáků v appce teď"],
              ["Bez účtu", String(zive.bezUctuOnline), "návštěvníků za 5 min"],
              ["Dnes v appce", zive.dnesMinut ? trvani(zive.dnesMinut * 60) : "–", `trénovalo ${zive.dnesTrenovalo} · ${zive.dnes.navstevniku} návštěvníků`],
              ["Proti včerejšku", `${rozdil > 0 ? "+" : ""}${rozdil}`, `včera do teď ${zive.vceraDoTed}, celý den ${zive.vceraCelkem}`],
            ].map(([l, v, p], i) => (
              <div key={l} className="rounded-xl p-3 min-w-0" style={{ background: "#F5F6FB" }} data-testid={`zive-${i}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8A93AA" }}>{l}</p>
                <p className="text-2xl font-black tabular-nums" style={{ color: i === 3 ? (rozdil > 0 ? "#1F9D55" : rozdil < 0 ? "#B4232F" : "#0D1B3E") : "#0D1B3E" }}>{v}</p>
                <p className="text-xs" style={{ color: "#5F6982" }}>{p}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5" data-testid="zive-kdo">
            <b className="text-sm" style={{ color: "#0D1B3E" }}>Kdo je teď v appce</b>
            {zive.ziveUcty.length === 0 && zive.bezUctuOnline === 0 && <p className="text-sm" style={{ color: "#8A93AA" }}>Teď tu nikdo není.</p>}
            {zive.ziveUcty.map((u, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap text-sm">
                <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: "#1F9D55" }}><i className="w-2 h-2 rounded-full" style={{ background: "#1F9D55", boxShadow: "0 0 0 3px rgba(31,157,85,.2)" }} />{u.jmeno}</span>
                <span style={{ color: "#5F6982" }}>{u.trida}. tř. · {str(u.cesta)} · dnes {trvani(u.minutDnes * 60)} · {u.zarizeni === "mobil" ? "📱" : "💻"}</span>
              </div>
            ))}
            {zive.bezUctuOnline > 0 && <p className="text-sm" style={{ color: "#5F6982" }}>+ {zive.bezUctuOnline} {zive.bezUctuOnline === 1 ? "návštěvník" : zive.bezUctuOnline < 5 ? "návštěvníci" : "návštěvníků"} bez účtu: {zive.bezUctuStranky.map((x) => `${str(x.k)} (${x.n})`).join(", ")}</p>}
          </div>

          <div>
            <b className="text-sm" style={{ color: "#0D1B3E" }}>Dnes po hodinách</b>
            <p className="text-xs mb-1" style={{ color: "#5F6982" }}>Unikátní návštěvníci v každé hodině (český čas). Tečka = včera ve stejnou hodinu.</p>
            <Graf
              testid="graf-hodiny"
              vyska={140}
              legenda={["dnes", "včera"]}
              data={zive.poHodinach.map((x) => ({
                popisek: `${x.h}`, hodnota: x.dnes, hodnota2: x.vcera, zvyraznit: x.h === zive.hodinaTed,
                detail: `${x.h}:00–${x.h}:59 · dnes ${x.dnes}, včera ${x.vcera} návštěvníků`,
              }))}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="min-w-0">
              <b className="text-sm" style={{ color: "#0D1B3E" }}>Kde jsou lidé posledních 30 min</b>
              <Pruhy polozky={zive.strankyTed} barva="#1F9D55" prazdne="Teď tu nikdo není." />
            </div>
            <div className="min-w-0">
              <b className="text-sm" style={{ color: "#0D1B3E" }}>Poslední dění</b>
              {zive.posledni.length === 0 ? <p className="text-sm mt-2" style={{ color: "#8A93AA" }}>Zatím nic.</p> : (
                <ul className="mt-2 flex flex-col gap-1 text-sm" data-testid="zive-deni">
                  {zive.posledni.map((e, i) => (
                    <li key={i} className="grid gap-2 items-baseline" style={{ gridTemplateColumns: "76px minmax(0,1fr)" }}>
                      <span className="text-xs tabular-nums" style={{ color: "#8A93AA" }}>{pred(e.cas, ted)}</span>
                      <span className="min-w-0 break-words" style={{ color: "#33405F" }}>{e.zarizeni === "mobil" ? "📱" : e.zarizeni ? "💻" : ""} {e.co}{e.kde ? <> · <b style={{ color: "#0D1B3E" }}>{e.kde}</b></> : null}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <UctyTabulka />

      {!data && !chyba && <div className="skeleton rounded-[20px]" style={{ height: 300 }} />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[["Návštěvníků", data.souhrn.navstevniku], ["Zobrazených stránek", data.souhrn.stranek], ["Nových účtů", data.souhrn.novychUctu]].map(([l, v]) => (
              <div key={l as string} className="mm-karta p-4"><p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A93AA" }}>{l} · {data.dni} dní</p><p className="text-3xl font-black tabular-nums" style={{ color: "#0D1B3E" }}>{v}</p></div>
            ))}
          </div>

          <div className="mm-karta p-4">
            <b className="text-sm" style={{ color: "#0D1B3E" }}>Návštěvníci po dnech</b>
            <p className="text-xs mb-1" style={{ color: "#5F6982" }}>Lidé za den (český čas): přihlášení žáci a návštěvníci bez účtu. Tečka = nové účty. Klepni na den a uvidíš, kdo to byl. Bez testovacích účtů a tvých zařízení.</p>
            <Graf
              testid="graf-dny"
              legenda={["návštěvníci", "nové účty"]}
              legendaCasti={[["přihlášení žáci", "#5B55D6"], ["bez účtu", "#A9A5F2"]]}
              onVyber={(i) => otevriDen(data.poDnech[i].den)}
              data={data.poDnech.map((d, i) => ({
                popisek: denCz(d.den), hodnota: d.navstevniku, hodnota2: d.ucty, zvyraznit: i === data.poDnech.length - 1,
                casti: [{ hodnota: d.prihlaseni, barva: "#5B55D6" }, { hodnota: d.bezUctu, barva: "#A9A5F2" }],
                detail: `${denTydne(d.den)} ${denCz(d.den)} · ${d.navstevniku} lidí (${d.prihlaseni} přihlášených), ${d.stranek} stránek, ${d.ucty} ${d.ucty === 1 ? "nový účet" : d.ucty >= 2 && d.ucty <= 4 ? "nové účty" : "nových účtů"}`,
              }))}
            />
            {detailNacita && <div className="skeleton rounded-xl mt-3" style={{ height: 120 }} />}
            {detail && !detailNacita && (
              <div className="mt-3 rounded-xl p-3 flex flex-col gap-2" style={{ background: "#F5F6FB" }} data-testid="detail-dne">
                <div className="flex items-center justify-between gap-2">
                  <b style={{ color: "#0D1B3E" }}>{denTydne(detail.den)} {denCz(detail.den)} · {detail.lidi} {detail.lidi === 1 ? "člověk" : detail.lidi < 5 ? "lidé" : "lidí"}, {detail.stranek} stránek</b>
                  <button type="button" onClick={() => setDetail(null)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#fff", color: "#0D1B3E" }}>Zavřít</button>
                </div>
                {detail.navstevnici.length === 0 && <p className="text-sm" style={{ color: "#8A93AA" }}>Ten den tu nikdo nebyl.</p>}
                {detail.navstevnici.map((n, i) => (
                  <div key={i} className="grid gap-2.5 items-start text-sm" style={{ gridTemplateColumns: "28px minmax(0,1fr)" }} data-testid="detail-navstevnik">
                    <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-black text-white" style={{ background: n.ucet ? "#5B55D6" : "#A9A5F2" }}>{i + 1}</span>
                    <div className="min-w-0">
                      <div>
                        <b style={{ color: "#0D1B3E" }}>{n.ucet ? `${n.ucet.jmeno} · ${n.ucet.trida}. tř.` : "Návštěvník bez účtu"}</b>
                        {n.ucet?.propojeny ? <span className="ml-1.5 text-[11px] font-bold px-1.5 rounded" style={{ background: "#E8F4FF", color: "#1E5FA8" }}>propojený</span> : null}
                        <span style={{ color: "#5F6982" }}> · {n.zarizeni === "mobil" ? "📱" : n.zarizeni ? "💻" : ""} {n.stranek} {n.stranek === 1 ? "stránka" : n.stranek < 5 ? "stránky" : "stránek"} · {trvani(n.sekund)}{n.zdroj ? ` · přišel z ${n.zdroj}` : ""}</span>
                      </div>
                      {n.trasa.length > 0 && <div className="text-xs break-words" style={{ color: "#5F6982" }}>{n.trasa.map(str).join(" → ")}{n.dalsich ? ` → … (+${n.dalsich})` : ""}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mm-karta p-4" data-testid="trychtyr">
            <b className="text-sm" style={{ color: "#0D1B3E" }}>Kde lidé odpadají (za {data.dni} dní)</b>
            <div className="flex flex-col gap-1.5 mt-3">
              {data.trychtyr.map((t, i) => {
                const pred = i > 0 ? data.trychtyr[i - 1].n : null;
                const ztrata = pred && pred > 0 ? Math.round((1 - t.n / pred) * 100) : null;
                return (
                  <div key={t.krok} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,220px)_1fr_auto] gap-x-3 gap-y-0.5 items-center text-sm">
                    <span className="col-span-2 sm:col-span-1" style={{ color: "#33405F" }}>{t.krok}</span>
                    <span className="h-5 rounded-md" style={{ background: "#EEF0F6" }}>
                      <span className="block h-full rounded-md" style={{ width: `${Math.max(1, (t.n / prvni) * 100)}%`, background: i < 5 ? "#5B55D6" : i < 9 ? "#2E6DA4" : "#F5A623" }} />
                    </span>
                    <span className="tabular-nums w-24 text-right"><b style={{ color: "#0D1B3E" }}>{t.n}</b>{ztrata !== null && ztrata > 0 && <span className="ml-1.5 text-xs" style={{ color: "#B4232F" }}>−{ztrata} %</span>}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mm-karta p-4 flex flex-col gap-3" data-testid="uvodni-stranka">
            <div>
              <b className="text-sm" style={{ color: "#0D1B3E" }}>Úvodní stránka: co lidé dělají (za {data.dni} dní)</b>
              <p className="text-xs mt-0.5" style={{ color: "#5F6982" }}>Měří se od 16. 11. 2026: jak dlouho tam návštěvník byl, kam doscrolloval, na co klikl a jestli šel dál. Bez cookies a bez osobních údajů.</p>
            </div>
            {data.uvod.zobrazeni === 0 ? <p className="text-sm" style={{ color: "#8A93AA" }}>Zatím žádná data.</p> : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ["Zobrazení", String(data.uvod.zobrazeni)],
                    ["Odešli do 10 s bez kliknutí", `${data.uvod.odesliHned} (${Math.round((data.uvod.odesliHned / data.uvod.zobrazeni) * 100)} %)`],
                    ["Typicky zůstali", data.uvod.medianSekund === null ? "–" : `${data.uvod.medianSekund} s`],
                    ["Šli dál v appce", `${data.uvod.pokracovali} z ${data.uvod.navstevniku}`],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-xl p-3" style={{ background: "#F5F6FB" }}><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8A93AA" }}>{l}</p><p className="text-xl font-black tabular-nums" style={{ color: "#0D1B3E" }}>{v}</p></div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: "#33405F" }}>Kam až doscrollovali</p>
                  <div className="flex flex-col gap-1 mt-1.5">
                    {data.uvod.scroll.map((x) => (
                      <div key={x.min} className="grid grid-cols-[70px_1fr_44px] gap-2 items-center text-sm">
                        <span style={{ color: "#5F6982" }}>{x.min === 90 ? "až dolů" : `${x.min} %`}</span>
                        <span className="h-3.5 rounded" style={{ background: "#EEF0F6" }}><span className="block h-full rounded" style={{ width: `${Math.max(1, x.podil)}%`, background: "#5B55D6" }} /></span>
                        <b className="tabular-nums text-right" style={{ color: "#0D1B3E" }}>{x.podil} %</b>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid lg:grid-cols-2 gap-3">
                  <Seznam nadpis="Poslední sekce, kterou viděli" polozky={data.uvod.posledniSekce} />
                  <Seznam nadpis="Na co klikli na úvodní stránce" polozky={data.uvod.kliky} />
                  <Seznam nadpis="Začali vyplňovat formulář" polozky={data.uvod.formular} />
                  <Seznam nadpis="Chyby v registraci a přihlášení" polozky={data.uvod.chyby} />
                </div>
              </>
            )}
          </div>

          <div className="mm-karta p-4" data-testid="trenink-tydny">
            <b className="text-sm" style={{ color: "#0D1B3E" }}>Trénink po týdnech (pomáhají odměny?)</b>
            <p className="text-xs mt-0.5" style={{ color: "#5F6982" }}>Odměny fungují, když rostou dny a příklady na žáka a úspěšnost nespadne. Odměny (Hexík, krystaly, truhly) běží od 16. 11. 2026.</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider" style={{ color: "#8A93AA" }}><th className="py-1.5 pr-3">Týden od</th><th className="pr-3">Žáků</th><th className="pr-3">Dní na žáka</th><th className="pr-3">Příkladů na žáka</th><th>Úspěšnost</th></tr></thead>
                <tbody>
                  {data.trenink.map((t) => (
                    <tr key={t.tyden} className="border-t" style={{ borderColor: "#EEF0F6", color: "#33405F" }}>
                      <td className="py-1.5 pr-3">{new Date(t.tyden + "T12:00:00").toLocaleDateString("cs-CZ")}</td>
                      <td className="pr-3 tabular-nums font-bold" style={{ color: "#0D1B3E" }}>{t.zaku}</td>
                      <td className="pr-3 tabular-nums">{t.zaku ? t.dniNaZaka.toLocaleString("cs-CZ") : "–"}</td>
                      <td className="pr-3 tabular-nums">{t.zaku ? t.prikladuNaZaka : "–"}</td>
                      <td className="tabular-nums">{t.uspesnost === null ? "–" : `${t.uspesnost} %`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3" style={{ color: "#5F6982" }}>
              {data.odmeny
                ? `Odměny celkem: ${data.odmeny.zaku} žáků se zálohou, získáno ${data.odmeny.ziskano} krystalů, utraceno ${data.odmeny.utraceno}, otevřeno ${data.odmeny.truhel} truhel, ${data.odmeny.odmen} odměn.`
                : "Záloha odměn na serveru zatím není zapnutá (čeká na spuštění SQL)."}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <Seznam nadpis="Odkud přišli" polozky={data.zdroje} />
            <Seznam nadpis="Nejnavštěvovanější stránky" polozky={data.stranky} />
            <Seznam nadpis="Prokliky (kam klikali)" polozky={data.kliky} />
            <Seznam nadpis="Zařízení" polozky={data.zarizeni} />
          </div>
        </>
      )}
    </div>
  );
}
