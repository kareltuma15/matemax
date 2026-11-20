"use client";

/**
 * Nové části úvodní stránky (schválil Karel 18. 11. 2026, mockup docs/gamifikace-2026-11/uvod-redesign.html):
 * hlavička s živým 3D Hexíkem, tři kroky a témata obou tříd, Novinky z kroniky a sekce Hexík a odměny
 * se šatníkem ve 3D, cestou 30 úrovní a truhlami.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Hexik from "@/components/hexik/Hexik";
import HexikObrazek from "@/components/hexik/HexikObrazek";
import { reaguj } from "@/lib/hexik-efekty";
import { odmenaUrovne } from "@/lib/urovne";
import { localDateStr } from "@/lib/date";
import { novinky, PRIPRAVUJEME, type NovinkaVeStavu } from "@/lib/novinky";
import { ODMENY, IKONA_ODMENY, VZACNOST, type Odmena } from "@/lib/sbirka";

type T = 9 | 5;
type Sloty = Partial<Record<"hlava" | "oci" | "krk", string>>;
type Obleceni = { podoba: string; etapa: number; sloty: Sloty; nazev: string; vz: string };

const HERO: Record<T, Obleceni[]> = {
  9: [
    { podoba: "neon", etapa: 4, sloty: { hlava: "ksiltovka", oci: "slunecni", krk: "retez" }, nazev: "Neon", vz: "neobvyklá" },
    { podoba: "kyber", etapa: 4, sloty: { hlava: "svatozar", oci: "vizor" }, nazev: "Kyber", vz: "vzácná" },
    { podoba: "ohnivy", etapa: 4, sloty: {}, nazev: "Ohnivý", vz: "běžná" },
    { podoba: "klasik", etapa: 3, sloty: { hlava: "cepice", krk: "sala" }, nazev: "Vánoční čepice", vz: "sezónní" },
    { podoba: "street", etapa: 3, sloty: { oci: "pixel" }, nazev: "Streetwear", vz: "neobvyklá" },
  ],
  5: [
    { podoba: "dracek", etapa: 4, sloty: { oci: "hvezdicky" }, nazev: "Dráček", vz: "vzácná" },
    { podoba: "kocicka", etapa: 3, sloty: { hlava: "sluchatka" }, nazev: "Kočičí Hexík", vz: "neobvyklá" },
    { podoba: "lisak", etapa: 3, sloty: { hlava: "klobouk", krk: "motylek" }, nazev: "Lišáček", vz: "neobvyklá" },
    { podoba: "jednorozec", etapa: 4, sloty: { krk: "medaile" }, nazev: "Jednorožec", vz: "legendární" },
    { podoba: "klasik", etapa: 3, sloty: { hlava: "cepice", krk: "sala" }, nazev: "Vánoční čepice", vz: "sezónní" },
  ],
};
const TANCE = ["tanec", "salto", "jasot", "pirueta", "vlnka", "disco", "breakdance"];

/** Hlavička: živý 3D Hexík (jde chytit a otočit), každé 4 s jiný oblek a taneček, kolem karty z appky. */
export function HeroScena({ trida, otazka, moznosti }: { trida: T; otazka: string; moznosti: readonly string[] }) {
  const hx = useRef<HTMLSpanElement>(null);
  const [i, setI] = useState(0);
  const [tip, setTip] = useState(true);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((x) => x + 1), 4200);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => { if (i > 0) reaguj(hx.current, TANCE[i % TANCE.length]); }, [i]);
  const o = HERO[trida][i % HERO[trida].length];
  const dolu = useRef<number | null>(null);
  return (
    <div className="u-scena" aria-label="3D Hexík, jde otáčet tažením">
      <span className="u-scena-kruh" aria-hidden="true" />
      <span className="u-scena-podstavec" aria-hidden="true" />
      <div
        className="u-scena-hx"
        onPointerDown={(e) => { dolu.current = e.clientX; setTip(false); }}
        onPointerUp={(e) => { if (dolu.current !== null && Math.abs(e.clientX - dolu.current) < 6) reaguj(hx.current, "jasot"); dolu.current = null; }}
      >
        <Hexik ref={hx} podoba={o.podoba} etapa={o.etapa} d3 otacet doplnky={o.sloty} style={{ width: "100%", height: "100%" }} />
      </div>
      {tip && <span className="u-scena-ruka" aria-hidden="true">👆</span>}
      <div className="u-plov u-plov-1" aria-hidden="true">
        <small>Zlomky · 4 / 10</small>
        <b className="u-plov-ot">{otazka}</b>
        <span className="u-plov-mo">{moznosti.map((m, j) => <span key={m} className={j === 0 ? "ok" : ""}>{m}{j === 0 ? " ✓" : ""}</span>)}</span>
      </div>
      <div className="u-plov u-plov-combo" aria-hidden="true">🔥 <b>10×</b> combo</div>
      <div className="u-plov u-plov-3" aria-hidden="true"><small>Úroveň 8</small><b>Nová podoba: {trida === 5 ? "Včelka" : "Toxic"}</b><span>+110 krystalů</span></div>
      <div className="u-plov u-plov-4" aria-hidden="true"><small>Vzácná odměna!</small><b>Z truhly: {trida === 5 ? "Čarodějný klobouk" : "Svatozář"}</b></div>
      <span className="u-scena-badge"><i />Živě ve 3D · chyť Hexíka a otoč ho</span>
    </div>
  );
}

type Tema = [nazev: string, barva: string, znak: string, zdarma: boolean];
const TEMATA_9: Tema[] = [
  ["Zlomky", "#C2416B", "½", true], ["Výrazy", "#2F6FB0", "x", true], ["Rovnice", "#5B4BD6", "=", true],
  ["Geometrie", "#1F8A66", "△", false], ["Slovní úlohy", "#C27A00", "%", false], ["Grafy a logika", "#8E44AD", "▥", false],
  ["Konstrukční úlohy", "#3F8A2E", "⌖", false], ["Úhly", "#D2552B", "∠", false], ["Souhrnné", "#4A5578", "★", false],
];
const TEMATA_5: Tema[] = [
  ["Počítání s čísly", "#2F6FB0", "+", true], ["Jednotky, čas a peníze", "#1F8A66", "⏱", true], ["Slovní úlohy a úvaha", "#C27A00", "?", true],
  ["Zlomky a části celku", "#C2416B", "½", false], ["Obvod a obsah", "#5B4BD6", "▢", false], ["Tělesa a souměrnost", "#8E44AD", "◫", false],
  ["Rýsování", "#3F8A2E", "✎", false], ["Grafy, tabulky a vzory", "#4A5578", "▥", false],
];

function Dlazdice({ t }: { t: Tema }) {
  const [n, c, z, free] = t;
  return (
    <div className={`u-tm${free ? " free" : ""}`} style={{ background: `color-mix(in srgb, ${c} 9%, #fff)` }}>
      <i style={{ background: c }} aria-hidden="true">{z}</i><b>{n}</b>
    </div>
  );
}

/** Tři kroky a témata obou tříd vedle sebe v dlaždicích (zdarma zeleně). */
export function TemataObouTrid({ krok1 }: { krok1: readonly [string, string, string] }) {
  const kroky: [string, string, string, string, string][] = [
    ["01", krok1[0], krok1[1], krok1[2], "#2E6DA4"],
    ["02", "Denní trénink", "10 minut denně stačí", "Příklady od lehčích k těžším. Co ti nejde, se vrací, dokud to neumíš. Co už umíš, tě nezdržuje.", "#C4521A"],
    ["03", "Pokrok a odměny", "Vidíš, jak rosteš", "Odhad bodů, plamínek za dny v řadě, 30 úrovní a Hexík ve 3D. Rodiče každé pondělí dostanou e-mail.", "#17A34A"],
  ];
  return (
    <section data-sekce="temata" id="temata" className="u-sekce" style={{ background: "#FFFFFF", scrollMarginTop: 68 }}>
      <div className="u-wrap">
        <div style={{ textAlign: "center" }}><span className="u-pill" style={{ background: "#E4EEF7", color: "#2E6DA4" }}>Jak to funguje</span><h2 className="u-h2">Tři kroky k lepšímu výsledku</h2></div>
        <div className="u-kroky3">
          {kroky.map(([n, h, p, txt, c]) => (
            <div key={n} className="u-kr3" style={{ background: `color-mix(in srgb, ${c} 6%, #fff)`, borderColor: `color-mix(in srgb, ${c} 25%, #fff)` }}>
              <span className="c" style={{ color: c }} aria-hidden="true">{n}</span>
              <h3>{h}</h3><div className="po" style={{ color: c }}>{p}</div><p>{txt}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 56 }}>
          <span className="u-pill" style={{ background: "#FCE7EF", color: "#C2366B" }}>Co procvičíš</span>
          <h2 className="u-h2">Pro 5. i 9. třídu. Všechno z testů CERMAT.</h2>
          <p className="u-lead">Každé téma má tři úrovně. Na nejtěžší jsou úlohy jako ve skutečném testu. Páťák vidí jen učivo pro 5. třídu, deváťák jen pro 9.</p>
        </div>
        <div className="u-tridy2">
          {([[9, "9. třída", "9 témat · přijímačky na SŠ", "#E3EEFF", "#1E6FD9", TEMATA_9, "témata"], [5, "5. třída", "8 okruhů · víceletá gymnázia", "#FFF1DE", "#B4561F", TEMATA_5, "okruhy"]] as const).map(([k, h, s, bg, c, tem, slovo]) => (
            <div key={k} className="u-trsl">
              <div className="hl"><b>{h}</b><span style={{ background: bg, color: c }}>{s}</span></div>
              <div className="u-tm-mrizka">{tem.map((t) => <Dlazdice key={t[0]} t={t} />)}</div>
              <div className="leg"><i />První 3 {slovo} zdarma, ostatní s Premium</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Odpocet({ od }: { od: string }) {
  const [z, setZ] = useState<number | null>(null);
  useEffect(() => {
    const cil = new Date(od + "T00:00:00").getTime();
    const tik = () => setZ(Math.max(0, cil - Date.now()));
    tik();
    const id = window.setInterval(tik, 30000);
    return () => window.clearInterval(id);
  }, [od]);
  if (z === null) return null;
  return (
    <span className="u-odpocet">
      <span><b>{Math.floor(z / 864e5)}</b><small>dní</small></span>
      <span><b>{String(Math.floor((z % 864e5) / 36e5)).padStart(2, "0")}</b><small>hodin</small></span>
      <span><b>{String(Math.floor((z % 36e5) / 6e4)).padStart(2, "0")}</b><small>minut</small></span>
    </span>
  );
}

function VizualNovinky({ n }: { n: NovinkaVeStavu }) {
  if (n.vizual === "hexik") return <HexikObrazek podoba={n.podoba ?? "klasik"} etapa={n.etapa ?? 3} px={256} style={{ width: 128, height: 128 }} />;
  if (n.vizual === "combo") return <span className="u-combo-mini">20×</span>;
  if (n.vizual === "truhla") return <img src="/uvod/truhla-mistrovska.webp" alt="" className="u-nov-img" loading="lazy" />;
  if (n.vizual === "truhla-vanocni") return <img src="/uvod/truhla-vanocni.webp" alt="" className="u-nov-img" loading="lazy" />;
  if (n.vizual === "pokojicek") return <img src="/uvod/pokojicek.webp" alt="" className="u-nov-img" loading="lazy" style={{ objectPosition: "50% 60%" }} />;
  if (n.vizual === "pokojicek-zakladni") return <img src="/uvod/pokojicek-zakladni.webp" alt="" className="u-nov-img" loading="lazy" style={{ objectPosition: "45% 55%" }} />;
  if (n.vizual === "medaile") return <img src="/uvod/medaile.webp" alt="" className="u-nov-img" loading="lazy" style={{ objectFit: "contain", padding: 8 }} />;
  if (n.vizual === "test") return <span className="u-nov-test" aria-hidden="true"><b>50</b><small>bodů · 70 min</small></span>;
  return <span className="u-mini-kal" aria-hidden="true">{[7, 15, 2, 20, 11, 4, 18, 9, 24, 13, 1, 23].map((d) => <i key={d} className={d === 24 ? "z" : ""}>{d}</i>)}</span>;
}

/** Novinky v MateMaxu (z kroniky): „Nově“ a „Brzy“ s odpočtem. */
export function NovinkySekce({ trida }: { trida: T }) {
  const [den, setDen] = useState<string | null>(null);
  useEffect(() => { setDen(localDateStr()); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const seznam = den ? novinky(den, trida) : [];
  if (den && seznam.length === 0) return null;
  return (
    <section data-sekce="novinky" id="novinky" className="u-novinky" style={{ scrollMarginTop: 68 }}>
      <div className="u-wrap">
        <span className="u-pill" style={{ background: "rgba(255,210,126,.16)", color: "#FFD27E" }}>Novinky v MateMaxu</span>
        <h2 className="u-h2" style={{ color: "#fff" }}>Co je nového a na co se těšit</h2>
        <div className="u-nov-grid">
          {seznam.map((n) => (
            <div key={n.klic} className="u-nk">
              <span className={`u-nk-pill ${n.stav}`}>{n.stav === "brzy" ? `Od ${Number(n.od!.slice(8, 10))}. ${Number(n.od!.slice(5, 7))}.` : "Nově"}</span>
              <div className="u-nk-obr"><VizualNovinky n={n} /></div>
              <h3>{n.nadpis}</h3>
              {n.stav === "brzy" && n.od && <Odpocet od={n.od} />}
              <p>{n.text}</p>
            </div>
          ))}
          {PRIPRAVUJEME.map((p) => (
            <div key={p.nadpis} className="u-nk" data-testid="novinka-pripravujeme">
              <span className="u-nk-pill pripr">Připravujeme · {p.mesic}</span>
              <div className="u-nk-obr"><HexikObrazek podoba={p.podoba} etapa={p.etapa ?? 3} px={256} style={{ width: 128, height: 128 }} /></div>
              <h3>{p.nadpis}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Polozka = { id: string; nazev: string; vz: string; podoba: string; etapa: number; sloty: Sloty; ikona?: string; druh?: { typ: "hlava" | "oci" | "krk"; klic: string } };

function polozky(trida: T, druh: "podoby" | "doplnky"): Polozka[] {
  if (druh === "podoby") {
    const klice = trida === 9 ? ["neon", "kyber", "ohnivy", "ledovy", "street", "chrom"] : ["kocicka", "lisak", "dracek", "jednorozec", "robutek", "malina"];
    return klice.map((k) => {
      const o = ODMENY[trida].find((x) => x.typ === "podoba" && x.klic === k);
      return { id: k, nazev: o?.nazev ?? k, vz: o ? VZACNOST[o.vz].nazev : "", podoba: k, etapa: 4, sloty: {} };
    });
  }
  const klice: [Odmena["typ"], string][] = trida === 9
    ? [["hlava", "cepice"], ["hlava", "ksiltovka"], ["hlava", "svatozar"], ["oci", "pixel"], ["oci", "vizor"], ["krk", "retez"]]
    : [["hlava", "cepice"], ["hlava", "venecek"], ["hlava", "klobouk"], ["oci", "srdce"], ["oci", "hvezdicky"], ["krk", "medaile"]];
  return klice.map(([typ, k]) => {
    const o = ODMENY[trida].find((x) => x.typ === typ && x.klic === k);
    return { id: `${typ}-${k}`, nazev: o?.nazev ?? k, vz: o?.sezona ? "sezónní" : o ? VZACNOST[o.vz].nazev : "", podoba: "klasik", etapa: 3, sloty: { [typ]: k } as Sloty, ikona: IKONA_ODMENY[k], druh: { typ: typ as "hlava" | "oci" | "krk", klic: k } };
  });
}

const DALSI: [string, string, string, string][] = [
  ["🔥", "linear-gradient(135deg,#FF9A3D,#FF5E3A)", "Combo", "Správně za sebou: Hexík září, hoří, pak zlátne. Na milnících krystaly."],
  ["🎄", "#C63A4B", "Adventní kalendář", "24 okének od 1. 12., každé po tréninku. Sedm věcí, které jinde nejsou."],
  ["👾", "#5B4BD6", "Boss týdne", "Jedna těžká úloha ve stylu přijímaček týdně. Za výhru trofej."],
  ["✅", "#1F9D63", "Denní mise", "Tři mise denně a plamínek série, který nesmí zhasnout."],
  ["💬", "#2F7FD6", "Hexík radí", "Řekne jednu věc, která se teď nejvíc vyplatí. Většinou nejslabší téma."],
  ["🏆", "#C88A0E", "Sady a trofeje", "Sady s bonusem a trofeje za vytrvalost a pokrok."],
];

/** Sekce Hexík a odměny: šatník ve 3D, cesta 30 úrovní, truhly, další hry a růst Hexíka. */
export function HexikOdmeny({ trida }: { trida: T }) {
  const [druh, setDruh] = useState<"podoby" | "doplnky">("podoby");
  const seznam = polozky(trida, druh);
  const [vyb, setVyb] = useState(0);
  const hx = useRef<HTMLSpanElement>(null);
  const p = seznam[Math.min(vyb, seznam.length - 1)];
  useEffect(() => { reaguj(hx.current, "poskok"); }, [p.id]);
  const urovne = [1, 3, 5, 6, 8, 10, 12, 13, 16, 18, 20, 22, 25, 28, 30];
  const tlac = (aktivni: boolean): CSSProperties => (aktivni ? { background: "#fff", color: "#0D1B3E" } : {});
  return (
    <section data-sekce="hexik" id="hexik" className="u-sekce u-hra" style={{ scrollMarginTop: 68 }}>
      <div className="u-wrap" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 56 }}>
        <div style={{ textAlign: "center" }}>
          <span className="u-pill" style={{ background: "rgba(175,172,251,.18)", color: "#D9D7FF" }}>Hexík a odměny</span>
          <h2 className="u-h2" style={{ color: "#fff" }}>Za snahu odměny.<br /><span style={{ color: "#AFACFB" }}>Hexík ve 3D roste s tebou.</span></h2>
          <p className="u-lead" style={{ color: "#BFCBE6" }}>Krystaly a XP jen za učení. Za krystaly truhly, za úrovně unikátní věci. Nic se nekupuje za peníze.</p>
          <div className="u-zasady">{["Odměny jen za učení", "Nic za peníze", "Šance vidět u každé truhly", "Premium nedává lepší šance"].map((z) => <span key={z}>{z}</span>)}</div>
        </div>

        <div className="u-satnik">
          <div className="u-sat-scena">
            <span className="u-sat-podl" aria-hidden="true" />
            <div className="u-sat-hx"><Hexik ref={hx} podoba={p.podoba} etapa={p.etapa} d3 otacet doplnky={p.sloty} style={{ width: "100%", height: "100%" }} /></div>
            <div className="u-sat-jm">{p.nazev}<small>{druh === "podoby" ? "podoba" : "doplněk"} · {p.vz}</small></div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 className="u-h3b">Šatník: tvůj Hexík, tvůj styl</h3>
            <p style={{ color: "#C4CEEA", margin: "6px 0 0" }}>Podoby, čepice, brýle, šály, tanečky a živá pozadí. Doplňky sednou na jakoukoli podobu. Vyber si, Hexík se převlékne a jde otočit.</p>
            <div className="u-sat-tab" role="group" aria-label="Druh">
              <button type="button" aria-pressed={druh === "podoby"} style={tlac(druh === "podoby")} onClick={() => { setDruh("podoby"); setVyb(0); }}>Podoby</button>
              <button type="button" aria-pressed={druh === "doplnky"} style={tlac(druh === "doplnky")} onClick={() => { setDruh("doplnky"); setVyb(0); }}>Doplňky</button>
            </div>
            <div className="u-sat-mrizka">
              {seznam.map((x, j) => (
                <button key={x.id} type="button" aria-pressed={j === vyb} onClick={() => setVyb(j)}>
                  {x.druh ? <HexikObrazek podoba={x.druh.klic} druh={x.druh.typ} px={128} style={{ width: 56, height: 56 }} zalozni={<span className="u-sat-ik" aria-hidden="true">{x.ikona}</span>} /> : <HexikObrazek podoba={x.podoba} etapa={x.etapa} px={128} style={{ width: 56, height: 56 }} />}
                  <small>{x.nazev}</small><small className="vz">{x.vz}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="u-pokoj" data-testid="u-pokojicek">
          <img src="/uvod/pokojicek-zakladni.webp" alt="Hexíkův pokojíček ve 3D: tabule s dnešním plánem, postel, psací stůl a šatní skříň" className="u-pokoj-obr" loading="lazy" />
          <div>
            <h3 className="u-h3b">Hexíkův pokojíček</h3>
            <p style={{ color: "#C4CEEA", margin: "6px 0 0" }}>Hexík má domov ve 3D a každý ho dostane zdarma. Ťukneš na věc a Hexík ji udělá sám: zalije květinu, kopne do míče, zdřímne si. Na tabuli je dnešní plán a cesta rovnou do tréninku, skříň vede do šatníku.</p>
            <div className="u-chipy-t">{["Zdarma pro každého", "Hexík sám dělá kouzla", "Tabule s dnešním plánem", "Nové pokoje za sady", "Vybavení za krystaly"].map((c) => <span key={c}>{c}</span>)}</div>
            <div className="u-pokoje-mini">
              {([["/uvod/pokojicek.webp", "Vánoční pokojíček"], ["/uvod/pokojicek-chaloupka.webp", "Perníková chaloupka"], ["/uvod/pokojicek-polarni.webp", "Polární záře"]] as const).map(([src, jm]) => (
                <figure key={src}><img src={src} alt={jm} loading="lazy" /><figcaption>{jm}</figcaption></figure>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="u-h3b" style={{ textAlign: "center" }}>30 úrovní a za každou odměna</h3>
          <p style={{ color: "#C4CEEA", textAlign: "center", margin: "6px 0 18px" }}>Krystaly za každou úroveň, unikátní věc na 14 z nich, legendární truhla na 10., 20. a 30.</p>
          <div className="u-cesta"><div className="u-cesta-in">
            {urovne.map((u) => {
              const o = odmenaUrovne(trida, u);
              return (
                <div key={u} className={`u-uz${o.vec ? " v" : ""}${o.legendarni ? " l" : ""}`}>
                  <i>{u}</i><b>{u === 1 ? "Start" : o.vec?.nazev ?? "Krystaly"}</b>
                  <small>{u === 1 ? "začátek" : o.legendarni ? "+ legendární truhla" : `${o.krystaly} krystalů`}</small>
                </div>
              );
            })}
          </div></div>
        </div>

        <div className="u-truhly3">
          <img src="/uvod/truhla-mistrovska.webp" alt="Hexík otevírá mistrovskou truhlu a padá legendární odměna" className="u-truhla-obr" loading="lazy" />
          <div>
            <h3 className="u-h3b">Truhly, které otevírá Hexík</h3>
            <div className="u-kroky-t">
              <div><b className="n">1</b><span><b>Klepni.</b> Truhla se zatřese.</span></div>
              <div><b className="n">2</b><span><b>Klepni znovu.</b> Ze škvíry prosvítá barva vzácnosti.</span></div>
              <div><b className="n">3</b><span><b>Potřetí</b> Hexík poskočí a víko se rozletí.</span></div>
            </div>
            <div className="u-chipy-t">{["Denní zdarma", "Zlatá za 5 dní", "Doporučení", "Generálka", "Legendární", "Krystalová", "Velká", "Mistrovská", "Sezónní"].map((c) => <span key={c}>{c}</span>)}</div>
          </div>
        </div>

        <div className="u-dalsi">
          {DALSI.map(([ik, bg, h, txt]) => (
            <div key={h} className="u-dk"><span className="ik" style={{ background: bg }} aria-hidden="true">{ik}</span><h4>{h}</h4><p>{txt}</p></div>
          ))}
        </div>

        <div>
          <h3 className="u-h3b" style={{ textAlign: "center", marginBottom: 18 }}>Hexík roste podle odhadu bodů</h3>
          <div className="u-g5" style={{ alignItems: "end" }}>
            {([[1, "Nováček", "start", 74], [2, "Učeň", "od 15 bodů", 88], [3, "Zkušený", "od 25 bodů", 102], [4, "Expert", "od 35 bodů", 116], [5, "Mistr", "od 43 bodů", 132]] as const).map(([e, n, s, w]) => (
              <div key={n} style={{ textAlign: "center" }}>
                <HexikObrazek podoba="klasik" etapa={e} px={256} style={{ width: w + 16, height: w + 16, margin: "0 auto", display: "block" }} />
                <div style={{ fontWeight: 900, marginTop: 8, color: e === 5 ? "#FFD166" : "#fff" }}>{n}</div>
                <div style={{ fontSize: 13, color: "#9FB4DA" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
