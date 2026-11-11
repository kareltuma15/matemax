import { test, expect, type Page } from "@playwright/test";
import { examples, examples5, isPlainTyped } from "../src/data/examples";
import { TEMATA_ORDER, TEMATA_ORDER_5 } from "../src/types";
import { FREE_TOPICS_5 } from "../src/lib/subscription";

// Nový vzhled: vysvětlení po chybě po krocích a výběr témat v Tréninku (5. třída barevné řádky, jinak stejná kostra).
// Testuje se přes /nahled, karty i mapy jsou tytéž jako v tréninku. Test nic nezapisuje na server.

const dvaKroky = (e: { reseni_kroky: string[] }) => e.reseni_kroky.length >= 2;
const moznosti5 = examples5.find((e) => e.moznosti && e.moznosti.length > 1 && dvaKroky(e))!;
const psana9 = examples.find((e) => isPlainTyped(e) && dvaKroky(e) && !e.image)!;

/** Klikne na „Ukaž další krok“, dokud nějaký zbývá, a hlídá, že přibývá po jednom. */
async function projdiKroky(page: Page, pocet: number) {
  const kroky = page.getByTestId("kroky-reseni").locator("li");
  await expect(kroky).toHaveCount(1);
  await expect(page.getByTestId("vysledek-reseni")).toHaveCount(0);
  for (let n = 2; n <= pocet; n++) {
    await page.getByRole("button", { name: "Ukaž další krok" }).click();
    await expect(kroky).toHaveCount(n);
  }
  await expect(page.getByRole("button", { name: "Ukaž další krok" })).toHaveCount(0);
  await expect(page.getByTestId("vysledek-reseni")).toBeVisible();
}

test("výběr A–E: po chybě se kroky odkrývají po jednom a na konci je výsledek", async ({ page }) => {
  await page.goto(`/nahled?ids=${moznosti5.id}`);
  const spatna = moznosti5.spravna === 0 ? 1 : 0;
  await page.getByRole("button", { name: new RegExp(`^${"ABCDE"[spatna]}`) }).click();
  await projdiKroky(page, moznosti5.reseni_kroky.length);
  await expect(page.getByTestId("vysledek-reseni")).toContainText(`${"ABCDE"[moznosti5.spravna ?? 0]})`);
});

test("výběr A–E: po správné odpovědi se odkrývání neukáže", async ({ page }) => {
  await page.goto(`/nahled?ids=${moznosti5.id}`);
  await page.getByRole("button", { name: new RegExp(`^${"ABCDE"[moznosti5.spravna ?? 0]}`) }).click();
  await expect(page.getByText("✓ Správně!")).toBeVisible();
  await expect(page.getByTestId("kroky-reseni")).toHaveCount(0);
});

test("psaná odpověď: po druhé chybě se vysvětlení otevře samo a jde po krocích", async ({ page }) => {
  await page.goto(`/nahled?ids=${psana9.id}`);
  const pole = page.locator("form input").first();
  await pole.fill("987654");
  await pole.press("Enter");
  await expect(page.getByTestId("kroky-reseni")).toHaveCount(0);   // po první chybě může zkusit znovu, řešení je zavřené
  await page.getByRole("button", { name: /Zkusit/ }).first().click();
  await pole.fill("987654");
  await pole.press("Enter");
  await projdiKroky(page, psana9.reseni_kroky.length);
});

test("více odpovědí: výsledek pravdy a nepravdy se vypíše slovy", async ({ page }) => {
  await page.goto("/nahled?ids=P5_VIC_17");
  const k = page.getByTestId("vic-odpovedi");
  await k.getByRole("button", { name: "Tvrzení 1: ANO" }).click();   // správně je NE
  await k.getByRole("button", { name: "Tvrzení 2: ANO" }).click();
  await k.getByRole("button", { name: "Tvrzení 3: NE" }).click();
  await k.getByRole("button", { name: "Zkontrolovat" }).click();
  const kroky = examples5.find((e) => e.id === "P5_VIC_17")!.reseni_kroky.length;
  for (let n = 2; n <= kroky; n++) await k.getByRole("button", { name: "Ukaž další krok" }).click();
  await expect(k.getByTestId("vysledek-reseni")).toContainText("NE, ANO, NE");
});

test.describe("výběr témat v Tréninku, 5. třída", () => {
  test("všech osm okruhů, každý jinou barvou; zamčené jsou v jednom bloku V Premium", async ({ page }) => {
    await page.goto("/nahled?mapa=5");
    const okruhy = page.locator("[data-tema]");
    await expect(okruhy).toHaveCount(TEMATA_ORDER_5.length);
    const barvy = await okruhy.evaluateAll((el) => el.map((x) => getComputedStyle(x).getPropertyValue("--tema-barva")));
    expect(new Set(barvy).size).toBe(TEMATA_ORDER_5.length);
    await expect(page.locator("button[data-tema]")).toHaveCount(FREE_TOPICS_5.size);
    await expect(page.getByText("V Premium", { exact: true })).toBeVisible();
    await expect(page.getByTestId("odemknout-premium")).toContainText("99 Kč");
    // nováček: doporučení „Začni tady“ u prvního okruhu
    await expect(page.getByTestId("doporuceny-okruh")).toHaveText("Začni tady");
    await expect(page.locator('[data-tema="p5_pocitani"] [data-testid="doporuceny-okruh"]')).toHaveCount(1);
  });

  test("s Premium žádný zamčený blok, doporučí první nezvládnutý okruh", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("matemax-diag-done", "1");
      localStorage.setItem("matemax-gamification", JSON.stringify({ xp: 0, earnedBadges: [], topicStats: { p5_pocitani: { correct: 40, total: 44 } } }));
    });
    await page.goto("/nahled?mapa=5&premium=1");
    await expect(page.locator("button[data-tema]")).toHaveCount(TEMATA_ORDER_5.length);
    await expect(page.getByTestId("odemknout-premium")).toHaveCount(0);
    await expect(page.locator('[data-tema="p5_jednotky"] [data-testid="doporuceny-okruh"]')).toHaveText("Dnes");
  });
});

test("výběr témat 9. třídy: řádky se šestiúhelníky, bez okruhů 5. třídy", async ({ page }) => {
  await page.goto("/nahled?mapa=9");
  await expect(page.locator("[data-tema]")).toHaveCount(TEMATA_ORDER.length);
  await expect(page.locator("[data-tema] svg polygon")).toHaveCount(TEMATA_ORDER.length);
  await expect(page.getByText("Začni tady")).toHaveCount(1);
  const text = await page.evaluate(() => document.body.innerText);
  for (const slovo of ["Počítání s čísly", "Jednotky, čas", "Tělesa a souměrnost"]) expect(text, slovo).not.toContain(slovo);
});

test("celá appka má písmo DM Sans", async ({ page }) => {
  await page.goto("/nahled?mapa=5");
  const pismo = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(pismo).toMatch(/DM Sans/i);
});
