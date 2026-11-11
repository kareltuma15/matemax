import { test, expect, type Page } from "@playwright/test";
import { examples5 } from "../src/data/examples";
import { DIAG5_IDS, diag5Question } from "../src/data/diagnostika-5";
import { TEMATA_ORDER_5 } from "../src/types";

// Diagnostika pro 5. třídu: 8 okruhů × 2 úlohy, stejná pravidla jako u 9. třídy (L2 → L3 nebo L1, skóre 0–3 z 3).
// Test nic nezapisuje na server (nepřihlášený → jen localStorage).

test("data: každý okruh má tři různé úlohy L1, L2 a L3 z databáze 5. třídy", () => {
  expect(Object.keys(DIAG5_IDS)).toEqual([...TEMATA_ORDER_5]);
  const vsechny = new Set<string>();
  for (const tema of TEMATA_ORDER_5) {
    for (const level of [1, 2, 3] as const) {
      const q = diag5Question(tema, level);
      expect(q.tema, q.id).toBe(tema);
      expect(q.obtiznost, q.id).toBe(level);
      vsechny.add(q.id);
    }
  }
  expect(vsechny.size).toBe(24);
  for (const id of vsechny) expect(examples5.some((e) => e.id === id), id).toBe(true);
});

async function tapScene(page: Page, sceneWidth: number, x: number, y: number) {
  const svg = page.locator("svg[role=img]").first();
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const k = box.width / sceneWidth;
  await page.mouse.click(box.x + x * k, box.y + y * k);
}

async function answer(page: Page, tema: string, level: 1 | 2 | 3, correct: boolean) {
  const q = diag5Question(tema, level);
  if (q.konstrukce_scena) {
    const scene = q.konstrukce_scena;
    const pts = correct ? scene.targets : [{ x: 12, y: 12 }];
    await page.getByRole("button", { name: /^📍 Označit bod/ }).click();
    for (const t of pts) await tapScene(page, scene.width, t.x, t.y);
    await page.getByRole("button", { name: /Zkontrolovat/ }).click();
    await page.getByRole("button", { name: /Pokračovat/ }).last().click();
    return;
  }
  if (q.moznosti && q.moznosti.length > 0 && q.spravna !== undefined) {
    const idx = correct ? q.spravna : (q.spravna + 1) % q.moznosti.length;
    await page.locator("button").filter({ has: page.locator("span.rounded-full") }).nth(idx).click();
    await page.getByRole("button", { name: /Pokračovat/ }).last().click();
    return;
  }
  await page.getByPlaceholder("Tvoje odpověď").fill(correct ? q.odpoved : "123456789");
  await page.getByRole("button", { name: "Zkontrolovat", exact: true }).click();
  await page.getByRole("button", { name: /Další příklad/ }).click();
}

async function run(page: Page, decide: (tema: string, faze: 1 | 2) => boolean) {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    localStorage.setItem("matemax-trida", "5");
    (window as unknown as { __MATEMAX_FREE_MARKERS?: boolean }).__MATEMAX_FREE_MARKERS = true;
  });
  await page.goto("/diagnostika");
  await expect(page.getByTestId("diagnostika-5")).toBeVisible();
  for (const tema of TEMATA_ORDER_5) {
    const prvni = decide(tema, 1);
    await answer(page, tema, 2, prvni);
    await answer(page, tema, prvni ? 3 : 1, decide(tema, 2));
  }
  await expect(page.getByTestId("diagnostika-5-vysledky")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("matemax-diag-done"))).toBe("1");
  const raw = await page.evaluate(() => localStorage.getItem("matemax-diag-results"));
  return JSON.parse(raw ?? "{}") as Record<string, { correct: number; total: number }>;
}

test("diagnostika 5. třídy: všechno správně → 3/3 v každém okruhu", async ({ page }) => {
  const r = await run(page, () => true);
  for (const t of TEMATA_ORDER_5) expect(r[t], t).toEqual({ correct: 3, total: 3 });
});

test("diagnostika 5. třídy: všechno špatně → 0/3 v každém okruhu", async ({ page }) => {
  const r = await run(page, () => false);
  for (const t of TEMATA_ORDER_5) expect(r[t], t).toEqual({ correct: 0, total: 3 });
});

test("diagnostika 5. třídy: L2 správně a L3 špatně = 2, L2 špatně a L1 správně = 1", async ({ page }) => {
  const r = await run(page, (tema, faze) => (TEMATA_ORDER_5.indexOf(tema as (typeof TEMATA_ORDER_5)[number]) % 2 === 0 ? faze === 1 : faze === 2));
  TEMATA_ORDER_5.forEach((t, i) => expect(r[t], t).toEqual({ correct: i % 2 === 0 ? 2 : 1, total: 3 }));
});

test("diagnostika 5. třídy: výsledky se přidají k výsledkům 9. třídy a nic je nepřepíše", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("matemax-diag-results")) localStorage.setItem("matemax-diag-results", JSON.stringify({ zlomky: { correct: 2, total: 3 } }));
  });
  const r = await run(page, () => true);
  expect(r.zlomky).toEqual({ correct: 2, total: 3 });
  expect(r.p5_pocitani).toEqual({ correct: 3, total: 3 });
});

test("diagnostika 5. třídy: po dokončení se při návratu ukážou výsledky a jde je opakovat", async ({ page }) => {
  await run(page, () => true);
  await page.goto("/diagnostika");
  await expect(page.getByTestId("diagnostika-5-vysledky")).toBeVisible();
  await page.getByRole("button", { name: /Opakovat diagnostiku/ }).click();
  await expect(page.getByTestId("diagnostika-5")).toBeVisible();
});
