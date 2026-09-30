import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

// Adaptivní diagnostika: 8 témat × 2 otázky. 1. otázka = L2; správně → 3. úroveň (L3), špatně → 1. úroveň (L1).
// Skóre tématu se ukládá jako correct z 3: L2✓+L3✓ = 3, L2✓+L3✗ = 2, L2✗+L1✓ = 1, L2✗+L1✗ = 0.
// Test nic nezapisuje na server (nepřihlášený → jen localStorage).

type Q = { id: string; tema: string; obtiznost: number; spravna: number; moznosti: string[] };
const pool: Q[] = JSON.parse(fs.readFileSync("src/data/diagnostika.json", "utf8")).questions;
const TEMA = ["zlomky", "vyrazy", "rovnice", "geometrie", "slovni_ulohy", "grafy_logika", "konstrukce", "uhly"];
const q = (tema: string, level: number) => pool.find((e) => e.tema === tema && e.obtiznost === level)!;

test("pool: 8 témat × 3 úrovně, každá otázka má právě jednu správnou možnost", () => {
  expect(pool).toHaveLength(24);
  expect(new Set(pool.map((e) => e.id)).size).toBe(24);
  for (const tema of TEMA) for (const lvl of [1, 2, 3]) {
    const e = q(tema, lvl);
    expect(e, `${tema} L${lvl}`).toBeTruthy();
    expect(e.moznosti.length).toBeGreaterThanOrEqual(4);
    expect(e.spravna).toBeGreaterThanOrEqual(0);
    expect(e.spravna).toBeLessThan(e.moznosti.length);
  }
});

async function answer(page: Page, question: Q, correct: boolean) {
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
