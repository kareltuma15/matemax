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

// Úpravy po Karlových poznámkách (11. 11. 2026): interaktivita, Testy s doporučením, týdenní e-mail rodičům.

test("report pro rodiče: odhad bodů, posun, cíl, všechna témata a tip; jména se escapují", async () => {
  const { buildReportHtml } = await import("../src/lib/report-rodice");
  const temata = Object.entries(BODY_TEMAT[9]).map(([tema, max]) => ({ tema, label: tema, max, body: max / 2 }));
  const html = buildReportHtml({
    childName: "Tom<b>", weekDate: "16. listopadu 2026", weekTotal: 40, lastWeekTotal: 30, streak: 3, accuracy: 70,
    odhad: { trida: 9, celkem: 25, max: 50, bezDat: false, cil: 32, temata, nejvicBodu: { label: "Slovní úlohy", chybi: 5 }, tydny: [{ d: "2026-11-09", b: 22 }], zmena: 3 },
  });
  expect(html).toContain("Odhad bodů u přijímaček");
  expect(html).toContain(">25<");
  expect(html).toContain("+3 body od minulého týdne");
  expect(html).toContain("chybí ještě 7 bodů");
  expect(html).toContain("Slovní úlohy");
  expect(html).not.toContain("Tom<b>");
  for (const t of temata) expect(html).toContain(`>${t.tema}<`);

  const nic = buildReportHtml({
    childName: "Ema", weekDate: "x", weekTotal: 0, lastWeekTotal: 0, streak: 0, accuracy: null,
    odhad: { trida: 5, celkem: 0, max: 50, bezDat: true, cil: null, temata: [], nejvicBodu: null, tydny: [], zmena: null },
  });
  expect(nic).toContain("Odhad bodů zatím nemáme");
});

test("tlačítka mají kurzor ruky a Testy doporučí diagnostiku nováčkovi, potom cvičný test", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto("/testy");
  await expect(page.getByTestId("testy-diagnostika").getByTestId("testy-doporuceno")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("matemax-diag-done", "1"));
  await page.reload();
  await expect(page.getByTestId("testy-cermat").getByTestId("testy-doporuceno")).toBeVisible();
  await expect(page.getByTestId("testy-diagnostika")).toContainText("Hotovo");

  await page.goto("/nahled?mapa=9");
  const tema = page.locator("button[data-tema]").first();
  await expect(tema).toBeVisible();
  expect(await tema.evaluate((el) => getComputedStyle(el).cursor)).toBe("pointer");
});
