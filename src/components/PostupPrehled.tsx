"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HexIkona } from "@/components/HexIkona";
import { supabase } from "@/lib/supabase";
import { temaStyl } from "@/lib/barvy-temat";
import { isTopicLocked } from "@/lib/subscription";
import { maDovednosti } from "@/lib/dovednosti";
import { nactiVyvoj, type Vyvoj } from "@/lib/odhad-bodu";
import { TEMA_LABELS, type Trida } from "@/types";

const cs = (n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
const KLIC_CILE = (trida: Trida) => `matemax-cil-body-${trida}`;
const tydnu = (n: number) => (n === 1 ? "týden" : n >= 2 && n <= 4 ? "týdny" : "týdnů");

/**
 * Graf odhadu za 8 týdnů na tmavé kartě. Čáry kreslí SVG (roztažené na šířku), body, hodnoty a popisky
 * jsou HTML, takže písmo má stejnou velikost na telefonu i na monitoru. Týdny bez dat se vynechají.
 */
function Graf({ tydny, cil, max }: { tydny: (number | null)[]; cil: number | null; max: number }) {
  const n = tydny.length;
  const X = (i: number) => (i / (n - 1)) * 100;
  const Y = (v: number) => (1 - v / max) * 100;
  const body = tydny.map((v, i) => (v === null ? null : { i, v, x: X(i), y: Y(v) })).filter((b): b is { i: number; v: number; x: number; y: number } => b !== null);
  const cara = body.map((b) => `${b.x},${b.y}`).join(" ");
  const ted = new Date();
  const popisTydne = (i: number) => {
    if (i === n - 1) return "teď";
    const d = new Date(ted.getTime() - (n - 1 - i) * 7 * 86400000);
    return `${d.getDate()}. ${d.getMonth() + 1}.`;
  };
  const prvni = body[0]?.v, posledni = body[body.length - 1]?.v;
  const popis = `Odhad bodů za posledních ${n - 1} týdnů${prvni != null && posledni != null ? `: z ${prvni} na ${posledni} bodů` : ""}${cil ? `, cíl ${cil}` : ""}`;

  return (
    <div role="img" aria-label={popis} data-testid="graf-odhadu" className="select-none @container">
      <div className="relative ml-7 mr-3 mt-6 h-[170px] @lg:h-[200px]">
        {[0, 10, 20, 30, 40, 50].filter((v) => v <= max).map((v) => (
          <div key={v} className="absolute left-0 right-0" style={{ top: `${Y(v)}%`, borderTop: "1px solid rgba(255,255,255,.10)" }}>
            <span className="absolute -left-7 w-5 text-right text-[11px] -translate-y-1/2 tabular-nums" style={{ color: "#9C99D9" }}>{v}</span>
          </div>
        ))}
        {cil !== null && (
          <div className="absolute left-0 right-0" style={{ top: `${Y(cil)}%`, borderTop: "2px dashed #F5A623" }}>
            <span className="absolute left-1 -translate-y-[calc(100%+4px)] text-[11px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ background: "#F5A623", color: "#0D1B3E" }}>cíl {cil} b.</span>
          </div>
        )}
        {body.length >= 2 && (
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="mm-graf-plocha" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#8D89E8" stopOpacity=".55" />
                <stop offset="1" stopColor="#8D89E8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`${body[0].x},100 ${cara} ${body[body.length - 1].x},100`} fill="url(#mm-graf-plocha)" />
            <polyline points={cara} fill="none" stroke="#B9B6FF" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {body.map((b, k) => {
          const posl = k === body.length - 1;
          return (
            <div key={b.i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
              <span
                className={`block rounded-full ${posl ? "w-4 h-4" : "w-2.5 h-2.5"}`}
                style={{ background: posl ? "#F5A623" : "#fff", boxShadow: posl ? "0 0 0 5px rgba(245,166,35,.28)" : undefined }}
              />
              <span
                className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 font-extrabold tabular-nums ${posl ? "text-sm" : "text-[11px] hidden @sm:block"}`}
                style={{ color: posl ? "#F5A623" : "#D9D8FE" }}
              >
                {b.v}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative ml-7 mr-3 h-5 mt-2.5">
        {tydny.map((_, i) => (
          <span
            key={i}
            className={`absolute -translate-x-1/2 text-[11px] whitespace-nowrap ${i % 2 === 1 && i !== n - 1 ? "hidden @sm:block" : ""}`}
            style={{ left: `${X(i)}%`, color: i === n - 1 ? "#fff" : "#9C99D9", fontWeight: i === n - 1 ? 800 : 500 }}
          >
            {popisTydne(i)}
          </span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  trida: Trida;
  isPremium: boolean;
  /** Cíl uložený u účtu (user_metadata.cil_body), přednost před prohlížečem. */
  cilUctu?: number | null;
}

/**
 * Profil = kde jsem a kam se posouvám: odhad bodů u přijímaček na tmavé kartě s vývojem za 8 týdnů a cílem,
 * téma, kde žák získá nejvíc bodů, a všechna témata s body a posunem za 14 dní (klikací, vedou do tréninku).
 */
export default function PostupPrehled({ trida, isPremium, cilUctu }: Props) {
  const [vyvoj, setVyvoj] = useState<Vyvoj | null>(null);
  const [cil, setCil] = useState<number | null>(null);
  const [upravaCile, setUpravaCile] = useState(false);
  const [navrhCile, setNavrhCile] = useState(30);

  useEffect(() => {
    setVyvoj(nactiVyvoj(trida));
    let ulozeny: number | null = null;
    try { const v = Number(localStorage.getItem(KLIC_CILE(trida))); if (v > 0) ulozeny = v; } catch { /* nic */ }
    const c = cilUctu && cilUctu > 0 ? cilUctu : ulozeny;
    setCil(c);
    if (c) setNavrhCile(c);
  }, [trida, cilUctu]);

  async function ulozCil(hodnota: number) {
    const c = Math.max(5, Math.min(50, Math.round(hodnota)));
    setCil(c);
    setUpravaCile(false);
    try { localStorage.setItem(KLIC_CILE(trida), String(c)); } catch { /* nic */ }
    if (supabase) await supabase.auth.updateUser({ data: { cil_body: c } }).catch(() => {});
  }

  if (!vyvoj) return <div className="skeleton rounded-[22px]" style={{ height: 360 }} />;
  const { odhad, tydny, zmenaTemat } = vyvoj;

  if (odhad.bezDat) {
    return (
      <div className="rounded-[22px] p-5 flex flex-col gap-2 text-white" style={{ background: "linear-gradient(160deg, #1B2A5C, #0D1B3E)" }} data-testid="postup-prehled">
        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#C9C7F5" }}>Odhad u přijímaček</span>
        <b className="text-xl">Zatím nemáme z čeho počítat</b>
        <p className="text-sm" style={{ color: "#D9D8FE" }}>
          Udělej krátkou diagnostiku nebo pár tréninků. Pak tady uvidíš, kolik bodů bys teď získal, jak se zlepšuješ a kde získáš nejvíc.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2 max-w-md">
          <Link href="/diagnostika" className="py-3 rounded-2xl text-center font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }}>Diagnostika</Link>
          <Link href="/trenink" className="py-3 rounded-2xl text-center font-bold text-white mm-tlacitko" style={{ border: "1.5px solid rgba(255,255,255,.3)" }}>Trénink</Link>
        </div>
      </div>
    );
  }

  const tydnyDat = tydny.filter((v) => v !== null) as number[];
  const zmenaCelkem = tydnyDat.length >= 2 ? tydnyDat[tydnyDat.length - 1] - tydnyDat[0] : null;
  const tydnuSDaty = tydny.length - tydny.findIndex((v) => v !== null) - 1;
  // Tempo: body za týden z posledních 4 týdnů (jen když roste)
  const pred4 = tydny[3];
  const tempo = pred4 != null ? (odhad.celkem - pred4) / 4 : null;
  const chybi = cil ? Math.max(0, cil - odhad.celkem) : null;
  const tip = [...odhad.temata].sort((a, b) => (b.max - b.body) - (a.max - a.body))[0];
  const tipZamceny = isTopicLocked(tip.tema, isPremium);
  const tydnuDoCile = chybi && tempo && tempo > 0.2 ? Math.ceil(chybi / tempo) : null;

  return (
    <div className="flex flex-col gap-4 @container" data-testid="postup-prehled">
      {/* ── Odhad a vývoj ── */}
      <div className="rounded-[22px] p-5 @2xl:p-6 text-white @2xl:grid @2xl:grid-cols-[240px_minmax(0,1fr)] @2xl:gap-8" style={{ background: "linear-gradient(160deg, #1F2F66, #0D1B3E 70%)" }}>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#C9C7F5" }}>Odhad u přijímaček</span>
          <div className="flex items-baseline gap-2">
            <b className="text-[56px] leading-none font-black tabular-nums" data-testid="odhad-celkem">{odhad.celkem}</b>
            <span className="text-lg font-bold" style={{ color: "#C9C7F5" }}>z {odhad.max} bodů</span>
          </div>
          {zmenaCelkem !== null && zmenaCelkem !== 0 && (
            <span className="self-start text-[13px] font-extrabold px-2.5 py-1 rounded-full" style={zmenaCelkem > 0 ? { background: "rgba(52,211,153,.18)", color: "#7CE3B0" } : { background: "rgba(255,255,255,.12)", color: "#D9D8FE" }}>
              {zmenaCelkem > 0 ? `▲ +${zmenaCelkem}` : `▼ ${zmenaCelkem}`} b. za {tydnuSDaty} {tydnu(tydnuSDaty)}
            </span>
          )}
          <div className="relative h-2.5 rounded-full mt-2" style={{ background: "rgba(255,255,255,.16)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (odhad.celkem / odhad.max) * 100)}%`, background: "linear-gradient(90deg, #F5A623, #FFC85C)" }} />
            {cil !== null && <div className="absolute -top-1.5 h-[22px] w-1 rounded bg-white" style={{ left: `calc(${(cil / odhad.max) * 100}% - 2px)` }} title={`cíl ${cil} b.`} />}
          </div>

          <span className="text-sm mt-1" style={{ color: "#D9D8FE" }}>
            {cil === null ? (
              "Nastav si cíl, ať víš, kam míříš."
            ) : chybi === 0 ? (
              "Svůj cíl už máš. Zkus si ho zvýšit."
            ) : tydnuDoCile !== null ? (
              `Do cíle ${cil} bodů ti chybí ${chybi}. Tímhle tempem ho dáš zhruba za ${tydnuDoCile} ${tydnu(tydnuDoCile)}.`
            ) : (
              `Do cíle ${cil} bodů ti chybí ${chybi}.`
            )}
          </span>
          {!upravaCile && (
            <button type="button" onClick={() => setUpravaCile(true)} className="self-start text-sm font-bold px-3 py-1.5 rounded-lg mm-tlacitko" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>
              🎯 {cil === null ? "Nastavit cíl" : "Změnit cíl"}
            </button>
          )}
          {upravaCile && (
            <div className="flex items-center gap-2 flex-wrap rounded-xl p-2.5" style={{ background: "rgba(255,255,255,.1)" }} data-testid="uprava-cile">
              <label htmlFor="cil-body" className="text-sm font-semibold">Můj cíl</label>
              <input
                id="cil-body"
                type="number"
                inputMode="numeric"
                min={5}
                max={50}
                value={navrhCile}
                onChange={(e) => setNavrhCile(Number(e.target.value))}
                className="w-16 px-2 py-1.5 rounded-lg text-base font-bold"
                style={{ background: "#fff", color: "#0D1B3E" }}
              />
              <span className="text-sm" style={{ color: "#D9D8FE" }}>z 50</span>
              <button type="button" onClick={() => ulozCil(navrhCile)} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }}>
                Uložit
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 @2xl:mt-0 flex flex-col">
          <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#C9C7F5" }}>Vývoj za {tydny.length - 1} {tydnu(tydny.length - 1)}</span>
          <Graf tydny={tydny} cil={cil} max={odhad.max} />
          <span className="text-xs mt-3" style={{ color: "#9C99D9" }}>
            Odhad počítá, jak ti jdou jednotlivá témata a kolik bodů za ně bývá v testu. Je orientační: čím víc trénuješ, tím je přesnější.
          </span>
        </div>
      </div>

      {/* ── Kde získáš nejvíc ── */}
      {tip.max - tip.body >= 1 && (
        <div className="rounded-[20px] p-4 @xl:p-5 flex flex-col @xl:flex-row @xl:items-center gap-3 @xl:gap-5" style={{ ...temaStyl(tip.tema), background: "linear-gradient(160deg, #FFF8E8, #FFF1D2)", border: "1px solid #F3D9A0" }} data-testid="tip-body">
          <span className="hidden @xl:flex w-14 h-14 rounded-2xl bg-white items-center justify-center shrink-0"><HexIkona tema={tip.tema} velikost={44} /></span>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <b style={{ color: "#0D1B3E" }}>💡 Kde získáš nejvíc bodů</b>
            <span className="text-sm" style={{ color: "#5C4A1F" }}>
              {TEMA_LABELS[tip.tema] ?? tip.tema}: v testu bývá kolem {tip.max} bodů{tip.body > 0 ? ` a ty teď máš asi ${cs(tip.body)}` : ", a to máš zatím neprocvičené"}. Tady se ti trénink vyplatí nejvíc.
            </span>
          </div>
          <Link
            href={tipZamceny ? "/premium" : maDovednosti(tip.tema) ? `/trenink?vyber=${tip.tema}` : `/trenink?tema=${tip.tema}`}
            className="shrink-0 py-3 px-5 rounded-2xl text-center font-extrabold text-white mm-tlacitko"
            style={{ background: "#0D1B3E" }}
          >
            {tipZamceny ? `Odemknout ${(TEMA_LABELS[tip.tema] ?? tip.tema).toLowerCase()} v Premium` : `Trénovat ${(TEMA_LABELS[tip.tema] ?? tip.tema).toLowerCase()} →`}
          </Link>
        </div>
      )}

      {/* ── Všechna témata ── */}
      <div className="mm-karta p-3 @2xl:p-4">
        <div className="flex items-baseline justify-between px-1.5 pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#5F6982" }}>Body podle témat</span>
          {Object.values(zmenaTemat).some((z) => z !== null) && <span className="text-xs" style={{ color: "#8A93AA" }}>šipky = posun za 14 dní</span>}
        </div>
        <div className="grid @2xl:grid-cols-2 gap-1.5 @2xl:gap-2">
          {odhad.temata.map((t) => {
            const z = zmenaTemat[t.tema];
            // výkyvy pod 0,3 bodu jsou šum (přesnost se mění po každé úloze), ukazujeme je jako beze změny
            const zmena = z === null ? null : Math.abs(z) < 0.3 ? 0 : z;
            const zamceno = isTopicLocked(t.tema, isPremium);
            return (
              <Link
                key={t.tema}
                href={zamceno ? "/premium" : maDovednosti(t.tema) ? `/trenink?vyber=${t.tema}` : `/trenink?tema=${t.tema}`}
                data-tema={t.tema}
                className="mm-radek grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 items-center px-2.5 py-2.5 rounded-[14px]"
                style={temaStyl(t.tema)}
              >
                <HexIkona tema={t.tema} velikost={36} />
                <span className="min-w-0">
                  <span className="text-[14.5px] font-bold" style={{ color: "#0D1B3E" }}>
                    {TEMA_LABELS[t.tema] ?? t.tema}
                    {zamceno && <span className="ml-1.5 text-[11px] font-bold" style={{ color: "#8A5A00" }}>🔒 Premium</span>}
                  </span>
                  <span className="block h-2 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--tema-tint)" }}>
                    <i className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.round((t.body / t.max) * 100))}%`, background: "var(--tema-barva)" }} />
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <b className="text-sm" style={{ color: "#0D1B3E" }}>{cs(t.body)} / {t.max} b.</b>
                  <span className="block text-xs" style={{ color: zmena && zmena > 0 ? "#14753A" : "#8A93AA" }}>
                    {zmena === null ? " " : zmena > 0 ? `↑ +${cs(zmena)}` : zmena < 0 ? `↓ ${cs(zmena)}` : "beze změny"}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
