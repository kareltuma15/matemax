import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { perpendicularThrough, parallelThrough, distToShape, matchMarkers, matchLocus, projectOnShape } from "../src/lib/construct-geom";

// Adaptivní diagnostika: 8 témat × 2 otázky. 1. otázka = L2; správně → 3. úroveň (L3), špatně → 1. úroveň (L1).
// Skóre tématu se ukládá jako correct z 3: L2✓+L3✓ = 3, L2✓+L3✗ = 2, L2✗+L1✓ = 1, L2✗+L1✗ = 0.
// Test nic nezapisuje na server (nepřihlášený → jen localStorage).

type Scene = { width: number; targets: { x: number; y: number }[] };
type Q = { id: string; tema: string; obtiznost: number; spravna: number; moznosti: string[]; konstrukce_scena?: Scene };
const pool: Q[] = JSON.parse(fs.readFileSync("src/data/diagnostika.json", "utf8")).questions;
const TEMA = ["zlomky", "vyrazy", "rovnice", "geometrie", "slovni_ulohy", "grafy_logika", "konstrukce", "uhly"];
const q = (tema: string, level: number) => pool.find((e) => e.tema === tema && e.obtiznost === level)!;

test("pool: 8 témat × 3 úrovně, každá otázka má právě jednu správnou možnost", () => {
  expect(pool).toHaveLength(24);
  expect(new Set(pool.map((e) => e.id)).size).toBe(24);
  for (const tema of TEMA) for (const lvl of [1, 2, 3]) {
    const e = q(tema, lvl);
    expect(e, `${tema} L${lvl}`).toBeTruthy();
    if (e.konstrukce_scena) {
      // rýsování: místo A–E se označují správné body
      expect(e.konstrukce_scena.targets.length, `${e.id} cíle`).toBeGreaterThanOrEqual(1);
      continue;
    }
    expect(e.moznosti.length).toBeGreaterThanOrEqual(4);
    expect(e.spravna).toBeGreaterThanOrEqual(0);
    expect(e.spravna).toBeLessThan(e.moznosti.length);
  }
});

// Klepnutí do scény rýsování; souřadnice obrázku se čtou čerstvě při každém klepnutí (stránka se mezi kliky posouvá).
async function tapScene(page: Page, sceneWidth: number, x: number, y: number) {
  const svg = page.locator("svg[role=img]").first();
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const k = box.width / sceneWidth;
  await page.mouse.click(box.x + x * k, box.y + y * k);
}

async function answerScene(page: Page, question: Q, correct: boolean) {
  const scene = question.konstrukce_scena!;
  // správně = klepnout na všechny hledané body, špatně = jediný bod v rohu obrázku (mimo všechny hledané body)
  const pts = correct ? scene.targets : [{ x: 12, y: 12 }];
  await page.getByRole("button", { name: /^📍 Označit bod/ }).click(); // výchozí nástroj je pravítko
  for (const t of pts) await tapScene(page, scene.width, t.x, t.y);
  await page.getByRole("button", { name: /Zkontrolovat/ }).click();
  await page.getByRole("button", { name: /Pokračovat/ }).last().click();
}

async function answer(page: Page, question: Q, correct: boolean) {
  if (question.konstrukce_scena) return answerScene(page, question, correct);
  const idx = correct ? question.spravna : (question.spravna + 1) % question.moznosti.length;
  const options = page.locator("button").filter({ has: page.locator("span.rounded-full") });
  await options.nth(idx).click();
  await page.getByRole("button", { name: /Pokračovat/ }).last().click();
}

async function runDiagnostic(page: Page, decide: (tema: string, phase: 1 | 2) => boolean) {
  test.setTimeout(120_000); // 16 otázek s animacemi karet, při paralelním běhu déle než výchozích 30 s
  // Karta „Rýsování" jinak uznává jen body sestrojené v průsečíku čar; tenhle test neprochází celé konstrukce.
  await page.addInitScript(() => { (window as unknown as { __MATEMAX_FREE_MARKERS?: boolean }).__MATEMAX_FREE_MARKERS = true; });
  await page.goto("/diagnostika");
  for (const tema of TEMA) {
    const firstOk = decide(tema, 1);
    await answer(page, q(tema, 2), firstOk);
    await answer(page, q(tema, firstOk ? 3 : 1), decide(tema, 2));
  }
  await expect.poll(() => page.evaluate(() => localStorage.getItem("matemax-diag-done"))).toBe("1");
  const raw = await page.evaluate(() => localStorage.getItem("matemax-diag-results"));
  return JSON.parse(raw ?? "{}") as Record<string, { correct: number; total: number }>;
}

test("diagnostika: všechno správně → 3/3 v každém tématu", async ({ page }) => {
  const r = await runDiagnostic(page, () => true);
  for (const tema of TEMA) expect(r[tema], tema).toEqual({ correct: 3, total: 3 });
});

test("diagnostika: všechno špatně → 0/3 v každém tématu", async ({ page }) => {
  const r = await runDiagnostic(page, () => false);
  for (const tema of TEMA) expect(r[tema], tema).toEqual({ correct: 0, total: 3 });
});

test("diagnostika: L2 správně a L3 špatně = 2, L2 špatně a L1 správně = 1", async ({ page }) => {
  const r = await runDiagnostic(page, (tema, phase) => (TEMA.indexOf(tema) % 2 === 0 ? phase === 1 : phase === 2));
  TEMA.forEach((tema, i) => expect(r[tema], tema).toEqual({ correct: i % 2 === 0 ? 2 : 1, total: 3 }));
});

// Rýsování: kartu lze skutečně vyřešit nástroji (kružítko, pravítko, bod s přichytáváním k průsečíkům).
// Úloha je jako 1. otázka konstrukcí v diagnostice (střed úsečky AB: dvě kružnice → osa → průsečík s úsečkou).
test("rýsování: střed úsečky se dá sestrojit kružítkem a pravítkem", async ({ page }) => {
  test.setTimeout(120_000);
  const sc = pool.find((e) => e.id === "diag_konstrukce_1")!;
  expect(sc.konstrukce_scena).toBeTruthy();
  // skupina témat před konstrukcemi se proklikne správně, ať se k úloze dostaneme
  await page.addInitScript(() => { (window as unknown as { __MATEMAX_FREE_MARKERS?: boolean }).__MATEMAX_FREE_MARKERS = true; });
  await page.goto("/diagnostika");
  for (const tema of TEMA.slice(0, 6)) {
    await answer(page, q(tema, 2), true);
    await answer(page, q(tema, 3), true);
  }
  await answer(page, q("konstrukce", 2), false); // 1. otázka konstrukcí je L2 → (špatně) → pak L1 = střed úsečky
  await page.evaluate(() => { (window as unknown as { __MATEMAX_FREE_MARKERS?: boolean }).__MATEMAX_FREE_MARKERS = false; }); // dál už žádné volné značky
  // teď je zobrazena úloha „střed úsečky" (L1)
  const W = (sc.konstrukce_scena as unknown as { width: number }).width;
  const tap = (x: number, y: number) => tapScene(page, W, x, y);
  const els = (sc.konstrukce_scena as unknown as { given: { t: string; x?: number; y?: number; label?: string }[] }).given;
  const A = els.find((e) => e.label === "A")!, B = els.find((e) => e.label === "B")!;
  const r = Math.hypot(B.x! - A.x!, B.y! - A.y!);
  const S = { x: (A.x! + B.x!) / 2, y: (A.y! + B.y!) / 2 };
  const ux = (B.x! - A.x!) / r, uy = (B.y! - A.y!) / r, h = (Math.sqrt(3) / 2) * r;
  const P1 = { x: S.x - h * uy, y: S.y + h * ux }, P2 = { x: S.x + h * uy, y: S.y - h * ux };
  // odhad od oka se neuznává: klepnutí na střed bez sestrojených čar nevytvoří značku
  await page.getByRole("button", { name: /^📍 Označit bod/ }).click();
  await tap(S.x, S.y);
  await expect(page.getByText("Bod musí ležet v průsečíku čar")).toBeVisible();
  await expect(page.getByRole("button", { name: /Zkontrolovat/ })).toBeDisabled();
  await page.getByRole("button", { name: /Kružítko/ }).first().click();
  await tap(A.x!, A.y!); await tap(B.x!, B.y!);
  await tap(B.x!, B.y!); await tap(A.x!, A.y!);
  await page.getByRole("button", { name: /Pravítko/ }).click();
  await tap(P1.x + 3, P1.y - 3); await tap(P2.x - 3, P2.y + 3);
  await page.getByRole("button", { name: /^📍 Označit bod/ }).click();
  await tap(S.x + 4, S.y + 4);
  await page.getByRole("button", { name: /Zkontrolovat/ }).click();
  await expect(page.getByText("✅ Správně")).toBeVisible();
});

// ── Geometrie nástrojů (čisté funkce) ──
test("geometrie: pravý úhel je kolmý, rovnoběžka rovnoběžná a obě procházejí zadaným bodem", () => {
  const ref = { k: "line" as const, a: { x: 20, y: 165 }, b: { x: 310, y: 155 } };
  const P = { x: 150, y: 45 };
  const dir = { x: ref.b.x - ref.a.x, y: ref.b.y - ref.a.y };
  const perp = perpendicularThrough(ref, P)!, par = parallelThrough(ref, P)!;
  expect(perp.a).toEqual(P);
  expect(par.a).toEqual(P);
  expect(Math.abs((perp.b.x - perp.a.x) * dir.x + (perp.b.y - perp.a.y) * dir.y)).toBeLessThan(1e-9);               // kolmá
  expect(Math.abs((par.b.x - par.a.x) * dir.y - (par.b.y - par.a.y) * dir.x)).toBeLessThan(1e-9);                   // rovnoběžná
  expect(perpendicularThrough({ k: "circ", c: P, r: 5 }, P)).toBeNull();
  expect(distToShape({ x: 0, y: 5 }, { k: "seg", a: { x: 0, y: 0 }, b: { x: 10, y: 0 } })).toBeCloseTo(5);
  expect(distToShape({ x: 20, y: 0 }, { k: "seg", a: { x: 0, y: 0 }, b: { x: 10, y: 0 } })).toBeCloseTo(10);        // úsečka končí
  expect(distToShape({ x: 20, y: 0 }, { k: "line", a: { x: 0, y: 0 }, b: { x: 10, y: 0 } })).toBeCloseTo(0);        // přímka pokračuje
});

test("geometrie: odhad od oka (10 jednotek vedle) při toleranci 4 neprojde", () => {
  expect(matchMarkers([{ x: 10, y: 0 }], [{ x: 0, y: 0 }], 4).ok).toBe(false);
  expect(matchMarkers([{ x: 3, y: 0 }], [{ x: 0, y: 0 }], 4).ok).toBe(true);
  expect(matchMarkers([{ x: 0, y: 0 }, { x: 50, y: 50 }], [{ x: 0, y: 0 }], 4).ok).toBe(false); // značka navíc
});

// ── Živý náhled: kružítko se při tažení zastaví na poloměru předchozí kružnice (stejné kružnice → přesná osa) ──
test("rýsování: kružítko se zastaví na stejném poloměru a střed úsečky vyjde přesně", async ({ page }) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => { (window as unknown as { __MATEMAX_FREE_MARKERS?: boolean }).__MATEMAX_FREE_MARKERS = true; });
  await page.goto("/diagnostika");
  for (const tema of TEMA.slice(0, 6)) { await answer(page, q(tema, 2), true); await answer(page, q(tema, 3), true); }
  await answer(page, q("konstrukce", 2), false);
  await page.evaluate(() => { (window as unknown as { __MATEMAX_FREE_MARKERS?: boolean }).__MATEMAX_FREE_MARKERS = false; });

  const sc = pool.find((e) => e.id === "diag_konstrukce_1")!.konstrukce_scena as unknown as { width: number; given: { label?: string; x?: number; y?: number }[] };
  const A = sc.given.find((e) => e.label === "A")!, B = sc.given.find((e) => e.label === "B")!;
  const svg = page.locator("svg[role=img]").first();
  const move = async (x: number, y: number) => {
    await svg.scrollIntoViewIfNeeded();
    const box = (await svg.boundingBox())!, k = box.width / sc.width;
    await page.mouse.move(box.x + x * k, box.y + y * k, { steps: 4 });
  };
  const tap = (x: number, y: number) => tapScene(page, sc.width, x, y);

  await page.getByRole("button", { name: /^⭕ Kružítko/ }).click();
  await tap(A.x!, A.y!);
  await move(A.x! + 100, A.y!);
  await expect(svg.locator("circle[stroke-dasharray='5 4']")).toHaveCount(1);   // šedý náhled kružnice se táhne za myší
  await tap(A.x! + 100, A.y!);                                                   // 1. kružnice, volný poloměr ≈ 100
  await tap(B.x!, B.y!);
  await move(B.x! + 2, B.y! + 103);                                              // 103 → má se zastavit na 100
  await expect(page.getByText(/· stejný poloměr/)).toBeVisible();
  await tap(B.x! + 2, B.y! + 103);
  const radii = await svg.locator("circle[stroke='#2E6DA4']").evaluateAll((els) => els.map((e) => Number(e.getAttribute("r"))));
  expect(radii).toHaveLength(2);
  expect(Math.abs(radii[0] - radii[1])).toBeLessThan(1e-6);

  const r = radii[0], d = Math.hypot(B.x! - A.x!, B.y! - A.y!);
  const S = { x: (A.x! + B.x!) / 2, y: (A.y! + B.y!) / 2 };
  const h = Math.sqrt(r * r - (d / 2) ** 2), n = { x: -(B.y! - A.y!) / d, y: (B.x! - A.x!) / d };
  await page.getByRole("button", { name: /Pravítko/ }).click();
  await tap(S.x + n.x * h, S.y + n.y * h); await tap(S.x - n.x * h, S.y - n.y * h);
  await page.getByRole("button", { name: /^📍 Označit bod/ }).click();
  await tap(S.x + 3, S.y + 3);
  await page.getByRole("button", { name: /Zkontrolovat/ }).click();
  await expect(page.getByText("✅ Správně")).toBeVisible();
});

test("geometrie: průmět na čáru a ověření množiny bodů (libovolné body na čáře)", () => {
  const line = { k: "line" as const, a: { x: 130, y: 0 }, b: { x: 130, y: 250 } };
  const circ = { k: "circ" as const, c: { x: 0, y: 0 }, r: 10 };
  expect(projectOnShape({ x: 140, y: 77 }, line)).toEqual({ x: 130, y: 77 });
  const pc = projectOnShape({ x: 30, y: 0 }, circ)!;
  expect(pc.x).toBeCloseTo(10); expect(pc.y).toBeCloseTo(0);
  expect(projectOnShape({ x: 0, y: 0 }, circ)).toBeNull();                                    // střed kružnice nemá průmět
  const L = [line];
  expect(matchLocus([{ x: 130, y: 60 }, { x: 130, y: 180 }], L, 2, 4, 40).ok).toBe(true);     // dva různé body na čáře
  expect(matchLocus([{ x: 130, y: 60 }, { x: 130, y: 70 }], L, 2, 4, 40).ok).toBe(false);     // příliš blízko u sebe
  expect(matchLocus([{ x: 130, y: 60 }, { x: 200, y: 180 }], L, 2, 4, 40).ok).toBe(false);    // druhý bod mimo čáru
  expect(matchLocus([{ x: 130, y: 60 }], L, 2, 4, 40).ok).toBe(false);                         // chybí bod
  expect(matchLocus([{ x: 130, y: 60 }, { x: 130, y: 120 }, { x: 130, y: 200 }], L, 2, 4, 40).ok).toBe(false); // bod navíc
});
