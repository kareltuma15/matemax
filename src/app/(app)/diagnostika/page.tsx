"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { examples } from "@/data/examples";
import { createCard } from "@/lib/sm2";
import { SM2Card, DBExample } from "@/types";
import { supabase } from "@/lib/supabase";
import { remoteSyncDiagResults } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";
import MoznostiCard from "@/components/MoznostiCard";

const CARDS_KEY = "matemax-cards";
const SEED_PER_WEAK_TOPIC = 10; // kolik nejlehčích karet přidáme pro každé slabé téma

function seedCardsFromDiag(results: Record<string, { correct: number; total: number }>) {
  let cards: SM2Card[] = [];
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    if (raw) cards = JSON.parse(raw) as SM2Card[];
  } catch { /* ignore */ }

  const existingIds = new Set(cards.map((c) => c.exampleId));
  const newCards: SM2Card[] = [];

  for (const [tema, { correct, total }] of Object.entries(results)) {
    const score = total > 0 ? correct / total : 1;
    if (score < 0.67) {
      // Slabé téma — přidej nejlehčí příklady s nextReview = teď (interval 1)
      const temaExamples = examples
        .filter((e) => e.tema === tema && !existingIds.has(e.id))
        .sort((a, b) => a.obtiznost - b.obtiznost)
        .slice(0, SEED_PER_WEAK_TOPIC);

      for (const ex of temaExamples) {
        const card = createCard(ex.id);
        // nextReview = teď → zobrazí se ihned v prvním tréninku
        newCards.push({ ...card, nextReview: Date.now() });
        existingIds.add(ex.id);
      }
    }
  }

  if (newCards.length > 0) {
    localStorage.setItem(CARDS_KEY, JSON.stringify([...cards, ...newCards]));
  }
}

// 8 CERMAT témat — žádné "Různé", žádné nerovnice ani pravděpodobnost
const STEPS: { label: string; tema: string }[] = [
  { label: "Zlomky",       tema: "zlomky" },
  { label: "Výrazy",       tema: "vyrazy" },
  { label: "Rovnice",      tema: "rovnice" },
  { label: "Geometrie",    tema: "geometrie" },
  { label: "Slovní úlohy", tema: "slovni_ulohy" },
  { label: "Grafy a logika", tema: "grafy_logika" },
  { label: "Konstrukce",   tema: "konstrukce" },
  { label: "Úhly",         tema: "uhly" },
];

const QUESTIONS_PER_STEP = 2;

/**
 * 16 diagnostických otázek (2 na téma) — napojené na stejnou kartu jako trénink
 * (MoznostiCard), takže dostávají KaTeX i obrázky ZDARMA místo vlastního
 * odděleného renderu. Viz docs/DIAGNOSTIKA_REVIZE.md pro historii nálezů:
 * - Q1/Q2 (zlomky): přepsáno do KaTeX (dřív plochý text „5/12").
 * - Q7/Q8/Q11: doplněn obrázek (pravoúhlý trojúhelník, kvádr, koláč se skrytým %).
 * - Q15/Q16 (úhly): dřív čistě slovní/pojmové — nahrazeno obrázkovým diagramem
 *   a u Q16 přepsáno z definiční otázky na výpočet z obrázku.
 * - Q12: číselná posloupnost nahrazena reálným CERMAT grafem (sloupcový graf) —
 *   CERMAT „grafy" jsou koláč/sloupce, ne číselné řady.
 * Ostatní otázky (Q3–Q6, Q9–Q10, Q13–Q14) mají beze změny původní zadání/možnosti,
 * jen zabalené do DBExample tvaru; Q13/Q14 mají obrázek přesunutý z inline JSX
 * do public/obrazky/konstrukce/ (stejná ilustrace, jen jako soubor).
 */
const QUESTIONS: DBExample[] = [
  // ── Krok 1: Zlomky ──────────────────────────────────────────────────────────
  {
    id: "diag_1", tema: "zlomky", podtema: "scitani_odcitani", obtiznost: 1,
    latex: true,
    zadani: "Vypočítej: $\\frac{3}{4} - \\frac{1}{3}$",
    moznosti: ["$\\frac{5}{12}$", "$\\frac{4}{12}$", "$\\frac{1}{4}$", "$\\frac{7}{12}$"],
    spravna: 0, odpoved: "5/12",
    reseni_kroky: [
      "Společný jmenovatel je 12: $\\frac{3}{4} = \\frac{9}{12}$ a $\\frac{1}{3} = \\frac{4}{12}$.",
      "Odečteme čitatele: $9 - 4 = 5$.",
      "Výsledek: $\\frac{5}{12}$.",
    ],
    cas_sekund: 60, sm2_interval: 1,
  },
  {
    id: "diag_2", tema: "zlomky", podtema: "zkracovani", obtiznost: 1,
    latex: true,
    zadani: "Vyjádři zlomek $\\frac{18}{24}$ v základním tvaru.",
    moznosti: ["$\\frac{9}{12}$", "$\\frac{6}{8}$", "$\\frac{3}{4}$", "$\\frac{2}{3}$"],
    spravna: 2, odpoved: "3/4",
    reseni_kroky: [
      "Největší společný dělitel čísel 18 a 24 je 6.",
      "Vydělíme čitatele i jmenovatele šesti: $18 \\div 6 = 3$, $24 \\div 6 = 4$.",
      "Základní tvar: $\\frac{3}{4}$.",
    ],
    cas_sekund: 60, sm2_interval: 1,
  },
  // ── Krok 2: Výrazy ──────────────────────────────────────────────────────────
  {
    id: "diag_3", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 2,
    zadani: "Roznásob závorku: (x + 3)²",
    moznosti: ["x² + 9", "x² + 6x + 9", "x² + 3x + 9", "x² − 6x + 9"],
    spravna: 1, odpoved: "x² + 6x + 9",
    reseni_kroky: ["Vzorec: (a+b)² = a² + 2ab + b².", "Dosadíme a=x, b=3: x² + 2·x·3 + 3².", "Výsledek: x² + 6x + 9."],
    cas_sekund: 60, sm2_interval: 1,
  },
  {
    id: "diag_4", tema: "vyrazy", podtema: "roznasobeni", obtiznost: 2,
    zadani: "Rozlož na součin: a² − 16",
    moznosti: ["(a − 4)²", "a(a − 16)", "(a + 4)²", "(a − 4)(a + 4)"],
    spravna: 3, odpoved: "(a − 4)(a + 4)",
    reseni_kroky: ["Jde o rozdíl čtverců: a² − b² = (a−b)(a+b).", "Zde b² = 16, tedy b = 4.", "Výsledek: (a−4)(a+4)."],
    cas_sekund: 60, sm2_interval: 1,
  },
  // ── Krok 3: Rovnice ─────────────────────────────────────────────────────────
  {
    id: "diag_5", tema: "rovnice", podtema: "linearni", obtiznost: 1,
    zadani: "Vyřeš: 4x − 6 = 2x + 8",
    moznosti: ["x = 7", "x = 4", "x = 3", "x = 1"],
    spravna: 0, odpoved: "x = 7",
    reseni_kroky: ["Převedeme neznámé na jednu stranu: 4x − 2x = 8 + 6.", "2x = 14.", "x = 7."],
    cas_sekund: 60, sm2_interval: 1,
  },
  {
    id: "diag_6", tema: "rovnice", podtema: "soustava", obtiznost: 2,
    zadani: "Vyřeš soustavu rovnic: x + y = 10,  x − y = 4",
    moznosti: ["x = 3, y = 7", "x = 4, y = 6", "x = 7, y = 3", "x = 6, y = 4"],
    spravna: 2, odpoved: "x = 7, y = 3",
    reseni_kroky: ["Sečteme obě rovnice: 2x = 14.", "x = 7.", "Dosadíme do první rovnice: 7 + y = 10 → y = 3."],
    cas_sekund: 60, sm2_interval: 1,
  },
  // ── Krok 4: Geometrie (s obrázkem) ──────────────────────────────────────────
  {
    id: "diag_7", tema: "geometrie", podtema: "pythagorova_veta", obtiznost: 1,
    latex: true,
    image: { kind: "parametric", diagram: { typ: "trojuhelnik", alfa: 90, strany: { b: "6 cm", c: "8 cm" } } },
    zadani: "Pravoúhlý trojúhelník má odvěsny 6 cm a 8 cm. Jaká je délka přepony?",
    moznosti: ["7 cm", "10 cm", "12 cm", "14 cm"],
    spravna: 1, odpoved: "10 cm",
    reseni_kroky: [
      "Pythagorova věta: $c^2 = a^2 + b^2$.",
      "$c^2 = 6^2 + 8^2 = 36 + 64 = 100$.",
      "$c = \\sqrt{100} = 10$ cm.",
    ],
    cas_sekund: 75, sm2_interval: 1,
  },
  {
    id: "diag_8", tema: "geometrie", podtema: "prostorova", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "teleso", tvar: "kvadr", a: "4 cm", b: "3 cm", c: "5 cm" } },
    zadani: "Objem kvádru o rozměrech 4 cm × 3 cm × 5 cm:",
    moznosti: ["24 cm³", "47 cm³", "94 cm³", "60 cm³"],
    spravna: 3, odpoved: "60 cm³",
    reseni_kroky: ["Objem kvádru = a · b · c.", "V = 4 · 3 · 5.", "V = 60 cm³."],
    cas_sekund: 75, sm2_interval: 1,
  },
  // ── Krok 5: Slovní úlohy ────────────────────────────────────────────────────
  {
    id: "diag_9", tema: "slovni_ulohy", podtema: "pohyb", obtiznost: 1,
    zadani: "Vlak jede rychlostí 90 km/h. Za jak dlouho ujede 270 km?",
    moznosti: ["2 hod", "2,5 hod", "3 hod", "4 hod"],
    spravna: 2, odpoved: "3 hod",
    reseni_kroky: ["t = dráha ÷ rychlost.", "t = 270 ÷ 90.", "t = 3 hodiny."],
    cas_sekund: 60, sm2_interval: 1,
  },
  {
    id: "diag_10", tema: "slovni_ulohy", podtema: "spolecna_prace", obtiznost: 2,
    zadani: "Pracovník A zvládne práci za 6 hod, pracovník B za 4 hod. Za jak dlouho ji zvládnou společně?",
    moznosti: ["2,4 hod", "5 hod", "3 hod", "2 hod"],
    spravna: 0, odpoved: "2,4 hod",
    reseni_kroky: ["Za hodinu udělají 1/6 + 1/4 práce.", "1/6 + 1/4 = 2/12 + 3/12 = 5/12.", "Celou práci zvládnou za 12/5 = 2,4 hodiny."],
    cas_sekund: 75, sm2_interval: 1,
  },
  // ── Krok 6: Grafy a logika (s obrázkem, reálné CERMAT grafy) ────────────────
  {
    id: "diag_11", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 1,
    image: {
      kind: "parametric",
      diagram: { typ: "kolac", nazev: "Rozdělení grafu", casti: [
        { label: "hledaná část", procenta: 20, skryta: true },
        { label: "ostatní", procenta: 80 },
      ] },
    },
    zadani: "V koláčovém grafu jedno pole zaujímá 72°. Kolik procent celku představuje?",
    moznosti: ["25 %", "33 %", "15 %", "20 %"],
    spravna: 3, odpoved: "20 %",
    reseni_kroky: ["Celý kruh má 360°.", "Podíl = 72° ÷ 360°.", "= 0,2 = 20 %."],
    cas_sekund: 75, sm2_interval: 1,
  },
  {
    // Q12 nahrazeno: dřív číselná posloupnost (Karel: CERMAT „grafy" = koláč/sloupce,
    // ne číselné řady). Teď sloupcový graf — druhý reálný formát vedle koláče v Q11.
    id: "diag_12", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 1,
    image: {
      kind: "parametric",
      diagram: {
        typ: "sloupce", nazev: "Prodej zmrzliny", jednotka: "ks",
        sloupce: [
          { label: "Po", hodnota: 20 }, { label: "Út", hodnota: 35 }, { label: "St", hodnota: 15 },
          { label: "Čt", hodnota: 40 }, { label: "Pá", hodnota: 30 },
        ],
      },
    },
    zadani: "Graf ukazuje prodej zmrzliny v jednotlivých dnech. Kolik kusů se prodalo ve čtvrtek?",
    moznosti: ["20 ks", "30 ks", "35 ks", "40 ks"],
    spravna: 3, odpoved: "40 ks",
    reseni_kroky: ["Najdi sloupec pro čtvrtek (Čt).", "Jeho výška odpovídá hodnotě 40.", "Ve čtvrtek se prodalo 40 kusů."],
    cas_sekund: 75, sm2_interval: 1,
  },
  // ── Krok 7: Konstrukční úlohy (s obrázkem) ──────────────────────────────────
  {
    id: "diag_13", tema: "konstrukce", podtema: "osa_usecky", obtiznost: 1,
    image: { kind: "static", url: "/obrazky/konstrukce/usecka-ab.svg", width: 240, height: 68, alt: "Úsečka AB s krajními body A a B" },
    zadani: "Chceš sestrojit osu úsečky AB. Jaký je PRVNÍ krok?",
    moznosti: [
      "Narýsuj kružnici se středem A procházející bodem B",
      "Přilož pravítko a nakresli přímku AB",
      "Naměř délku AB a vyznač její střed pravítkem",
      "Narýsuj kolmici v bodě A na úsečku AB",
    ],
    spravna: 0, odpoved: "Narýsuj kružnici se středem A procházející bodem B",
    reseni_kroky: ["Osu úsečky sestrojíme jako množinu bodů stejně vzdálených od A i B.", "Nejdřív narýsujeme kružnici se středem A procházející B.", "Pak kružnici se středem B procházející A — jejich průsečíky určují osu."],
    cas_sekund: 60, sm2_interval: 1,
  },
  {
    id: "diag_14", tema: "konstrukce", podtema: "trojuhelnik_sss", obtiznost: 2,
    image: { kind: "static", url: "/obrazky/konstrukce/tri-strany.svg", width: 260, height: 96, alt: "Tři úsečky délek 4 cm, 6 cm a 11 cm" },
    zadani: "Lze sestrojit trojúhelník se stranami 4 cm, 6 cm a 11 cm?",
    moznosti: [
      "Ano, vždy lze",
      "Ano, ale pouze jako tupouhlý",
      "Ne, trojúhelník nelze sestrojit",
      "Záleží na pořadí zadaných stran",
    ],
    spravna: 2, odpoved: "Ne, trojúhelník nelze sestrojit",
    reseni_kroky: ["Trojúhelníková nerovnost: součet dvou stran musí být větší než třetí strana.", "4 + 6 = 10, což je méně než 11.", "Nerovnost není splněna → trojúhelník nelze sestrojit."],
    cas_sekund: 75, sm2_interval: 1,
  },
  // ── Krok 8: Úhly (s obrázkem) ────────────────────────────────────────────────
  {
    id: "diag_15", tema: "uhly", podtema: "vnitrni_uhly", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "trojuhelnik", alfa: 55, beta: 75, hledany: "gama" } },
    zadani: "V trojúhelníku jsou dva vnitřní úhly 55° a 75°. Jak velký je třetí vnitřní úhel?",
    moznosti: ["40°", "60°", "45°", "50°"],
    spravna: 3, odpoved: "50°",
    reseni_kroky: ["Součet vnitřních úhlů trojúhelníku je 180°.", "Třetí úhel = 180° − 55° − 75°.", "= 50°."],
    cas_sekund: 60, sm2_interval: 1,
  },
  {
    // Q16 přepsáno: dřív čistě pojmová/definiční otázka bez obrázku (nešlo ji
    // vůbec zobrazit). Teď výpočet ze skutečného diagramu — stejná znalost
    // (střídavé úhly jsou shodné), ale ověřená na konkrétním čísle.
    id: "diag_16", tema: "uhly", podtema: "rovnobezky", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "uhel_pricka", danyUhel: 70, hledany: "stridavy" } },
    zadani: "Přímky p a q jsou rovnoběžné a protíná je příčka. Urči velikost vyznačeného úhlu (?).",
    moznosti: ["70°", "110°", "20°", "160°"],
    spravna: 0, odpoved: "70°",
    reseni_kroky: ["Vyznačený úhel je střídavý k danému úhlu 70°.", "Střídavé úhly u rovnoběžek proťatých příčkou jsou shodné.", "Hledaný úhel má 70°."],
    cas_sekund: 60, sm2_interval: 1,
  },
];

export default function DiagnostikaPage() {
  const router = useRouter();
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<Record<string, { correct: number; total: number }>>({});
  const [finished, setFinished] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("matemax-diag-done") === "1") setAlreadyDone(true);
  }, []);

  const stepIdx = Math.floor(currentIdx / QUESTIONS_PER_STEP);
  const current = QUESTIONS[currentIdx];

  function finalize(finalResults: Record<string, { correct: number; total: number }>) {
    localStorage.setItem("matemax-diag-results", JSON.stringify(finalResults));
    localStorage.setItem("matemax-diag-done", "1");

    // Sync to Supabase + Loops if logged in (fire-and-forget)
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const uid = data.session.user.id;
          const token = data.session.access_token;
          remoteSyncDiagResults(uid, finalResults).catch(() => {});
          const weakCount = Object.values(finalResults).filter(v => v.total > 0 && v.correct / v.total < 0.67).length;
          trackEvent(uid, "diagnostika_dokoncena", { weak_topics: weakCount }).catch(() => {});
          // Notify Loops so D+1/D+3/D+7 automations can branch on diagDone
          fetch("/api/loops-event", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ event: "diag_completed" }),
          }).catch(() => {});
        }
      });
    }

    // Seed SM-2 karty: pro slabá témata (< 67 %) vytvoř karty s okamžitou prioritou
    seedCardsFromDiag(finalResults);

    setFinished(true);
    setShowPlanModal(true);
    setTimeout(() => import("canvas-confetti").then(({ default: c }) => c({ particleCount: 100, spread: 70, origin: { y: 0.5 } })), 150);
  }

  function handleResult(correct: boolean) {
    const tema = current.tema;
    const prev = results[tema] ?? { correct: 0, total: 0 };
    const nextResults = { ...results, [tema]: { correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 } };
    setResults(nextResults);

    if (currentIdx + 1 >= QUESTIONS.length) {
      finalize(nextResults);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  if (alreadyDone && !finished) {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center flex flex-col gap-4">
          <span className="text-4xl">✅</span>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Diagnostiku jsi již absolvoval
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Výsledky jsou uloženy a trénink je přizpůsoben tvým mezerám.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Link
              href="/trenink"
              className="w-full py-3 text-white font-semibold rounded-xl text-base text-center"
              style={{ background: "#0D1B3E" }}
            >
              Pokračovat v tréninku →
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("matemax-diag-done");
                localStorage.removeItem("matemax-diag-results");
                setAlreadyDone(false);
              }}
              className="w-full py-2.5 text-slate-600 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
            >
              🔄 Opakovat diagnostiku
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <>
        {showPlanModal && <DiagPlanModal onStart={() => { setShowPlanModal(false); router.push("/trenink"); }} onClose={() => setShowPlanModal(false)} />}
        <DiagResults onStart={() => router.push("/trenink")} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Vstupní diagnostický test
        </h2>
        <p className="text-sm text-slate-500">Zjistíme, kde potřebuješ nejvíce procvičit.</p>
      </div>

      {/* Step indicator — viditelný progress bar (8 kroků po 2 otázkách) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-4 rounded-full transition-all duration-400"
              style={{
                background:
                  i < stepIdx ? "#2E6DA4" :
                  i === stepIdx ? "#2563eb" :
                  "#e2e8f0",
                boxShadow: i === stepIdx ? "0 0 0 3px rgba(37,99,235,0.25)" : "none",
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold" style={{ color: "#2E6DA4" }}>
            Krok {stepIdx + 1} z {STEPS.length}
          </span>
          <span className="font-semibold text-slate-600">
            {STEPS[stepIdx].label}
          </span>
        </div>
        {/* Step labels below bars */}
        <div className="hidden sm:flex gap-1.5">
          {STEPS.map((step, i) => (
            <div key={i} className="flex-1 text-center">
              <span
                className="text-xs leading-tight"
                style={{ color: i === stepIdx ? "#2E6DA4" : "#94a3b8", fontWeight: i === stepIdx ? 600 : 400 }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Otázka — stejná karta jako v tréninku (KaTeX + obrázky zdarma) */}
      <MoznostiCard
        key={current.id}
        example={current}
        cardNumber={currentIdx + 1}
        total={QUESTIONS.length}
        onResult={handleResult}
      />
    </div>
  );
}

// ── DiagPlanModal — aha-moment po dokončení diagnostiky ──────────────────────

function DiagPlanModal({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  let results: Record<string, { correct: number; total: number }> = {};
  try {
    const raw = localStorage.getItem("matemax-diag-results");
    if (raw) results = JSON.parse(raw);
  } catch { /* ignore */ }

  const rows = Object.entries(results)
    .filter(([, v]) => v.total > 0)
    .map(([tema, v]) => ({
      label: RESULT_LABELS[tema] ?? tema,
      pct: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);

  const totalCorrect = Object.values(results).reduce((s, v) => s + v.correct, 0);
  const totalQ       = Object.values(results).reduce((s, v) => s + v.total, 0);
  const overall      = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  const weakCount = rows.filter((r) => r.pct < 67).length;
  const focus = rows.slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-7 text-center"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-5xl mb-3">🎯</p>
          <h2 className="text-xl font-black text-white">Tvůj plán je připraven!</h2>
          <p className="text-sm text-blue-200 mt-1">
            Celková úspěšnost: <strong className="text-white">{overall} %</strong>
            {weakCount > 0 && ` · ${weakCount} ${weakCount === 1 ? "téma" : weakCount <= 4 ? "témata" : "témat"} k procvičení`}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {focus.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Začni těmito tématy</p>
              {focus.map(({ label, pct }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl px-4 py-3 border"
                  style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
                >
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: pct < 50 ? "#fef2f2" : "#fff7ed", color: pct < 50 ? "#991b1b" : "#92400e" }}
                  >
                    {pct} %
                  </span>
                </div>
              ))}
            </div>
          )}

          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
          >
            <p className="text-xs text-green-700 font-medium">
              ✅ MateMax sestavil tréninkový plán přesně pro tebe. Algoritmus se zaměří na slabá místa jako první.
            </p>
          </div>

          <button
            onClick={onStart}
            className="w-full py-3.5 text-white font-black rounded-xl text-base"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            Spustit první trénink →
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
          >
            Zobrazit detailní výsledky
          </button>
        </div>
      </div>
    </div>
  );
}

// Human-readable labels for all temas that may appear in results
const RESULT_LABELS: Record<string, string> = {
  zlomky:       "Zlomky",
  vyrazy:       "Výrazy",
  rovnice:      "Rovnice",
  geometrie:    "Geometrie",
  slovni_ulohy: "Slovní úlohy",
  grafy_logika: "Grafy a logika",
  konstrukce:   "Konstrukční úlohy",
  uhly:         "Úhly",
};

function DiagResults({ onStart }: { onStart: () => void }) {
  let results: Record<string, { correct: number; total: number }> = {};
  try {
    const raw = localStorage.getItem("matemax-diag-results");
    if (raw) results = JSON.parse(raw);
  } catch { /* ignore */ }

  const rows = Object.entries(results)
    .filter(([, v]) => v.total > 0)
    .map(([tema, v]) => ({
      tema,
      label: RESULT_LABELS[tema] ?? tema,
      pct: Math.round((v.correct / v.total) * 100),
      correct: v.correct,
      total: v.total,
    }))
    .sort((a, b) => a.pct - b.pct); // nejslabší první

  const procvicit = rows.filter((r) => r.pct < 50);
  const posilit   = rows.filter((r) => r.pct >= 50 && r.pct < 80);
  const zvladas   = rows.filter((r) => r.pct >= 80);

  const topWeakest = procvicit[0] ?? posilit[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Tvoje mapa mezer</h2>
        <p className="text-sm text-slate-500">Výsledky diagnostického testu</p>
      </div>

      {/* Procvičit — slabá místa */}
      {procvicit.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "#dc2626" }}>
            🔴 Procvičit — tady máš mezery
          </p>
          {procvicit.map((row) => (
            <div
              key={row.tema}
              className="rounded-xl p-4 flex items-center justify-between gap-3"
              style={{ background: "#fef2f2", border: "1.5px solid #fecaca" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "#991b1b" }}>{row.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#dc2626" }}>
                  {row.correct} z {row.total} správně · {row.pct} %
                </p>
              </div>
              <button
                onClick={onStart}
                className="shrink-0 text-xs font-black px-3 py-2 rounded-lg text-white"
                style={{ background: "#dc2626" }}
              >
                Procvičit →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Posílit — střed */}
      {posilit.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "#d97706" }}>
            🟡 Posílit — jde to, ale dá se zlepšit
          </p>
          {posilit.map((row) => (
            <div
              key={row.tema}
              className="rounded-xl p-3 flex items-center justify-between gap-3"
              style={{ background: "#fffbeb", border: "1.5px solid #fde68a" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#92400e" }}>{row.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-amber-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${row.pct}%`, background: "#f59e0b" }} />
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: "#d97706" }}>{row.pct} %</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zvládáš — silná témata */}
      {zvladas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "#16a34a" }}>
            🟢 Zvládáš — tohle ti jde
          </p>
          <div className="flex flex-wrap gap-2">
            {zvladas.map((row) => (
              <span
                key={row.tema}
                className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}
              >
                ✓ {row.label} · {row.pct} %
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA — začni od nejslabšího */}
      {topWeakest && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe" }}
        >
          <span className="text-2xl shrink-0">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: "#1e40af" }}>
              Začni s: {topWeakest.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#3b82f6" }}>
              Největší prostor pro zlepšení — MateMax připraví příklady přesně pro tebe
            </p>
          </div>
        </div>
      )}

      <button
        onClick={onStart}
        className="w-full py-3 text-white font-bold rounded-xl text-base"
        style={{ background: "#0D1B3E" }}
      >
        Začít trénovat →
      </button>
    </div>
  );
}
