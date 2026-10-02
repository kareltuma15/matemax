import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

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
  await page.goto("/diagnostika");
  for (const tema of TEMA.slice(0, 6)) {
    await answer(page, q(tema, 2), true);
    await answer(page, q(tema, 3), true);
  }
  await answer(page, q("konstrukce", 2), false); // 1. otázka konstrukcí je L2 → (špatně) → pak L1 = střed úsečky
  // teď je zobrazena úloha „střed úsečky" (L1)
  const W = (sc.konstrukce_scena as unknown as { width: number }).width;
  const tap = (x: number, y: number) => tapScene(page, W, x, y);
  const els = (sc.konstrukce_scena as unknown as { given: { t: string; x?: number; y?: number; label?: string }[] }).given;
  const A = els.find((e) => e.label === "A")!, B = els.find((e) => e.label === "B")!;
  const r = Math.hypot(B.x! - A.x!, B.y! - A.y!);
  const S = { x: (A.x! + B.x!) / 2, y: (A.y! + B.y!) / 2 };
  const ux = (B.x! - A.x!) / r, uy = (B.y! - A.y!) / r, h = (Math.sqrt(3) / 2) * r;
  const P1 = { x: S.x - h * uy, y: S.y + h * ux }, P2 = { x: S.x + h * uy, y: S.y - h * ux };
  await page.getByRole("button", { name: /Kružítko/ }).first().click();
  await tap(A.x!, A.y!); await tap(B.x!, B.y!);
  await tap(B.x!, B.y!); await tap(A.x!, A.y!);
  await page.getByRole("button", { name: /Pravítko/ }).click();
  await tap(P1.x + 3, P1.y - 3); await tap(P2.x - 3, P2.y + 3);
  await page.getByRole("button", { name: /^📍 Bod/ }).click();
  await tap(S.x + 4, S.y + 4);
  await page.getByRole("button", { name: /Zkontrolovat/ }).click();
  await expect(page.getByText("✅ Správně")).toBeVisible();
});
