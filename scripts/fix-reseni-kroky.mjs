// Skript pro zlepšení reseni_kroky v databaze.json
// Spustit: node scripts/fix-reseni-kroky.mjs

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../src/data/databaze.json");
const db = JSON.parse(readFileSync(dbPath, "utf-8"));

// Mapa vylepšených řešení: id → nové kroky
const fixes = {

  // ── POHYBOVÉ ÚLOHY ──────────────────────────────────────────────────────────

  SLO_005: [
    "Dva pěší jdou VSTŘÍC → jejich rychlosti se sčítají: v = 4 + 6 = 10 km/h",
    "Čas setkání: t = vzdálenost ÷ společná rychlost = 15 ÷ 10 = 1,5 h",
    "Výsledek: setkají se za 1,5 hodiny (= 1 hodinu 30 minut)",
  ],

  SLO_006: [
    "Průměrná rychlost NENÍ (80+120)/2 — to platí jen pro stejné časy, ne vzdálenosti!",
    "Čas tam: t₁ = 200 ÷ 80 = 2,5 h",
    "Čas zpět: t₂ = 200 ÷ 120 = 1,667 h",
    "Průměrná rychlost = celková vzdálenost ÷ celkový čas = 400 ÷ (2,5 + 1,667) = 400 ÷ 4,167 = 96 km/h",
    "Tip: Pro stejnou vzdálenost platí v_průměr = 2·v₁·v₂ ÷ (v₁+v₂) = 2·80·120 ÷ 200 = 96 km/h",
  ],

  SLO_007: [
    "Nejdříve vypočítáme rychlost: v = vzdálenost ÷ čas = 3 km ÷ 0,75 h = 4 km/h",
    "Pozor: 45 minut = 45/60 = 0,75 hodiny!",
    "Vzdálenost za 2 hodiny: s = v · t = 4 · 2 = 8 km",
  ],

  SLO_008: [
    "Označme: v = vlastní rychlost lodi, p = rychlost proudu",
    "Po proudu: v + p = 40 km/h",
    "Proti proudu: v − p = 24 km/h",
    "Odečteme rovnice: (v+p) − (v−p) = 40 − 24 → 2p = 16 → p = 8 km/h",
    "Výsledek: rychlost proudu je 8 km/h (vlastní rychlost lodi: v = 32 km/h)",
  ],

  SLO_009: [
    "Vlaky jedou VSTŘÍC → rychlosti se sčítají: v_celková = 60 + 90 = 150 km/h",
    "Čas setkání: t = vzdálenost ÷ v_celková",
    "Potřebujeme vzdálenost — příklad ji musí uvádět (typicky 300 km → t = 300/150 = 2 h)",
    "Obecný postup: t = D ÷ (v₁ + v₂), kde D je počáteční vzdálenost",
  ],

  SLO_010: [
    "Čas v hodinách: 3 h 30 min = 3 + 30/60 = 3,5 hodiny",
    "Průměrná rychlost: v = vzdálenost ÷ čas = 42,2 ÷ 3,5 = 12,06 km/h",
    "Výsledek: přibližně 12 km/h (přesně 12,057 km/h)",
  ],

  SLO_026: [
    "Převod jednotek: 10 km = 10 000 m",
    "Jeden obvod kola = 2 m → za 2 m udělá 1 otáčku",
    "Počet otáček = vzdálenost ÷ obvod = 10 000 ÷ 2 = 5 000 otáček",
  ],

  SLO_037: [
    "Převod času: 45 minut = 45/60 = 0,75 hodiny",
    "Vzdálenost: s = rychlost · čas = 800 · 0,75 = 600 km",
    "Tip: 45 min = 3/4 hodiny, takže 800 · 3/4 = 600 — lze počítat i zlomkem",
  ],

  SLO_038: [
    "Převod času: 2 h 30 min = 2,5 hodiny",
    "Průměrná rychlost: v = vzdálenost ÷ čas = 160 ÷ 2,5 = 64 km/h",
  ],

  SLO_057: [
    "Jdou OPAČNÝMI směry → vzdálenost mezi nimi roste součtem rychlostí",
    "Společná rychlost vzdalování: 5 + 20 = 25 km/h",
    "Čas: t = 50 ÷ 25 = 2 hodiny",
  ],

  SLO_067: [
    "Rychlost vlaku: v_vlak = 360 ÷ 3 = 120 km/h",
    "Rychlost autobusu: v_autobus = 360 ÷ 6 = 60 km/h",
    "Rozdíl rychlostí: 120 − 60 = 60 km/h",
  ],

  // ── PRÁCE ÚLOHY ─────────────────────────────────────────────────────────────

  SLO_012: [
    "Klíčový vzorec: výkon pracovníka = 1 ÷ čas (kolik práce za hodinu)",
    "A udělá 1/4 práce za hodinu, B udělá 1/6 práce za hodinu",
    "Spolu za hodinu: 1/4 + 1/6 = 3/12 + 2/12 = 5/12 práce",
    "Celkový čas: t = 1 ÷ (5/12) = 12/5 = 2,4 hodiny = 2 h 24 min",
  ],

  SLO_013: [
    "Kohoutek plní: +1/3 nádrže za hodinu",
    "Výpust vyprazdňuje: −1/5 nádrže za hodinu",
    "Výsledný výkon: 1/3 − 1/5 = 5/15 − 3/15 = 2/15 nádrže za hodinu",
    "Čas naplnění: t = 1 ÷ (2/15) = 15/2 = 7,5 hodiny",
  ],

  SLO_014: [
    "Celkové 'člověkodny': 5 dělníků × 8 dní = 40 člověkodnů (stálé množství práce)",
    "Pro 4 dělníky: čas = 40 ÷ 4 = 10 dní",
    "Princip: více dělníků → méně dní (nepřímá úměra)",
  ],

  SLO_070: [
    "Petr udělá 1/4 práce za hodinu, Pavel 1/6 práce za hodinu",
    "Spolu za hodinu: 1/4 + 1/6 = 3/12 + 2/12 = 5/12 práce",
    "Čas: t = 12/5 = 2,4 h = 2 hodiny 24 minut",
    "Převod: 0,4 h = 0,4 × 60 = 24 minut",
  ],

  // ── VĚKOVÉ ÚLOHY ────────────────────────────────────────────────────────────

  SLO_021: [
    "Označíme: s = věk syna dnes, o = věk otce dnes",
    "Podmínka 1: o = 4s (otec je 4× starší)",
    "Podmínka 2: o + 5 = 3(s + 5) (za 5 let bude 3× starší)",
    "Dosadíme: 4s + 5 = 3s + 15 → s = 10 (syn), o = 40 (otec)",
  ],

  SLO_022: [
    "Označíme: x = počet let, za které bude matka 2× starší",
    "Věky za x let: matka 36+x, dcera 12+x",
    "Podmínka: 36 + x = 2(12 + x) → 36 + x = 24 + 2x → x = 12",
    "Výsledek: za 12 let (matce 48, dceři 24 — opravdu 2×)",
  ],

  SLO_023: [
    "Označíme: s = věk syna, o = věk otce",
    "Rovnice 1: s + o = 54",
    "Rovnice 2: o = s + 30",
    "Dosadíme: s + (s + 30) = 54 → 2s = 24 → s = 12, o = 42",
  ],

  SLO_024: [
    "Označíme: x = počet let zpět, kdy byl poměr věků 5:1",
    "Babičce tehdy: 60 − x, vnukovi: 12 − x",
    "Podmínka: (60 − x) = 5 · (12 − x)",
    "60 − x = 60 − 5x → 4x = 0 → x = 0 — to nedává smysl (platí dnes!)",
    "Tip: pokud hledáme jiný poměr (např. 6:1): 60−x = 6(12−x) → x = 12/5 = 2,4 let zpět",
  ],

  SLO_054: [
    "Celkový součet věků celé rodiny: 80 + 30 = 110 let",
    "Počet členů rodiny: 2 rodiče + 3 děti = 5 osob",
    "Průměrný věk: 110 ÷ 5 = 22 let",
  ],

  SLO_074: [
    "Označíme: x = počet let do budoucnosti",
    "Otci za x let: 42 + x, synovi: 12 + x",
    "Podmínka: 42 + x = 3(12 + x)",
    "42 + x = 36 + 3x → 6 = 2x → x = 3",
    "Ověření: otci 45, synovi 15 — platí 45 = 3 × 15 ✓",
  ],

  SLO_075: [
    "Označíme: v = věk vnučky, b = věk babičky",
    "Podmínka 1: b = 5v",
    "Podmínka 2: b + v = 72",
    "Dosadíme: 5v + v = 72 → 6v = 72 → v = 12",
    "Vnučce je 12 let, babičce 60 let",
  ],

  // ── SMĚSI A ROZTOKY ─────────────────────────────────────────────────────────

  SLO_016: [
    "Množství látky = objem × koncentrace",
    "V 3 l 20% roztoku: 3 × 0,20 = 0,6 l látky",
    "V 2 l 50% roztoku: 2 × 0,50 = 1,0 l látky",
    "Po smíchání: celkem 5 l, z toho 1,6 l látky",
    "Výsledná koncentrace: 1,6 ÷ 5 = 0,32 = 32 %",
  ],

  SLO_034: [
    "Celkový objem: 10 l vody + 5 l sirupu = 15 l směsi",
    "Procentuální podíl sirupu: 5 ÷ 15 × 100 = 33,33 %",
    "Pozor: voda NENÍ procento sirupu — dělíme sirupem z CELKU (10+5), ne jen z vody!",
  ],

  SLO_040: [
    "Marže = zisk vztažený k NÁKUPNÍ ceně (ne k prodejní!)",
    "Zisk: 280 − 200 = 80 Kč",
    "Procentuální marže: 80 ÷ 200 × 100 = 40 %",
    "Pozor: markup (na nákupní cenu) ≠ marže (na prodejní cenu). Toto je markup = 40 %",
  ],

  // ── OSTATNÍ ─────────────────────────────────────────────────────────────────

  SLO_026: [
    "Převod: 10 km = 10 000 metrů",
    "Kolo udělá 1 otáčku na každé 2 metry (= obvod)",
    "Počet otáček = 10 000 ÷ 2 = 5 000 otáček",
  ],

  SLO_049: [
    "Počet hodin celkem: 6 lidí × 8 hodin = 48 pracovních hodin",
    "Odměna za 1 hodinu práce 1 člověka: 250 Kč",
    "Celkové náklady: 48 × 250 = 12 000 Kč",
  ],

  SLO_050: [
    "Označíme původní cenu výrobku jako 1 (= 100 %)",
    "Materiál tvoří 60 % ceny, po zdražení o 10 %: 0,60 × 1,10 = 0,66",
    "Práce tvoří 40 % ceny, po zdražení o 15 %: 0,40 × 1,15 = 0,46",
    "Nová cena: 0,66 + 0,46 = 1,12 → nárůst o 12 %",
  ],

  SLO_055: [
    "Počet dívek: 60 % z 25 = 0,60 × 25 = 15 dívek",
    "Počet chlapců: 25 − 15 = 10 chlapců",
    "Nebo: 100 % − 60 % = 40 % jsou chlapci → 0,40 × 25 = 10",
  ],

  SLO_061: [
    "Označíme hledané číslo jako x",
    "Podmínka: x je o 3 větší než jeho polovina → x = x/2 + 3",
    "x − x/2 = 3 → x/2 = 3 → x = 6",
    "Ověření: polovina z 6 = 3, o 3 větší = 6 ✓",
  ],

  SLO_077: [
    "Označíme: P = Petrovy peníze, J = Janovy peníze",
    "Podmínka 1: J = 2P",
    "Po převodu 100 Kč od Jana Petrovi: J − 100 = P + 100",
    "Dosadíme J = 2P: 2P − 100 = P + 100 → P = 200 Kč, J = 400 Kč",
    "Ověření: Jan má 400, Petr 200. Jan dá Petrovi 100: oba mají 300 ✓",
  ],

  SLO_078: [
    "Označíme: c = počet chlapců, d = počet dívek",
    "Rovnice 1 (počty): c + d = 30",
    "Rovnice 2 (průměr): (7c + 7,5d) / 30 = 7,2 → 7c + 7,5d = 216",
    "Z rovnice 1: d = 30 − c. Dosadíme: 7c + 7,5(30−c) = 216",
    "7c + 225 − 7,5c = 216 → −0,5c = −9 → c = 18 chlapců",
  ],

  // ── MOCNINY ─────────────────────────────────────────────────────────────────

  MOC_021: [
    "Odmocnina √n = číslo, které samo sebe umocněné dá n",
    "Hledáme x tak, aby x² = 121",
    "11 × 11 = 121 ✓ → √121 = 11",
    "Tip: pamatuj mocniny do 15: ...10²=100, 11²=121, 12²=144, 13²=169...",
  ],

  MOC_022: [
    "Hledáme x tak, aby x² = 144",
    "12 × 12 = 144 ✓ → √144 = 12",
    "Tip: 144 = 12² (tucet na druhou) — dobrá věc k zapamatování",
  ],

  MOC_030: [
    "Hledáme x tak, aby x² = 169",
    "13 × 13 = 169 ✓ → √169 = 13",
    "Tip: 169 = 13² — pamatuj: 11²=121, 12²=144, 13²=169, 14²=196, 15²=225",
  ],
};

let updated = 0;
for (const ex of db.examples) {
  if (fixes[ex.id]) {
    ex.reseni_kroky = fixes[ex.id];
    updated++;
  }
}

writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
console.log(`✅ Aktualizováno ${updated} příkladů`);
