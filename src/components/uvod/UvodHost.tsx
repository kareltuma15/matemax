"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Hexik from "@/components/hexik/Hexik";
import { readLocalTrida, saveLocalTrida } from "@/lib/trida";
import { EXAMPLES_TEXT, EXAMPLES_LABEL } from "@/lib/site-stats";
import "@/app/uvod.css";

/**
 * Úvodní stránka pro nepřihlášené (schválený návrh 16. 11. 2026). Přepínač 9. / 5. třída mění texty
 * i ukázky; třídy se nemíchají. Čísla a termíny jen z ověřených faktů v MS Dashboardu:
 * úlohy (site-stats), 25 z 25 přijato, 200+ žáků, 10 let praxe, formát testu, termíny testů nanečisto,
 * JPZ 2027. U 5. třídy se počet úloh neuvádí. data-sekce čte měření návštěvnosti (poslední sekce).
 */

type T = 9 | 5;
const TESTY_NANECISTO = "https://www.matematika-snadno.cz/prijimacky-nanecisto";

const TEXTY = {
  9: {
    h1a: "Přijímačky z matiky?", h1b: "Zvládneš je.",
    sub: "Deset minut denně, úlohy přesně ve stylu CERMAT a Hexík, který ti u každého příkladu fandí. Rodiče každé pondělí vědí, jak na tom jsi.",
    chipy: [`Více než ${EXAMPLES_TEXT} úloh ve stylu CERMAT`, "9 témat jako v testu", "Na mobilu i počítači"],
    testInfo: "Úloha 7 z 16 · 50 bodů",
    tema: "Zlomky", temaB: ["#C2366B", "#FCE7EF"],
    otazkaKolaz: "3/4 + 1/6 = ?", kolaz: ["11/12", "5/6", "7/12", "1/2"], postupKolaz: "9/12 + 2/12 = 11/12",
    demoTema: "Slovní úlohy · procenta", demoB: ["#A66300", "#FDF0DA"],
    demoOtazka: "Kolik je 15 % z 240?", demo: ["24", "32", "36", "40"], demoOk: 2,
    demoPostup: "10 % z 240 je 24, 5 % je 12. Dohromady 36.",
    cislo1: EXAMPLES_LABEL, cislo1p: "úloh ve stylu CERMAT", cislo4: "9 témat", cislo4p: "jako v testu CERMAT",
    dnes: ["Zlomky · 3 příklady", "Rovnice · 4 příklady", "Úhly · 3 příklady"],
    chybaOdp: "x = 12", kroky: ["2x + 5 = 17 → odečti 5 na obou stranách", "2x = 12", "vyděl dvěma: x = 6"],
    slabe: "slovní úlohy o pohybu",
    krok1: "Krátká diagnostika", krok1p: "Zjistíme, kde stojíš", krok1t: "Pár minut a appka ví, která témata umíš a kde máš mezery. Podle toho ti sestaví trénink.",
    temataH: "Všech 9 témat z testu CERMAT", temataSub: "Každé téma má tři úrovně. Na nejtěžší jsou úlohy jako ve skutečném testu.",
    slabePriklad: "zlomky jdou, slovní úlohy o pohybu ještě ne.",
    format: "70 minut, 16 úloh, 50 bodů.",
    zdarma: ["Diagnostika všech témat", "Zlomky, výrazy a rovnice", "Hexík, krystaly a truhly"],
    premium: ["Všech 9 témat a cvičné testy CERMAT", "Odhad bodů a slabá místa", "E-mail rodičům každé pondělí"],
    termin: "čtyřleté obory 12.–13. 4.",
  },
  5: {
    h1a: "Na gymnázium", h1b: "hravě.",
    sub: "Krátké úlohy s obrázky, rýsováním a grafy jako v testu CERMAT pro páťáky. Hexík fandí u každého příkladu a za snahu sbíráš odměny.",
    chipy: ["8 okruhů jako v testu", "Rýsování přímo v appce", "První tři okruhy zdarma"],
    testInfo: "Úloha 7 z 14 · rýsování",
    tema: "Jednotky, čas a peníze", temaB: ["#A66300", "#FDF0DA"],
    otazkaKolaz: "2 h 15 min = ? min", kolaz: ["135", "125", "215", "150"], postupKolaz: "120 + 15 = 135 minut",
    demoTema: "Zlomky a části celku", demoB: ["#C2366B", "#FCE7EF"],
    demoOtazka: "Kolik je polovina z třetiny čísla 60?", demo: ["10", "20", "15", "30"], demoOk: 0,
    demoPostup: "Třetina z 60 je 20, polovina z 20 je 10.",
    cislo1: "8 okruhů", cislo1p: "jako v testu pro páťáky", cislo4: "3 okruhy", cislo4p: "zdarma bez omezení",
    dnes: ["Počítání · 3 příklady", "Jednotky · 4 příklady", "Grafy · 3 příklady"],
    chybaOdp: "215 min", kroky: ["1 hodina má 60 minut", "2 h = 2 · 60 = 120 min", "120 + 15 = 135 min"],
    slabe: "převody jednotek času",
    krok1: "Vyber okruh", krok1p: "Začni tím, co tě baví", krok1t: "Osm okruhů jako v testu pro páťáky. Každý od lehkých úloh po úroveň skutečného testu.",
    temataH: "Všech 8 okruhů z testu pro páťáky", temataSub: "Každý okruh má tři úrovně. Na nejtěžší jsou úlohy jako ve skutečném testu.",
    slabePriklad: "počítání jde, převody jednotek času ještě ne.",
    format: "70 minut, 14 úloh, 50 bodů.",
    zdarma: ["Počítání s čísly", "Jednotky, čas a peníze", "Slovní úlohy a úvaha", "Hexík, krystaly a truhly"],
    premium: ["Všech 8 okruhů", "Odhad bodů a slabá místa", "E-mail rodičům každé pondělí"],
    termin: "víceletá gymnázia 14.–15. 4.",
  },
} as const;

const B = {
  MODRA: ["#2E6DA4", "#E4EEF7"], JANTAR: ["#A66300", "#FDF0DA"], FIALOVA: ["#5B55D6", "#EBEAFE"], RUZOVA: ["#C2366B", "#FCE7EF"],
  TYRKYS: ["#0F7F76", "#DDF3F0"], ORANZ: ["#C4521A", "#FDE9DE"], ZELENA: ["#3B7A24", "#E8F4DF"], PURPUR: ["#8E3FA8", "#F4E7F9"], BRIDLICE: ["#44507A", "#E9EBF3"],
} as const;
const I = {
  POCITANI: "M3 6h6M6 3v6M15 6h6M4 15l5 5M9 15l-5 5M15 16h6M15 20h6",
  BUBLINA: "M4 5h16v11H9l-5 4V5ZM8 9h8M8 12.5h5",
  ZLOMEK: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18ZM12 3v18M12 12h9",
  KRUZITKO: "M12 3v3M12 6L6 21M12 6l6 15M8.5 15h7",
  GRAF: "M4 20h16M7 20v-6M12 20V6M17 20V10",
};
type Tema = [nazev: string, barva: keyof typeof B, ikona: string, priklad: string, zdarma: boolean];
const TEMATA: Record<T, Tema[]> = {
  9: [
    ["Zlomky", "RUZOVA", I.ZLOMEK, "2/3 · 9/4 = ?", true],
    ["Výrazy", "MODRA", I.POCITANI, "Roznásob 3(x − 2)", true],
    ["Rovnice", "FIALOVA", "M5 9h14M5 15h14", "2x + 5 = 17", true],
    ["Geometrie", "TYRKYS", "M12 4l9 16H3L12 4Z", "Obsah lichoběžníku", false],
    ["Slovní úlohy", "JANTAR", I.BUBLINA, "Cena po slevě 20 %", false],
    ["Grafy a logika", "PURPUR", I.GRAF, "Čtení ze sloupcového grafu", false],
    ["Konstrukční úlohy", "ZELENA", I.KRUZITKO, "Sestroj trojúhelník ABC", false],
    ["Úhly", "ORANZ", "M4 20L19 5M4 20h16M12.5 20a8.5 8.5 0 0 0-2.5-6", "Dopočítej úhel α", false],
    ["Souhrnné", "BRIDLICE", "M12 3l2.7 5.6l6.1.8l-4.4 4.3l1 6.1l-5.4-2.9l-5.4 2.9l1-6.1l-4.4-4.3l6.1-.8L12 3Z", "Úlohy A–E jako v testu", false],
  ],
  5: [
    ["Počítání s čísly", "MODRA", I.POCITANI, "25 · 4 + 18 = ?", true],
    ["Jednotky, čas a peníze", "JANTAR", "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18ZM12 7v5l3.5 2", "3 h 20 min = ? min", true],
    ["Slovní úlohy a úvaha", "FIALOVA", I.BUBLINA, "Kolik stojí 3 sešity?", true],
    ["Zlomky a části celku", "RUZOVA", I.ZLOMEK, "Kolik je 1/4 z 20?", false],
    ["Obvod a obsah", "TYRKYS", "M4 4h16v16H4ZM4 12h16M12 4v16", "Obvod obdélníku 5 × 3 cm", false],
    ["Tělesa a souměrnost", "ORANZ", "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5l8-4.5M12 12v9", "Kolik krychlí má stavba?", false],
    ["Rýsování", "ZELENA", I.KRUZITKO, "Narýsuj čtverec ABCD", false],
    ["Grafy, tabulky a vzory", "PURPUR", I.GRAF, "Doplň další číslo řady", false],
  ],
};

const RAR = {
  bezna: ["Běžná", "#9FB4DA", "rgba(159,180,218,.35)"],
  neobvykla: ["Neobvyklá", "#4ADE80", "rgba(74,222,128,.45)"],
  vzacna: ["Vzácná", "#7DB7FF", "rgba(125,183,255,.5)"],
  legenda: ["Legendární", "#FFD166", "rgba(255,209,102,.6)"],
} as const;
type Podoba = [klic: string, etapa: number, nazev: string, rarita: keyof typeof RAR];
const PODOBY: Record<T, Podoba[]> = {
  9: [["klasik", 3, "Hexík", "bezna"], ["ohnivy", 3, "Ohnivý", "bezna"], ["neon", 4, "Neon", "neobvykla"], ["street", 4, "Streetwear", "neobvykla"], ["kyber", 4, "Kyber", "vzacna"], ["zlaty", 5, "Zlatý Hexík", "legenda"]],
  5: [["klasik", 3, "Hexík", "bezna"], ["malina", 3, "Malinový", "bezna"], ["kocicka", 3, "Kočičí", "neobvykla"], ["robutek", 4, "Robůtek", "neobvykla"], ["dracek", 4, "Dráček", "vzacna"], ["jednorozec", 5, "Jednorožec", "legenda"]],
};

const TERMINY = ["12. 12. 2026", "9. 1.", "23. 1.", "6. 2.", "20. 2.", "6. 3.", "20. 3.", "3. 4. 2027"];

const stitek = ([c, tint]: readonly [string, string]): CSSProperties => ({ fontSize: 13, fontWeight: 800, padding: "5px 11px", borderRadius: 999, color: c, background: tint });

function Sym({ c, style }: { c: string; style: CSSProperties }) {
  return <span className="u-sym" aria-hidden="true" style={style}>{c}</span>;
}

function Hlavicka({ pill, pillStyle, nadpis, lead, leadStyle }: { pill: string; pillStyle: CSSProperties; nadpis: ReactNode; lead?: string; leadStyle?: CSSProperties }) {
  return (
    <div style={{ textAlign: "center" }}>
      <span className="u-pill" style={pillStyle}>{pill}</span>
      <h2 className="u-h2">{nadpis}</h2>
      {lead && <p className="u-lead" style={leadStyle}>{lead}</p>}
    </div>
  );
}

const Sipka = () => (
  <div className="u-sip" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  </div>
);

export default function UvodHost({ diagDone }: { diagDone: boolean }) {
  // Třída: co si návštěvník zvolil už dřív (v prohlížeči), jinak 9. Volba se uloží, takže trénink
  // bez účtu i registrace pak pokračují ve stejné třídě.
  const [trida, setTrida] = useState<T>(9);
  const [vybrano, setVybrano] = useState<number | null>(null);
  useEffect(() => {
    // Až v prohlížeči (server localStorage nezná), jinak by se HTML ze serveru a z prohlížeče lišilo.
    if (readLocalTrida() === 5) setTrida(5); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  const t = TEXTY[trida];

  function zvol(n: T) {
    setTrida(n);
    setVybrano(null);
    saveLocalTrida(n);
  }

  const start = diagDone ? "/trenink" : "/registrace";
  const startText = diagDone ? "Trénovat →" : "Začít zdarma →";
  const aktivni: CSSProperties = { background: "#FFFFFF", color: "#0D1B3E" };
  const neaktivni: CSSProperties = { background: "transparent", color: "#DCEBFA" };

  return (
    <div className="mmu">
      {/* ═══ NAVIGACE ═══ */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E8ECF4", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="u-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, height: 68 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#0D1B3E" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: "#0D1B3E", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>M²</span>
            <span style={{ fontWeight: 900, fontSize: 19 }}>MateMax</span>
          </Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }} aria-label="Hlavní">
            <a className="u-skryt u-nav-a" href="#ukazky">Ukázky</a>
            <a className="u-skryt u-nav-a" href="#temata">Témata</a>
            <a className="u-skryt u-nav-a" href="#rodice">Pro rodiče</a>
            <a className="u-skryt u-nav-a" href="#cena">Cena</a>
            <Link href="/prihlaseni" style={{ color: "#2E6DA4", fontWeight: 800, fontSize: 15, border: "2px solid #2E6DA4", borderRadius: 10, padding: "7px 14px" }}>Přihlásit se</Link>
            <Link className="u-skryt" href={start} style={{ color: "#FFFFFF", background: "#2E6DA4", fontWeight: 800, fontSize: 15, borderRadius: 10, padding: "9px 16px" }}>{diagDone ? "Trénovat →" : "Začít zdarma"}</Link>
          </nav>
        </div>
      </header>

      {/* ═══ ÚVOD ═══ */}
      <section data-sekce="uvod" className="u-hero-bg" style={{ position: "relative", padding: "72px 0 120px", color: "#FFFFFF" }}>
        <Sym c="π" style={{ top: "10%", left: "4%", fontSize: 44, opacity: 0.1 }} />
        <Sym c="∑" style={{ top: "70%", left: "3%", fontSize: 40, opacity: 0.09, animationDelay: "1s" }} />
        <Sym c="×" style={{ top: "18%", left: "47%", fontSize: 30, opacity: 0.08, animationDelay: ".4s" }} />
        <Sym c="÷" style={{ top: "82%", left: "44%", fontSize: 36, opacity: 0.08, animationDelay: "1.6s" }} />
        <Sym c="√" style={{ top: "8%", left: "92%", fontSize: 46, opacity: 0.1, animationDelay: ".8s" }} />
        <Sym c="∞" style={{ top: "60%", left: "95%", fontSize: 34, opacity: 0.08, animationDelay: "2s" }} />
        <Sym c="x²" style={{ top: "40%", left: "1.5%", fontSize: 26, opacity: 0.08, animationDelay: "2.4s" }} />

        <div className="u-wrap u-hero" style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start", minWidth: 0 }}>
            <span className="u-pill" style={{ background: "rgba(255,255,255,.14)", color: "#CFF4FC", border: "1px solid rgba(255,255,255,.22)" }}>Příprava na přijímačky z matematiky</span>
            <div role="group" aria-label="Třída" style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.22)" }}>
              <button type="button" className="u-tr" aria-pressed={trida === 9} onClick={() => zvol(9)} style={trida === 9 ? aktivni : neaktivni}>🎒 9. třída</button>
              <button type="button" className="u-tr" aria-pressed={trida === 5} onClick={() => zvol(5)} style={trida === 5 ? aktivni : neaktivni}>✏️ 5. třída</button>
            </div>
            <h1 className="u-h1" style={{ margin: 0, fontSize: 60, lineHeight: 1.04, fontWeight: 900, letterSpacing: "-.025em", textWrap: "balance" }}>
              {t.h1a} <span style={{ color: "#7FE3F5" }}>{t.h1b}</span>
            </h1>
            <p style={{ margin: 0, fontSize: 19, color: "#D6E8FA", maxWidth: 540 }}>{t.sub}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {t.chipy.map((c) => (
                <span key={c} style={{ fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", padding: "7px 13px", borderRadius: 999 }}>✓ {c}</span>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link className="u-tl" href={start} style={{ background: "#00B4D8", color: "#FFFFFF", boxShadow: "0 10px 24px rgba(0,180,216,.35)" }}>{startText}</Link>
              <a className="u-tl" href="#zkus" style={{ background: "rgba(255,255,255,.12)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,.28)" }}>Zkusit příklad ↓</a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex" }} aria-hidden="true">
                {([["klasik", 3], ["kocicka", 3], ["neon", 4], ["robutek", 4]] as const).map(([k, e]) => (
                  <span key={k} className="u-hx-kruh"><Hexik podoba={k} etapa={e} staticky /></span>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "#CFE3F7" }}>
                <strong style={{ color: "#FFFFFF" }}>25 z 25</strong> mých loňských žáků přijato · <strong style={{ color: "#FFFFFF" }}>200+</strong> žáků · <strong style={{ color: "#FFFFFF" }}>10 let</strong> praxe
              </p>
            </div>
          </div>

          {/* Koláž appky */}
          <div className="u-kolaz" aria-hidden="true">
            <div className="u-karta u-md" style={{ top: 34, right: 6, width: 270, padding: 18, transform: "rotate(7deg)", background: "#0D1B3E", color: "#FFFFFF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "#9FB4DA" }}><span>Test CERMAT</span><span style={{ color: "#FFD166" }}>⏱ 52:18</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 5, marginTop: 14 }}>
                {["#22C55E", "#22C55E", "#22C55E", "#EF4444", "#22C55E", "#22C55E", "#00B4D8", ...Array(9).fill("#22355F")].map((c, i) => (
                  <span key={i} style={{ height: 22, borderRadius: 6, background: c }} />
                ))}
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "#9FB4DA" }}>{t.testInfo}</p>
            </div>

            <div className="u-karta u-km">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={stitek(t.temaB)}>{t.tema}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#4A5470" }}>4 / 10</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "#EEF1F6", marginTop: 12, overflow: "hidden" }}><div style={{ width: "40%", height: "100%", background: "linear-gradient(90deg,#2E6DA4,#00B4D8)" }} /></div>
              <p style={{ margin: "22px 0 18px", fontSize: 26, fontWeight: 900, textAlign: "center" }}>{t.otazkaKolaz}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {t.kolaz.map((m, i) => (
                  <span key={m} style={{ borderRadius: 12, padding: 12, textAlign: "center", fontWeight: 800, fontSize: 18, ...(i === 0 ? { background: "#22C55E", color: "#FFFFFF" } : { background: "#F4F7FC", color: "#33405F" }) }}>{m}</span>
                ))}
              </div>
              <div style={{ marginTop: 14, background: "#E8F8EE", border: "1px solid #B9E8CA", borderRadius: 12, padding: "10px 12px", fontSize: 14, color: "#17663A", fontWeight: 700 }}>✓ Správně! {t.postupKolaz}</div>
            </div>

            <div className="u-kh">
              <Hexik podoba="klasik" etapa={4} className="u-kh-hx" />
              <span className="u-kh-bublina">Paráda! Třetí v řadě 🎉</span>
            </div>

            <div className="u-karta u-md" style={{ top: 4, left: 150, padding: "10px 14px", fontWeight: 800, fontSize: 14, color: "#C4521A", transform: "rotate(-2deg)" }}>🔥 6 dní v řadě</div>
            <div className="u-karta u-md" style={{ top: 392, right: -18, width: 190, padding: 14, transform: "rotate(3deg)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#5F6982", textTransform: "uppercase", letterSpacing: ".05em" }}>Odhad bodů</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}><span style={{ fontSize: 30, fontWeight: 900 }}>31</span><span style={{ color: "#5F6982", fontWeight: 700 }}>/ 50</span><span style={{ marginLeft: "auto", color: "#17A34A", fontWeight: 900, fontSize: 14 }}>▲ 4</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 40, marginTop: 6 }}>
                {[[40, "#CFE0F2"], [52, "#CFE0F2"], [50, "#CFE0F2"], [66, "#9CC3E8"], [74, "#5B9BD5"], [90, "#2E6DA4"]].map(([h, c], i) => (
                  <span key={i} style={{ flex: 1, height: `${h}%`, background: c as string, borderRadius: 4 }} />
                ))}
              </div>
            </div>
            <div className="u-karta u-md" style={{ bottom: 0, right: 150, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", transform: "rotate(-2deg)" }}>
              <span style={{ fontSize: 26 }}>🎁</span>
              <span><span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#8E3FA8", textTransform: "uppercase", letterSpacing: ".05em" }}>Vzácná odměna!</span><span style={{ fontWeight: 800, fontSize: 15 }}>Z denní truhly: Robůtek</span></span>
              <span style={{ width: 44, height: 44 }}><Hexik podoba="robutek" etapa={4} staticky /></span>
            </div>
            <div className="u-karta u-md" style={{ top: 236, left: -18, padding: "8px 12px", fontWeight: 900, fontSize: 15, color: "#2E6DA4", transform: "rotate(-6deg)" }}>+2 💎</div>
          </div>
        </div>

        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -1, width: "100%", height: 80, display: "block" }} aria-hidden="true"><path d="M0 50 C 240 90 480 10 720 40 C 960 70 1200 20 1440 46 L1440 80 L0 80 Z" fill="#F4F7FC" /></svg>
      </section>

      {/* ═══ ZKUS SI PŘÍKLAD ═══ */}
      <section data-sekce="zkus-priklad" id="zkus" style={{ background: "#F4F7FC", padding: "64px 0 80px", scrollMarginTop: 68 }}>
        <div className="u-wrap u-g2">
          <div>
            <span className="u-pill" style={{ background: "#E0F5FB", color: "#0A7C99" }}>Vyzkoušej hned</span>
            <h2 className="u-h2">Zkus si příklad.<br /><span style={{ color: "#2E6DA4" }}>Bez registrace.</span></h2>
            <ul style={{ margin: "24px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 12, fontSize: 17, color: "#33405F" }}>
              <li>✅ Úlohy ve stylu skutečných testů CERMAT</li>
              <li>💬 Po chybě hned vidíš postup krok za krokem</li>
              <li>💎 Za správnou odpověď krystaly pro Hexíka</li>
              <li>📈 Appka sama přidá těžší, když už to umíš</li>
            </ul>
          </div>
          <div className="u-karta" style={{ padding: 26, maxWidth: 480, width: "100%", justifySelf: "center", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={stitek(t.demoB)}>{t.demoTema}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#0A7C99", background: "#E0F5FB", padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>bez registrace</span>
            </div>
            <p style={{ margin: "20px 0 18px", fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>{t.demoOtazka}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              {t.demo.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  className="u-moz"
                  disabled={vybrano !== null}
                  onClick={() => setVybrano(i)}
                  style={vybrano === null ? undefined : i === t.demoOk ? { background: "#1F9D55", borderColor: "#1F9D55", color: "#FFFFFF" } : i === vybrano ? { background: "#D64550", borderColor: "#D64550", color: "#FFFFFF" } : { opacity: 0.5 }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 18, minHeight: 92 }} aria-live="polite">
              <Hexik podoba="klasik" etapa={3} className={vybrano === null ? "" : vybrano === t.demoOk ? "hx-r-jasot" : "hx-r-poskok"} style={{ width: 78, height: 78, flex: "none" }} key={`${trida}-${vybrano}`} />
              <div style={{ flex: 1 }}>
                {vybrano === null && <p style={{ margin: 0, background: "#F4F7FC", borderRadius: 14, padding: "12px 14px", fontWeight: 700, color: "#33405F" }}>Vyber odpověď, já ti fandím!</p>}
                {vybrano !== null && vybrano === t.demoOk && <p style={{ margin: 0, background: "#E8F8EE", borderRadius: 14, padding: "12px 14px", fontWeight: 700, color: "#17663A" }}>Správně! +2 💎 {t.demoPostup}</p>}
                {vybrano !== null && vybrano !== t.demoOk && <p style={{ margin: 0, background: "#FFF4E0", borderRadius: 14, padding: "12px 14px", fontWeight: 700, color: "#7A4A06" }}>Nevadí, zkusíme to spolu: {t.demoPostup}</p>}
              </div>
            </div>
            {vybrano !== null && (
              <Link className="u-tl" href="/registrace" style={{ marginTop: 16, width: "100%", background: "#2E6DA4", color: "#FFFFFF" }}>Pokračovat s účtem zdarma →</Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══ ČÍSLA ═══ */}
      <section data-sekce="cisla" style={{ background: "#FFFFFF", borderTop: "1px solid #E8ECF4", borderBottom: "1px solid #E8ECF4" }}>
        <div className="u-wrap u-g4" style={{ paddingTop: 36, paddingBottom: 36, textAlign: "center" }}>
          <div><div style={{ fontSize: 38, fontWeight: 900, color: "#2E6DA4" }}>{t.cislo1}</div><div style={{ color: "#5F6982", fontWeight: 600 }}>{t.cislo1p}</div></div>
          <div><div style={{ fontSize: 38, fontWeight: 900, color: "#17A34A" }}>25 z 25</div><div style={{ color: "#5F6982", fontWeight: 600 }}>mých žáků loni přijato</div></div>
          <div><div style={{ fontSize: 38, fontWeight: 900, color: "#C4521A" }}>10 min</div><div style={{ color: "#5F6982", fontWeight: 600 }}>denně stačí</div></div>
          <div><div style={{ fontSize: 38, fontWeight: 900, color: "#8E3FA8" }}>{t.cislo4}</div><div style={{ color: "#5F6982", fontWeight: 600 }}>{t.cislo4p}</div></div>
        </div>
      </section>

      {/* ═══ UKÁZKY APPKY ═══ */}
      <section data-sekce="ukazky" id="ukazky" className="u-sekce" style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#F4F7FC 100%)", scrollMarginTop: 68 }}>
        <div className="u-wrap">
          <Hlavicka pill="Podívej se dovnitř" pillStyle={{ background: "#EBEAFE", color: "#5B55D6" }} nadpis="Takhle vypadá trénink v MateMaxu" lead="Žádné nudné listy. Krátké úlohy, okamžitá odpověď, postup po chybě a pokrok, který je vidět." />
          <div className="u-g3" style={{ marginTop: 48 }}>
            {/* 1 Dnešní trénink */}
            <div className="u-karta u-ukazka">
              <div className="u-ukazka-obr" style={{ background: "linear-gradient(135deg,#2E6DA4,#00B4D8)", padding: 22, color: "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 900, fontSize: 18 }}>Dnešní trénink</span><span style={{ background: "rgba(255,255,255,.2)", borderRadius: 999, padding: "4px 10px", fontWeight: 800, fontSize: 13 }}>🔥 6</span></div>
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 16 }}>
                  <svg width="78" height="78" viewBox="0 0 80 80" aria-hidden="true" style={{ flex: "none" }}><circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="10" /><circle cx="40" cy="40" r="32" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeDasharray="80 201" transform="rotate(-90 40 40)" /><text x="40" y="46" textAnchor="middle" fontSize="18" fontWeight="900" fill="#FFFFFF">4/10</text></svg>
                  <div style={{ display: "grid", gap: 7, flex: 1, minWidth: 0 }}>
                    {t.dnes.map((d) => <span key={d} style={{ background: "rgba(255,255,255,.16)", borderRadius: 10, padding: "7px 10px", fontWeight: 700, fontSize: 13 }}>{d}</span>)}
                  </div>
                </div>
              </div>
              <div style={{ padding: "20px 22px 24px" }}><h3>Trénink na míru</h3><p>Každý den sada příkladů podle toho, co ti jde a co ještě ne.</p></div>
            </div>

            {/* 2 Postup po chybě */}
            <div className="u-karta u-ukazka">
              <div className="u-ukazka-obr" style={{ background: "#FFF8EC", padding: 22 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ background: "#FDE2E4", color: "#B42334", fontWeight: 800, fontSize: 13, padding: "4px 10px", borderRadius: 999 }}>✗ {t.chybaOdp}</span><span style={{ fontWeight: 800, fontSize: 14, color: "#7A4A06" }}>Nevadí, jdeme na to:</span></div>
                <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                  {t.kroky.map((k, i) => (
                    <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", background: "#FFFFFF", borderRadius: 12, padding: "9px 12px", boxShadow: "0 1px 3px rgba(122,74,6,.12)" }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5A623", color: "#FFFFFF", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{i + 1}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#33405F" }}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: "20px 22px 24px" }}><h3>Postup po chybě</h3><p>Žádné „špatně, další“. Appka ukáže, kde se to pokazilo, krok za krokem.</p></div>
            </div>

            {/* 3 Rýsování */}
            <div className="u-karta u-ukazka">
              <div className="u-ukazka-obr" style={{ background: "#EEF7EA" }}>
                <svg viewBox="0 0 360 230" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
                  <defs><pattern id="u-mriz" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#D3E8CB" strokeWidth="1" /></pattern></defs>
                  <rect width="360" height="230" fill="url(#u-mriz)" />
                  <circle cx="110" cy="170" r="120" fill="none" stroke="#8BC27A" strokeWidth="1.5" strokeDasharray="5 5" />
                  <path d="M110 170 L250 170 L175 64 Z" fill="rgba(59,122,36,.10)" stroke="#3B7A24" strokeWidth="3" strokeLinejoin="round" />
                  <circle cx="110" cy="170" r="5" fill="#0D1B3E" /><circle cx="250" cy="170" r="5" fill="#0D1B3E" /><circle cx="175" cy="64" r="6" fill="#00B4D8" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="96" y="194" fontSize="15" fontWeight="800" fill="#0D1B3E">A</text><text x="252" y="194" fontSize="15" fontWeight="800" fill="#0D1B3E">B</text><text x="182" y="58" fontSize="15" fontWeight="800" fill="#0D1B3E">C</text>
                  <g transform="translate(250 60) rotate(28)"><rect x="-6" y="0" width="12" height="70" rx="3" fill="#44507A" /><rect x="-3" y="66" width="6" height="16" fill="#9AA3B8" /></g>
                </svg>
                <div style={{ position: "absolute", left: 14, top: 14, display: "flex", gap: 6 }}>
                  <span style={{ background: "#FFFFFF", borderRadius: 10, padding: "6px 10px", fontWeight: 800, fontSize: 12, color: "#3B7A24", boxShadow: "0 1px 3px rgba(0,0,0,.1)" }}>📏 Pravítko</span>
                  <span style={{ background: "#3B7A24", borderRadius: 10, padding: "6px 10px", fontWeight: 800, fontSize: 12, color: "#FFFFFF" }}>⭕ Kružítko</span>
                  <span style={{ background: "#FFFFFF", borderRadius: 10, padding: "6px 10px", fontWeight: 800, fontSize: 12, color: "#3B7A24", boxShadow: "0 1px 3px rgba(0,0,0,.1)" }}>• Bod</span>
                </div>
              </div>
              <div style={{ padding: "20px 22px 24px" }}><h3>Rýsování přímo v appce</h3><p>Pravítko, kružítko a body jako na papíře. Appka zkontroluje, jestli je konstrukce správně.</p></div>
            </div>

            {/* 4 Odhad bodů */}
            <div className="u-karta u-ukazka">
              <div className="u-ukazka-obr" style={{ background: "#0D1B3E", padding: 22, color: "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontWeight: 800, color: "#9FB4DA", fontSize: 14 }}>Odhad bodů u přijímaček</span><span style={{ color: "#4ADE80", fontWeight: 900, fontSize: 14, whiteSpace: "nowrap" }}>▲ +9 za měsíc</span></div>
                <div style={{ fontSize: 40, fontWeight: 900, marginTop: 2 }}>31 <span style={{ fontSize: 18, color: "#9FB4DA" }}>/ 50</span></div>
                <svg viewBox="0 0 320 100" preserveAspectRatio="none" style={{ width: "100%", height: 100, display: "block", marginTop: 4 }} aria-hidden="true">
                  <path d="M0 80 L53 74 L106 70 L160 56 L213 50 L266 36 L320 28 L320 100 L0 100 Z" fill="rgba(0,180,216,.18)" />
                  <path d="M0 80 L53 74 L106 70 L160 56 L213 50 L266 36 L320 28" fill="none" stroke="#00B4D8" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                  <line x1="0" y1="18" x2="320" y2="18" stroke="#FFD166" strokeWidth="1.5" strokeDasharray="5 5" />
                </svg>
              </div>
              <div style={{ padding: "20px 22px 24px" }}><h3>Odhad bodů</h3><p>Kolik bodů z 50 bys dnes asi získal. Vidíš, jak roste, a víš, co dotáhnout.</p></div>
            </div>

            {/* 5 Hexík a truhly */}
            <div className="u-karta u-ukazka">
              <div className="u-ukazka-obr" style={{ background: "radial-gradient(circle at 30% 20%,#5B55D6 0%,#2A1F6E 60%,#1A1446 100%)", padding: "18px 22px", color: "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 900, fontSize: 18 }}>Tvoje truhly</span><span style={{ background: "rgba(255,255,255,.16)", borderRadius: 999, padding: "4px 10px", fontWeight: 800, fontSize: 13 }}>💎 640</span></div>
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  {([["🎁", "Denní", "Otevřít!", "#FFD166", false], ["💠", "Velká", "350 💎", "#C9C7F5", false], ["🏆", "Zlatá", "4 / 5 dní", "#FFD166", true]] as const).map(([ik, n, pod, c, zlata]) => (
                    <div key={n} style={{ flex: 1, background: zlata ? "linear-gradient(160deg,rgba(255,209,102,.35),rgba(255,209,102,.1))" : "rgba(255,255,255,.12)", border: zlata ? "1px solid rgba(255,209,102,.5)" : undefined, borderRadius: 14, padding: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 34 }}>{ik}</div><div style={{ fontWeight: 800, fontSize: 12 }}>{n}</div><div style={{ fontSize: 11, color: c, fontWeight: 800 }}>{pod}</div>
                    </div>
                  ))}
                </div>
                <Hexik podoba={trida === 5 ? "dracek" : "kyber"} etapa={4} style={{ position: "absolute", right: 14, bottom: 6, width: 70, height: 70 }} />
                <span style={{ position: "absolute", left: 22, bottom: 18, fontSize: 13, fontWeight: 700, color: "#C9C7F5" }}>Nová podoba: {trida === 5 ? "Dráček" : "Kyber"} ✨</span>
              </div>
              <div style={{ padding: "20px 22px 24px" }}><h3>Hexík a odměny</h3><p>Za trénink krystaly, za krystaly truhly s novými podobami Hexíka.</p></div>
            </div>

            {/* 6 E-mail rodičům */}
            <div className="u-karta u-ukazka">
              <div className="u-ukazka-obr" style={{ background: "#EAF2FB", padding: "18px 22px" }}>
                <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 8px rgba(13,27,62,.08)" }}>
                  <div style={{ fontSize: 12, color: "#5F6982", fontWeight: 700 }}>Pondělí 8:00 · MateMax</div>
                  <div style={{ fontWeight: 900, fontSize: 15, marginTop: 2 }}>Jak se Ema připravovala tento týden</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12, textAlign: "center" }}>
                    {([["5", "dní", "#C4521A"], ["78 %", "správně", "#17A34A"], ["31", "odhad", "#2E6DA4"]] as const).map(([v, p, c]) => (
                      <div key={p} style={{ background: "#F4F7FC", borderRadius: 10, padding: "8px 4px" }}><div style={{ fontWeight: 900, fontSize: 18, color: c }}>{v}</div><div style={{ fontSize: 11, color: "#5F6982", fontWeight: 700 }}>{p}</div></div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: "#33405F", fontWeight: 600 }}>Dotáhnout: <strong>{t.slabe}</strong></div>
                </div>
              </div>
              <div style={{ padding: "20px 22px 24px" }}><h3>Přehled pro rodiče</h3><p>Každé pondělí e-mail: kolik dítě trénovalo, co mu jde a co dotáhnout. S Premium.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TŘI KROKY ═══ */}
      <section data-sekce="jak-to-funguje" id="jak-to-funguje" className="u-sekce" style={{ background: "#FFFFFF" }}>
        <div className="u-wrap">
          <Hlavicka pill="Jak to funguje" pillStyle={{ background: "#E4EEF7", color: "#2E6DA4" }} nadpis="Tři kroky k lepšímu výsledku" />
          <div className="u-kroky" style={{ marginTop: 48 }}>
            {([
              ["01", "🎯", t.krok1, t.krok1p, t.krok1t, "#BFD7EE", "#F2F8FE", "#2E6DA4"],
              ["02", "🏋️", "Denní trénink", "10 minut denně stačí", "Příklady od lehčích k těžším. Co ti nejde, se vrací, dokud to neumíš. Co už umíš, tě nezdržuje.", "#F9D2B3", "#FFF7F0", "#C4521A"],
              ["03", "📈", "Pokrok a odměny", "Vidíš, jak rosteš", "Odhad bodů, plamínek za dny v řadě a Hexík, který s tebou roste. Rodiče každý týden e-mail.", "#BFE5C9", "#F1FBF4", "#17A34A"],
            ] as const).map(([n, ik, h, p, txt, bd, bg, c], i) => (
              <FragmentKrok key={n} sipka={i > 0}>
                <div style={{ position: "relative", border: `2px solid ${bd}`, background: bg, borderRadius: 22, padding: 28 }}>
                  <span aria-hidden="true" style={{ position: "absolute", top: 14, right: 20, fontSize: 56, fontWeight: 900, color: c, opacity: 0.12 }}>{n}</span>
                  <div style={{ fontSize: 40 }} aria-hidden="true">{ik}</div>
                  <h3 style={{ margin: "12px 0 2px", fontSize: 22, fontWeight: 900 }}>{h}</h3>
                  <p style={{ margin: 0, fontWeight: 800, color: c }}>{p}</p>
                  <p style={{ margin: "10px 0 0", color: "#4A5470" }}>{txt}</p>
                </div>
              </FragmentKrok>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TÉMATA ═══ */}
      <section data-sekce="temata" id="temata" className="u-sekce" style={{ background: "#F4F7FC", scrollMarginTop: 68 }}>
        <div className="u-wrap">
          <Hlavicka pill="Co procvičíš" pillStyle={{ background: "#FCE7EF", color: "#C2366B" }} nadpis={t.temataH} lead={t.temataSub} />
          <div className={trida === 9 ? "u-g3" : "u-g4"} style={{ marginTop: 44 }}>
            {TEMATA[trida].map(([n, b, ic, ex, free]) => {
              const [c, tint] = B[b];
              return (
                <div key={n} className="u-tema" style={{ background: tint }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ width: 48, height: 48, borderRadius: 14, background: c, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ic} /></svg>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 999, ...(free ? { background: "#FFFFFF", color: "#17663A" } : { background: "rgba(255,255,255,.6)", color: "#5F6982" }) }}>{free ? "Zdarma" : "Premium"}</span>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 19, marginTop: 14, color: c }}>{n}</div>
                  <div style={{ marginTop: 10, background: "#FFFFFF", borderRadius: 12, padding: "10px 12px", fontWeight: 700, color: "#33405F", fontSize: 15 }}>{ex}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ HEXÍK A ODMĚNY ═══ */}
      <section data-sekce="hexik" className="u-sekce" style={{ position: "relative", color: "#FFFFFF", background: "radial-gradient(ellipse at 15% 10%,#3B2F9E 0%,transparent 55%),radial-gradient(ellipse at 90% 90%,#0E6E8C 0%,transparent 50%),#0D1B3E" }}>
        <Sym c="✦" style={{ top: "12%", left: "88%", fontSize: 40, opacity: 0.08 }} />
        <Sym c="✦" style={{ top: "74%", left: "6%", fontSize: 34, opacity: 0.08, animationDelay: "1.2s" }} />
        <div className="u-wrap">
          <Hlavicka
            pill="Hexík"
            pillStyle={{ background: "rgba(175,172,251,.18)", color: "#D9D7FF" }}
            nadpis={<>Za snahu odměny.<br /><span style={{ color: "#AFACFB" }}>Hexík roste s tebou.</span></>}
            lead="Za každý správný příklad krystaly. Za krystaly truhly s novými podobami, oslavami a efekty. Nic se nekupuje za peníze, odměny jsou jen za trénink."
            leadStyle={{ color: "#BFCBE6" }}
          />
          <div className="u-g5" style={{ marginTop: 48, alignItems: "end" }}>
            {([[1, "Nováček", "start", 74], [2, "Učeň", "odhad 15 bodů", 88], [3, "Zkušený", "odhad 25 bodů", 102], [4, "Expert", "odhad 35 bodů", 116], [5, "Mistr", "odhad 43 bodů", 132]] as const).map(([e, n, p, w]) => (
              <div key={n} style={{ textAlign: "center" }}>
                <Hexik podoba="klasik" etapa={e} staticky={e !== 5} style={{ width: w, height: w, margin: "0 auto" }} />
                <div style={{ fontWeight: 900, marginTop: 8, color: e === 5 ? "#FFD166" : undefined }}>{n}</div>
                <div style={{ fontSize: 13, color: "#9FB4DA" }}>{p}</div>
              </div>
            ))}
          </div>

          <h3 style={{ margin: "64px 0 18px", fontSize: 22, fontWeight: 900, textAlign: "center" }}>Podoby ze šatníku</h3>
          <div className="u-g6">
            {PODOBY[trida].map(([k, e, n, r]) => {
              const [l, c, bd] = RAR[r];
              return (
                <div key={k} style={{ background: "rgba(255,255,255,.06)", border: `1px solid ${bd}`, borderRadius: 18, padding: "16px 10px", textAlign: "center" }}>
                  <Hexik podoba={k} etapa={e} staticky style={{ width: 86, height: 86, margin: "0 auto" }} />
                  <div style={{ fontWeight: 900, marginTop: 8 }}>{n}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c, textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div>
                </div>
              );
            })}
          </div>

          <h3 style={{ margin: "56px 0 18px", fontSize: 22, fontWeight: 900, textAlign: "center" }}>Pět truhel</h3>
          <div className="u-g5">
            {([
              ["🎁", "Denní", "za dokončený trénink", "rgba(255,255,255,.07)", "rgba(255,255,255,.14)", undefined],
              ["💎", "Krystalová", "100 krystalů", "rgba(255,255,255,.07)", "rgba(255,255,255,.14)", undefined],
              ["💠", "Velká", "350 krystalů", "rgba(255,255,255,.07)", "rgba(255,255,255,.14)", undefined],
              ["🔮", "Mistrovská", "900 krystalů", "rgba(175,172,251,.14)", "rgba(175,172,251,.4)", undefined],
              ["🏆", "Zlatá", "5 dní tréninku v týdnu", "rgba(255,209,102,.14)", "rgba(255,209,102,.45)", "#FFD166"],
            ] as const).map(([ik, n, p, bg, bd, c]) => (
              <div key={n} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 18, padding: 18, textAlign: "center" }}>
                <div style={{ fontSize: 42 }} aria-hidden="true">{ik}</div>
                <div style={{ fontWeight: 900, marginTop: 4, color: c }}>{n}</div>
                <div style={{ fontSize: 13, color: "#BFCBE6" }}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRO RODIČE ═══ */}
      <section data-sekce="pro-rodice" id="rodice" className="u-sekce" style={{ background: "linear-gradient(180deg,#EEF5FD 0%,#FFFFFF 100%)", scrollMarginTop: 68 }}>
        <div className="u-wrap">
          <div className="u-g2">
            <div>
              <span className="u-pill" style={{ background: "#E4EEF7", color: "#2E6DA4" }}>Pro rodiče</span>
              <h2 className="u-h2">Víte, jak se dítě připravuje. Bez zkoušení u večeře.</h2>
              <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
                {([
                  ["📊", "#E4EEF7", "Odhad bodů", "Kolik bodů z 50 by dítě dnes asi získalo a jak se to mění týden po týdnu."],
                  ["🎯", "#FDE9DE", "Přesná slabá místa", `Ne „nějak to jde“, ale konkrétně: ${t.slabePriklad}`],
                  ["✉️", "#E8F4DF", "E-mail každé pondělí", "Kolik dní dítě trénovalo, co mu jde a co dotáhnout. S Premium."],
                ] as const).map(([ik, bg, h, p]) => (
                  <div key={h} className="u-karta" style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flex: "none" }}>{ik}</span>
                    <div><div style={{ fontWeight: 900, fontSize: 18 }}>{h}</div><div style={{ color: "#5F6982" }}>{p}</div></div>
                  </div>
                ))}
              </div>
              <Link href="/rodice/prihlaseni" style={{ display: "inline-block", marginTop: 18, color: "#2E6DA4", fontWeight: 800 }}>Rodičovský přehled →</Link>
            </div>

            <div style={{ borderRadius: 26, padding: 32, color: "#FFFFFF", background: "linear-gradient(150deg,#0D1B3E 0%,#1A2F7A 55%,#2E6DA4 100%)", position: "relative", overflow: "hidden" }}>
              <span aria-hidden="true" style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(0,180,216,.18)" }} />
              <span className="u-pill" style={{ background: "rgba(255,209,102,.18)", color: "#FFD166", position: "relative" }}>Testy nanečisto</span>
              <h3 style={{ margin: "16px 0 0", fontSize: 30, lineHeight: 1.15, fontWeight: 900, position: "relative" }}>Vyzkoušej si přijímačky naostro</h3>
              <p style={{ margin: "12px 0 0", color: "#CFE3F7", fontSize: 17, position: "relative" }}>Stejné podmínky jako u skutečného testu: {t.format} V Gymnáziu Týn nad Vltavou, s vyhodnocením a doporučením, co dotáhnout.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20, position: "relative" }}>
                {TERMINY.map((d, i) => (
                  <span key={d} style={i === 0 ? { background: "#FFD166", color: "#0D1B3E", fontWeight: 900, padding: "8px 12px", borderRadius: 12 } : { background: "rgba(255,255,255,.12)", fontWeight: 800, padding: "8px 12px", borderRadius: 12 }}>{d}</span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 26, flexWrap: "wrap", position: "relative" }}>
                <span style={{ fontSize: 15, color: "#CFE3F7" }}>Soboty 10:00–11:45 · <strong style={{ color: "#FFFFFF" }}>250 Kč</strong></span>
                <a className="u-tl" href={TESTY_NANECISTO} target="_blank" rel="noopener" style={{ background: "#FFD166", color: "#0D1B3E" }}>Vybrat termín →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ KDO ZA TÍM STOJÍ ═══ */}
      <section data-sekce="autor" className="u-sekce" style={{ background: "#FFFFFF", paddingTop: 88, paddingBottom: 88 }}>
        <div className="u-wrap">
          <div className="u-karta u-autor" style={{ padding: 40, display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 36, alignItems: "center", background: "linear-gradient(120deg,#F7F7FF,#EEF5FD)" }}>
            <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true" style={{ display: "block" }}><polygon points="75,6 135,40 135,110 75,144 15,110 15,40" fill="#AFACFB" /><polygon points="75,20 122,47 122,103 75,130 28,103 28,47" fill="#0D1B3E" /><text x="75" y="88" textAnchor="middle" fontSize="38" fontWeight="900" fill="#FFFFFF">KT</text></svg>
            <div>
              <span className="u-pill" style={{ background: "#EBEAFE", color: "#5B55D6" }}>Kdo za tím stojí</span>
              <h2 style={{ margin: "12px 0 0", fontSize: 32, fontWeight: 900 }}>Ing. Karel Tůma</h2>
              <p style={{ margin: "8px 0 0", fontSize: 18, color: "#4A5470", maxWidth: 720 }}>Na přijímačky z matematiky připravuju žáky 10 let, od roku 2017, v Týně nad Vltavou. MateMax je moje příprava převedená do appky, úlohy skládám podle skutečných testů CERMAT.</p>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 22 }}>
                <div><div style={{ fontSize: 30, fontWeight: 900, color: "#17A34A" }}>25 z 25</div><div style={{ fontSize: 14, color: "#5F6982", fontWeight: 600 }}>přijato loni (5/5 páťáků, 20/20 deváťáků)</div></div>
                <div><div style={{ fontSize: 30, fontWeight: 900, color: "#2E6DA4" }}>200+</div><div style={{ fontSize: 14, color: "#5F6982", fontWeight: 600 }}>žáků</div></div>
                <div><div style={{ fontSize: 30, fontWeight: 900, color: "#8E3FA8" }}>10 let</div><div style={{ fontSize: 14, color: "#5F6982", fontWeight: 600 }}>praxe</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SROVNÁNÍ ═══ */}
      <section data-sekce="srovnani" className="u-sekce" style={{ background: "#F4F7FC", paddingTop: 88, paddingBottom: 88 }}>
        <div className="u-wrap" style={{ maxWidth: 860 }}>
          <Hlavicka pill="Srovnání" pillStyle={{ background: "#E4EEF7", color: "#2E6DA4" }} nadpis="MateMax, doučování, nebo sešit?" lead="Nejlíp fungují spolu. Tady je, v čem je který silný." />
          <div className="u-karta" style={{ marginTop: 36, overflow: "hidden" }}>
            <table className="u-tab">
              <thead><tr style={{ background: "#0D1B3E", color: "#FFFFFF" }}><th style={{ border: 0 }}><span className="sr-only">Vlastnost</span></th><th style={{ border: 0, color: "#7FE3F5" }}>MateMax</th><th style={{ border: 0, color: "#BFCBE6" }}>Doučování</th><th style={{ border: 0, color: "#BFCBE6" }}>Sešit</th></tr></thead>
              <tbody>
                {([
                  ["Přizpůsobí se žákovi", true, true, false],
                  ["Kdykoli, i na mobilu", true, false, true],
                  ["Okamžitá kontrola a postup", true, true, false],
                  ["Týdenní přehled pro rodiče", true, false, false],
                  ["Odměny a motivace", true, false, false],
                ] as const).map(([l, ...h]) => (
                  <tr key={l}><td>{l}</td>{h.map((v, j) => <td key={j}>{v ? <span className="u-ano" aria-label="ano">✓</span> : <span className="u-ne" aria-label="ne">✗</span>}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ CENA ═══ */}
      <section data-sekce="cenik" id="cena" className="u-sekce" style={{ background: "#FFFFFF", scrollMarginTop: 68 }}>
        <div className="u-wrap" style={{ maxWidth: 940 }}>
          <Hlavicka pill="Cena" pillStyle={{ background: "#E0F5FB", color: "#0A7C99" }} nadpis="Začni zdarma, Premium kdykoli" lead="Premium jde kdykoli zrušit. Žádné skryté poplatky." />
          <div className="u-g2" style={{ marginTop: 44, gap: 24, alignItems: "stretch" }}>
            <div style={{ border: "2px solid #E1E4EE", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>Zdarma</div>
              <div style={{ fontSize: 44, fontWeight: 900, marginTop: 4 }}>0 Kč</div>
              <ul style={{ margin: "20px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10, color: "#33405F", flex: 1, alignContent: "start" }}>
                {t.zdarma.map((z) => <li key={z}>✓ {z}</li>)}
              </ul>
              <Link className="u-tl" href="/registrace" style={{ marginTop: 28, width: "100%", border: "2px solid #2E6DA4", color: "#2E6DA4" }}>Začít zdarma</Link>
            </div>
            <div style={{ border: "2px solid #00B4D8", borderRadius: 24, padding: 32, position: "relative", boxShadow: "0 24px 48px rgba(0,180,216,.16)", display: "flex", flexDirection: "column" }}>
              <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#00B4D8", color: "#FFFFFF", fontWeight: 800, fontSize: 13, padding: "5px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>Plná příprava</span>
              <div style={{ fontWeight: 900, fontSize: 20 }}>Premium</div>
              <div style={{ fontSize: 44, fontWeight: 900, marginTop: 4 }}>99 Kč <span style={{ fontSize: 17, color: "#5F6982", fontWeight: 700 }}>/ měsíc</span></div>
              <ul style={{ margin: "20px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10, color: "#33405F", flex: 1, alignContent: "start" }}>
                {t.premium.map((z) => <li key={z}>✓ {z}</li>)}
              </ul>
              <Link className="u-tl" href="/registrace" style={{ marginTop: 28, width: "100%", background: "#2E6DA4", color: "#FFFFFF" }}>Vyzkoušet Premium</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ OTÁZKY ═══ */}
      <section data-sekce="otazky" className="u-sekce" style={{ background: "#F4F7FC", paddingTop: 88, paddingBottom: 88 }}>
        <div className="u-wrap" style={{ maxWidth: 780 }}>
          <Hlavicka pill="Otázky" pillStyle={{ background: "#E4EEF7", color: "#2E6DA4" }} nadpis="Na co se rodiče ptají" />
          <div style={{ display: "grid", gap: 12, marginTop: 36 }}>
            {([
              ["Pro koho je MateMax?", "Pro deváťáky před přijímačkami na střední školu a pro páťáky před přijímačkami na víceleté gymnázium. Každý vidí jen úlohy pro svou třídu."],
              ["Kolik času denně to zabere?", "Stačí 10 minut. Pravidelnost je důležitější než dlouhé sezení jednou za týden."],
              ["Co když dítě udělá chybu?", "Appka ukáže postup krok za krokem a úlohu tohoto typu později zopakuje, dokud ji dítě neumí."],
              ["Odměny? Nebude to jen hra?", "Krystaly jsou jen za správně vyřešené příklady, za rychlé klikání bez přemýšlení nejsou. Nic se nekupuje za peníze."],
              ["Musím zadávat kartu?", "Ne. Účet zdarma je bez karty. Premium si zapnete, až budete chtít."],
              ["Jak to souvisí s testy nanečisto?", "Test nanečisto ukáže, jak na tom dítě je v reálných podmínkách. MateMax pak pomáhá trénovat přesně to, co v testu nešlo."],
            ] as const).map(([q, a]) => (
              <details key={q} className="u-faq"><summary><span>{q}</span><span aria-hidden="true">+</span></summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ZÁVĚR ═══ */}
      <section data-sekce="zaver" className="u-hero-bg u-sekce" style={{ position: "relative", color: "#FFFFFF", textAlign: "center" }}>
        <Sym c="π" style={{ top: "16%", left: "8%", fontSize: 40, opacity: 0.1 }} />
        <Sym c="√" style={{ top: "70%", left: "88%", fontSize: 40, opacity: 0.1, animationDelay: "1s" }} />
        <div className="u-wrap" style={{ position: "relative" }}>
          <Hexik podoba="klasik" etapa={5} style={{ width: 140, height: 140, margin: "0 auto", filter: "drop-shadow(0 14px 22px rgba(0,0,0,.35))" }} />
          <h2 className="u-h2" style={{ marginTop: 18 }}>Přijímačky jsou za rohem.<br /><span style={{ color: "#7FE3F5" }}>Začni dnes.</span></h2>
          <p className="u-lead" style={{ color: "#D6E8FA" }}>Přijímačky 2027: {t.termin} Deset minut denně do té doby udělá velký rozdíl.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
            <Link className="u-tl" href={start} style={{ background: "#00B4D8", color: "#FFFFFF", boxShadow: "0 10px 24px rgba(0,180,216,.35)" }}>{startText}</Link>
            <a className="u-tl" href="#zkus" style={{ background: "rgba(255,255,255,.12)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,.28)" }}>Zkusit příklad</a>
          </div>
          <p style={{ margin: "16px 0 0", fontSize: 14, color: "#BFD9F2" }}>Bez karty · Premium kdykoli zrušíš</p>
        </div>
      </section>
      <footer style={{ padding: "22px 0", color: "#5F6982", fontSize: 14, textAlign: "center", background: "#FFFFFF" }}>MateMax · Matematika Snadno · Ing. Karel Tůma</footer>
    </div>
  );
}

function FragmentKrok({ sipka, children }: { sipka: boolean; children: ReactNode }) {
  return (
    <>
      {sipka && <Sipka />}
      {children}
    </>
  );
}
