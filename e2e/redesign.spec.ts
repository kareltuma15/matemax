import { test, expect } from "@playwright/test";
import { spocitejOdhad, BODY_TEMAT, MAX_BODU } from "../src/lib/odhad-bodu";

// Nový design (11. 11. 2026): obrazovka Testy a odhad bodů u přijímaček.

test("odhad bodů: body za témata dávají u obou tříd dohromady 50", () => {
  for (const trida of [5, 9] as const) {
    expect(Object.values(BODY_TEMAT[trida]).reduce((a, b) => a + b, 0), `${trida}. třída`).toBe(MAX_BODU);
  }
});

test("odhad bodů: bez dat nic, s tréninkem roste, zvládnuté téma dá skoro plné body", () => {
  const prazdny = spocitejOdhad(9, {}, {});
  expect(prazdny.bezDat).toBe(true);
  expect(prazdny.celkem).toBe(0);

  const zlomky = spocitejOdhad(9, { zlomky: { correct: 30, total: 30 } }, {});
  expect(zlomky.bezDat).toBe(false);
  expect(zlomky.temata.find((t) => t.tema === "zlomky")!.body).toBe(BODY_TEMAT[9].zlomky);
  expect(zlomky.celkem).toBe(BODY_TEMAT[9].zlomky);

  // málo příkladů se krátí: 3 správně z 3 nedá plné body
  const malo = spocitejOdhad(9, { zlomky: { correct: 3, total: 3 } }, {});
  expect(malo.celkem).toBeLessThan(BODY_TEMAT[9].zlomky);

  // témata druhé třídy se do odhadu nepočítají
  expect(spocitejOdhad(5, { zlomky: { correct: 30, total: 30 } }, {}).bezDat).toBe(true);
});

test("Testy 9. třídy: diagnostika, cvičný test a test nanečisto; u každého zdarma nebo zvlášť", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto("/testy");
  await expect(page.getByTestId("testy-diagnostika")).toContainText("Zdarma");
  await expect(page.getByTestId("testy-cermat")).toContainText("Zdarma");
  await expect(page.getByTestId("testy-nanecisto")).toContainText("Zvlášť");
  await expect(page.getByTestId("testy-nanecisto")).toContainText("16 úloh");
});

test("Testy 5. třídy: jen věci pro 5. třídu", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
  await page.goto("/testy");
  await expect(page.getByTestId("testy-diagnostika")).toContainText("osmi okruhů");
  await expect(page.getByTestId("testy-cermat")).toHaveCount(0);
  await expect(page.getByTestId("testy-nanecisto")).toContainText("14 úloh");
});

test("přehled postupu: bez dat vyzve k diagnostice, s daty ukáže odhad, graf a všechna témata", async ({ page }) => {
  await page.goto("/nahled?postup=9");
  await expect(page.getByTestId("postup-prehled")).toContainText("Zatím nemáme z čeho počítat");

  await page.addInitScript(() => {
    localStorage.setItem("matemax-gamification", JSON.stringify({ xp: 0, earnedBadges: [], topicStats: { zlomky: { correct: 30, total: 30 }, vyrazy: { correct: 10, total: 20 } } }));
    localStorage.setItem("matemax-cil-body-9", "30");
  });
  await page.goto("/nahled?postup=9");
  await expect(page.getByTestId("odhad-celkem")).toHaveText(/^\d+$/);
  await expect(page.getByTestId("graf-odhadu")).toBeVisible();
  await expect(page.getByTestId("postup-prehled")).toContainText("Do cíle 30 bodů ti chybí");
  await expect(page.locator("[data-tema]")).toHaveCount(8);
  await expect(page.locator('[data-tema="zlomky"]')).toContainText("6 / 6 b.");
});

test("Premium: pro tebe, pro rodiče, srovnání a cena 99 Kč", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto("/premium");
  await expect(page.getByTestId("premium")).toContainText("Pro tebe");
  await expect(page.getByTestId("premium")).toContainText("Pro rodiče");
  await expect(page.getByTestId("srovnani").locator("tbody tr")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /Pokračovat k platbě · 99 Kč/ })).toBeVisible();
});
