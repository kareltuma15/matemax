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

/** Čárový graf odhadu za 8 týdnů s přerušovanou čarou cíle. Týdny bez dat se vynechají. */
function Graf({ tydny, cil, max }: { tydny: (number | null)[]; cil: number | null; max: number }) {
  const w = 320, h = 150, L = 30, R = 10, T = 12, B = 26, n = tydny.length;
  const x = (i: number) => L + (i * (w - L - R)) / (n - 1);
  const y = (v: number) => T + (1 - v / max) * (h - T - B);
  const body = tydny.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter((b): b is readonly [number, number] => b !== null);
  const cara = body.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const posledni = tydny[n - 1];
  const prvni = tydny.find((v) => v !== null);
  const popis = `Odhad bodů za posledních ${n - 1} týdnů${prvni != null && posledni != null ? `: z ${prvni} na ${posledni} bodů` : ""}${cil ? `, cíl ${cil}` : ""}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={popis} data-testid="graf-odhadu">
      {[0, 10, 20, 30, 40, 50].filter((v) => v <= max).map((v) => (
        <g key={v}>
          <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="#E4E6EF" />
          <text x={L - 6} y={y(v) + 4} fontSize="10" fill="#8A93AA" textAnchor="end">{v}</text>
        </g>
      ))}
      {cil !== null && (
        <>
          <line x1={L} x2={w - R} y1={y(cil)} y2={y(cil)} stroke="#F5A623" strokeWidth="2" strokeDasharray="5 4" />
          <text x={w - R} y={y(cil) - 5} fontSize="10.5" fontWeight="700" fill="#A06A00" textAnchor="end">cíl {cil} b.</text>
        </>
      )}
      {body.length >= 2 && (
        <>
          <polygon points={`${body[0][0]},${y(0)} ${cara} ${body[body.length - 1][0]},${y(0)}`} fill="#5B55D6" opacity=".12" />
          <polyline points={cara} fill="none" stroke="#5B55D6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {body.length > 0 && <circle cx={body[body.length - 1][0]} cy={body[body.length - 1][1]} r="5" fill="#5B55D6" stroke="#fff" strokeWidth="2" />}
      <text x={x(0)} y={h - 8} fontSize="10" fill="#8A93AA">před {n - 1} týdny</text>
      <text x={w - R} y={h - 8} fontSize="10" fill="#8A93AA" textAnchor="end">teď</text>
    </svg>
  );
}

interface Props {
  trida: Trida;
  isPremium: boolean;
  /** Cíl uložený u účtu (user_metadata.cil_body), přednost před prohlížečem. */
  cilUctu?: number | null;
}

/**
 * Profil = kde jsem a kam se posouvám: odhad bodů u přijímaček, vývoj za 8 týdnů s cílem,
 * téma, kde žák získá nejvíc bodů, a všechna témata s body a posunem za 14 dní.
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

  if (!vyvoj) return <div className="skeleton rounded-[18px]" style={{ height: 320 }} />;
  const { odhad, tydny, zmenaTemat } = vyvoj;

  if (odhad.bezDat) {
    return (
      <div className="bg-white rounded-[18px] p-4 flex flex-col gap-2" style={{ border: "1px solid #E4E6EF" }} data-testid="postup-prehled">
        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#8A93AA" }}>Odhad u přijímaček</span>
        <b className="text-lg" style={{ color: "#0D1B3E" }}>Zatím nemáme z čeho počítat</b>
        <p className="text-sm" style={{ color: "#5F6982" }}>
          Udělej krátkou diagnostiku nebo pár tréninků. Pak tady uvidíš, kolik bodů bys teď získal, jak se zlepšuješ a kde získáš nejvíc.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Link href="/diagnostika" className="py-3 rounded-2xl text-center font-extrabold text-white press-scale" style={{ background: "#0D1B3E" }}>Diagnostika</Link>
          <Link href="/trenink" className="py-3 rounded-2xl text-center font-bold press-scale" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>Trénink</Link>
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

  return (
    <div className="flex flex-col gap-3" data-testid="postup-prehled">
      <div className="bg-white rounded-[18px] p-4 flex flex-col gap-1.5" style={{ border: "1px solid #E4E6EF" }}>
        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#8A93AA" }}>Odhad u přijímaček</span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <b className="text-[40px] leading-none tabular-nums" style={{ color: "#0D1B3E" }} data-testid="odhad-celkem">{odhad.celkem}</b>
          <span className="text-lg" style={{ color: "#5F6982" }}>z {odhad.max} bodů</span>
          {zmenaCelkem !== null && zmenaCelkem !== 0 && (
            <span className="text-[13px] font-extrabold px-2 py-1 rounded-lg" style={zmenaCelkem > 0 ? { background: "#E2F4E9", color: "#14753A" } : { background: "#EEF0F6", color: "#5F6982" }}>
              {zmenaCelkem > 0 ? `↑ +${zmenaCelkem}` : `↓ ${zmenaCelkem}`} b. za {tydnuSDaty} {tydnuSDaty === 1 ? "týden" : tydnuSDaty <= 4 ? "týdny" : "týdnů"}
            </span>
          )}
        </div>

        <span className="text-sm" style={{ color: "#5F6982" }}>
          {cil === null ? (
            <button type="button" onClick={() => setUpravaCile(true)} className="font-bold underline underline-offset-2" style={{ color: "#4741B8" }}>
              Nastav si cíl, kolik bodů chceš mít
            </button>
          ) : chybi === 0 ? (
            "Svůj cíl už máš. Zkus si ho zvýšit."
          ) : tempo !== null && tempo > 0.2 ? (
            `Do cíle ${cil} bodů ti chybí ${chybi}. Tímhle tempem ho dáš zhruba za ${Math.ceil(chybi! / tempo)} ${Math.ceil(chybi! / tempo) === 1 ? "týden" : Math.ceil(chybi! / tempo) <= 4 ? "týdny" : "týdnů"}.`
          ) : (
            `Do cíle ${cil} bodů ti chybí ${chybi}.`
          )}
        </span>

        {upravaCile && (
          <div className="flex items-center gap-2 flex-wrap rounded-xl p-2.5" style={{ background: "#F1F2F8" }} data-testid="uprava-cile">
            <label htmlFor="cil-body" className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>Můj cíl</label>
            <input
              id="cil-body"
              type="number"
              inputMode="numeric"
              min={5}
              max={50}
              value={navrhCile}
              onChange={(e) => setNavrhCile(Number(e.target.value))}
              className="w-20 px-2 py-1.5 rounded-lg border text-base font-bold"
              style={{ borderColor: "#E4E6EF" }}
            />
            <span className="text-sm" style={{ color: "#5F6982" }}>bodů z 50</span>
            <button type="button" onClick={() => ulozCil(navrhCile)} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-extrabold text-white" style={{ background: "#0D1B3E" }}>
              Uložit
            </button>
          </div>
        )}

        <Graf tydny={tydny} cil={cil} max={odhad.max} />
        <span className="text-xs" style={{ color: "#5F6982" }}>
          Odhad počítá, jak ti jdou jednotlivá témata a kolik bodů za ně bývá v testu. Je orientační: čím víc trénuješ, tím je přesnější.
        </span>
      </div>

      {tip.max - tip.body >= 1 && (
        <div className="rounded-[18px] p-4 flex flex-col gap-2" style={{ background: "#FFF8E6", border: "1px solid #F8E1A8" }} data-testid="tip-body">
          <b style={{ color: "#0D1B3E" }}>Kde získáš nejvíc bodů</b>
          <span className="text-sm" style={{ color: "#5F6982" }}>
            {TEMA_LABELS[tip.tema] ?? tip.tema}: v testu bývá kolem {tip.max} bodů{tip.body > 0 ? ` a ty teď máš asi ${cs(tip.body)}` : ", a to máš zatím neprocvičené"}. Tady se ti trénink vyplatí nejvíc.
          </span>
          <Link
            href={tipZamceny ? "/premium" : maDovednosti(tip.tema) ? `/trenink?vyber=${tip.tema}` : `/trenink?tema=${tip.tema}`}
            className="w-full py-3 rounded-2xl text-center font-extrabold text-white press-scale"
            style={{ background: "#0D1B3E" }}
          >
            {tipZamceny ? `Odemknout ${(TEMA_LABELS[tip.tema] ?? tip.tema).toLowerCase()} v Premium` : `Trénovat ${(TEMA_LABELS[tip.tema] ?? tip.tema).toLowerCase()}`}
          </Link>
        </div>
      )}

      <span className="text-xs font-extrabold uppercase tracking-wider mt-1" style={{ color: "#8A93AA" }}>Všechna témata</span>
      <div className="bg-white rounded-[16px] overflow-hidden" style={{ border: "1px solid #E4E6EF" }}>
        {odhad.temata.map((t, i) => {
          const z = zmenaTemat[t.tema];
          // výkyvy pod 0,3 bodu jsou šum (přesnost se mění po každé úloze), ukazujeme je jako beze změny
          const zmena = z === null ? null : Math.abs(z) < 0.3 ? 0 : z;
          const zamceno = isTopicLocked(t.tema, isPremium);
          return (
            <div
              key={t.tema}
              data-tema={t.tema}
              className="grid grid-cols-[30px_minmax(0,1fr)_auto] gap-2.5 items-center px-3.5 py-3"
              style={{ ...temaStyl(t.tema), borderTop: i ? "1px solid #E4E6EF" : undefined }}
            >
              <HexIkona tema={t.tema} velikost={30} />
              <span className="min-w-0">
                <span className="text-[14.5px] font-bold" style={{ color: "#0D1B3E" }}>
                  {TEMA_LABELS[t.tema] ?? t.tema}
                  {zamceno && <span className="ml-1.5 text-[11px] font-bold" style={{ color: "#8A5A00" }}>Premium</span>}
                </span>
                <span className="block h-1.5 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--tema-tint)" }}>
                  <i className="block h-full rounded-full" style={{ width: `${Math.round((t.body / t.max) * 100)}%`, background: "var(--tema-barva)" }} />
                </span>
              </span>
              <span className="text-right tabular-nums">
                <b className="text-sm" style={{ color: "#0D1B3E" }}>{cs(t.body)} / {t.max} b.</b>
                <span className="block text-xs" style={{ color: zmena && zmena > 0 ? "#14753A" : "#8A93AA" }}>
                  {zmena === null ? " " : zmena > 0 ? `↑ +${cs(zmena)}` : zmena < 0 ? `↓ ${cs(zmena)}` : "beze změny"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {zmenaTemat && Object.values(zmenaTemat).some((z) => z !== null) && (
        <span className="text-xs -mt-1" style={{ color: "#8A93AA" }}>Šipky ukazují posun za posledních 14 dní.</span>
      )}
    </div>
  );
}
