import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { srovnani, wilson, podil, neobvyklyVykyv } from "../src/lib/admin2/mala-cisla";
import { pseudonymy } from "../src/lib/admin2/sdileni";
import { demoData } from "../src/lib/admin2/demo";
import { lideMetriky, mapaDnu, aktivovan } from "../src/lib/admin2/metriky";

/**
 * Nový admin (admin 2.1, fáze A2) na demo datech. Testovací přístup funguje jen ve vývojovém serveru
 * s ADMIN2_E2E=1 (nastavuje playwright.config) a cookie admin2_e2e. Nic se nezapisuje do databáze.
 * DA-10: stejná metrika má všude stejnou hodnotu, vyloučení funguje všude, trychtýř neroste.
 */

async function prihlas(context: BrowserContext) {
  await context.addCookies([{ name: "admin2_e2e", value: "1", domain: "localhost", path: "/" }]);
}
async function bezPreteceni(page: Page) {
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(w.s, "stránka nesmí přetékat do strany").toBeLessThanOrEqual(w.c + 1);
}

test.describe("malá čísla a sdílení (bez prohlížeče)", () => {
  test("procentní změna až od základu 20, jinak počet", () => {
    expect(srovnani(141, 23).text).toContain("%");
    expect(srovnani(5, 1).text).toBe("minule 1");
    expect(srovnani(5, 19).text).toBe("minule 19");
    expect(podil(2, 4)).toBe("2 ze 4");
    expect(podil(2, 5)).toBe("2 z 5");
    expect(wilson(2, 4)).toEqual([15, 85]);
    expect(neobvyklyVykyv(3, 1)).toBe(false);
    expect(neobvyklyVykyv(40, 10)).toBe(true);
  });

  test("pseudonymy jsou stálé a nic neprozradí", () => {
    const zaci = demoData().zaci.filter((z) => !z._testovaci && !z._admin);
    const a = pseudonymy(zaci), b = pseudonymy([...zaci].reverse());
    for (const z of zaci) { expect(a.get(z.id)).toBe(b.get(z.id)); expect(a.get(z.id)).toMatch(/^Žák [A-Z]+$/); }
  });

  test("demo: aktivovaní nejsou nikdy víc než noví (trychtýř neroste)", () => {
    const d = demoData();
    const zaci = d.zaci.filter((z) => !z._testovaci && !z._admin);
    const dny = mapaDnu(d.aktivita);
    for (const [od, doo] of [["2026-09-01", "2026-12-31"], ["2026-11-01", "2026-11-30"]]) {
      const novi = lideMetriky("novi", zaci, dny, od, doo).lide;
      const akt = lideMetriky("aktivovani", zaci, dny, od, doo).lide;
      expect(akt.length).toBeLessThanOrEqual(novi.length);
      for (const id of akt) expect(novi).toContain(id);
    }
    expect(zaci.filter(aktivovan).every((z) => z.diagnostika && z.prvni_trenink)).toBe(true);
  });
});

test("nový admin bez přihlášení přesměruje na přihlášení", async ({ page }) => {
  await page.goto("/admin/novy");
  await expect(page).toHaveURL(/\/prihlaseni/);
});

test.describe("nový admin (demo data)", () => {
  test.beforeEach(async ({ context }) => { await prihlas(context); });

  test("Dnes: fronta akcí, čísla, cíle, plán a vlastní navigace bez studentské lišty", async ({ page }) => {
    await page.goto("/admin/novy");
    await expect(page.getByTestId("admin2")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("a2-demo-banner")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Na co se podívat/ })).toBeVisible();
    await expect(page.getByTestId("a2-dl-pravidelni")).toBeVisible();
    await expect(page.getByTestId("a2-dl-novi")).toBeVisible();
    await expect(page.getByTestId("a2-cil").first()).toBeVisible();
    await expect(page.getByTestId("a2-nav-zaci").first()).toBeVisible();
    await expect(page.getByText("Testovací", { exact: true })).toHaveCount(0);
    await bezPreteceni(page);
  });

  test("DA-10: číslo na dlaždici = počet lidí v seznamu, filtry se přenesou", async ({ page }) => {
    await page.goto("/admin/novy?obdobi=30");
    for (const id of ["novi", "pravidelni", "platici"]) {
      const dl = page.getByTestId(`a2-dl-${id}`);
      await expect(dl).toBeVisible({ timeout: 30_000 });
      const hodnota = Number(await dl.getAttribute("data-hodnota"));
      await dl.locator("a.v").click();
      await expect(page).toHaveURL(new RegExp(`metrika=${id}`));
      await expect(page).toHaveURL(/obdobi=30/);
      await expect(page.getByTestId("a2-zak")).toHaveCount(hodnota);
      await page.goBack();
    }
  });

  test("vyloučení: testovací účet a admin nejsou v seznamu ani v hledání", async ({ page }) => {
    await page.goto("/admin/novy/zaci?obdobi=90");
    await expect(page.getByTestId("a2-zak").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("a2-zak").filter({ hasText: /Testovací|^Admin/ })).toHaveCount(0);
    await page.goto("/admin/novy/zaci?q=Testov");
    await expect(page.getByTestId("a2-zak")).toHaveCount(0);
  });

  test("karta žáka má vlastní adresu, aktivaci a časovou osu; zpět vrátí filtry", async ({ page }) => {
    await page.goto("/admin/novy/zaci?segment=t9&razeni=aktivita");
    await page.getByTestId("a2-zak").first().locator("a").first().click();
    await expect(page).toHaveURL(/\/admin\/novy\/zaci\/[0-9a-f-]{36}/);
    await expect(page.getByTestId("a2-karta-hlavicka")).toBeVisible();
    await expect(page.getByTestId("a2-shrnuti")).toContainText("Registrace");
    await expect(page.getByTestId("a2-aktivace")).toContainText("Diagnostika");
    await page.getByRole("link", { name: "Časová osa" }).click();
    await expect(page.getByTestId("a2-osa")).toBeVisible();
    await page.getByRole("navigation", { name: "Drobečková navigace" }).getByRole("link", { name: /Žáci/ }).click();
    await expect(page).toHaveURL(/segment=t9/);
    await expect(page).toHaveURL(/razeni=aktivita/);
  });

  test("režim sdílení skryje jména a e-maily", async ({ page }) => {
    await page.goto("/admin/novy/zaci");
    await expect(page.getByTestId("a2-zak").first()).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("a2-sdileni").click();
    await expect(page.getByTestId("a2-sdileni")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("a2-zak").first()).toContainText(/Žák [A-Z]+/);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/@example\.invalid/);
    for (const jm of ["Eliška", "Tomáš", "Jakub"]) expect(text).not.toContain(jm);
    await page.getByTestId("a2-zak").first().locator("a").first().click();
    await expect(page.getByTestId("a2-karta-hlavicka")).toContainText(/Žák [A-Z]+/);
    expect(await page.locator("main").innerText()).not.toMatch(/@example\.invalid/);
    await page.getByTestId("a2-sdileni").click();
    await expect(page.getByTestId("a2-sdileni")).toHaveAttribute("aria-pressed", "false");
  });

  test("hledání (Ctrl+K) najde žáka a otevře kartu", async ({ page }) => {
    await page.goto("/admin/novy");
    await expect(page.getByTestId("admin2")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("a2-hledat").click();
    await page.locator("#a2-hledat-pole").fill("Eliš");
    await page.getByTestId("a2-hledani").getByRole("button", { name: /Eliška/ }).click();
    await expect(page).toHaveURL(/\/admin\/novy\/zaci\//);
  });

  test("filtr období je v adrese a platí i v další sekci", async ({ page }) => {
    await page.goto("/admin/novy");
    await page.getByTestId("a2-filtry").getByRole("button", { name: "30 dní" }).click();
    await expect(page).toHaveURL(/obdobi=30/);
    await page.getByTestId("a2-nav-zaci").first().click();
    await expect(page).toHaveURL(/\/admin\/novy\/zaci\?obdobi=30/);
  });

  for (const sirka of [320, 375]) {
    test(`mobil ${sirka} px: Dnes, Žáci a karta bez přetečení, spodní lišta adminu`, async ({ page }) => {
      await page.setViewportSize({ width: sirka, height: 800 });
      await page.goto("/admin/novy");
      await expect(page.getByTestId("a2-nav-vice")).toBeVisible({ timeout: 30_000 });
      await bezPreteceni(page);
      await page.goto("/admin/novy/zaci");
      await bezPreteceni(page);
      await page.getByTestId("a2-zak").first().locator("a").first().click();
      await expect(page.getByTestId("a2-karta-hlavicka")).toBeVisible();
      await bezPreteceni(page);
    });
  }
});
