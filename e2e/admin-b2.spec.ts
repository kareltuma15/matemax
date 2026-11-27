import { test, expect, type Page } from "@playwright/test";
import { dopadSablon, kroky, demoZpravy } from "../src/lib/admin2/zpravy";
import { mapaDnu } from "../src/lib/admin2/metriky";
import { demoData } from "../src/lib/admin2/demo";

/**
 * Admin 2.1, fáze B2 na demo datech: Zprávy (Schránka, Odeslané, Šablony), hromadné odeslání, večerní kolečko,
 * zvonek a záložka Zprávy na kartě žáka. Testovací přístup jen ve vývojovém serveru s ADMIN2_E2E=1, nic se nezapisuje.
 */

async function bezPreteceni(page: Page) {
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(w.s, "stránka nesmí přetékat do strany").toBeLessThanOrEqual(w.c + 1);
}

test.describe("zprávy (bez prohlížeče)", () => {
  test("tečky stavu a dopad šablon: trénovalo nikdy víc než dostalo zprávu", () => {
    const d = demoZpravy();
    const dny = mapaDnu(demoData().aktivita);
    for (const z of d.zpravy) {
      const k = kroky(z, d.stavy.filter((s) => s.zprava_id === z.id));
      if (k.kliknuto) expect(k.doruceno).toBe(true);
      if (z.stav === "vraceno") expect(k.problem).toBe(true);
    }
    for (const s of dopadSablon(d.zpravy, new Map(d.zpravy.map((z) => [z.id, d.stavy.filter((x) => x.zprava_id === z.id)])), dny)) {
      expect(s.trenovali).toBeLessThanOrEqual(s.zaci);
      expect(s.doruceno).toBeLessThanOrEqual(s.odeslano);
      for (const id of s.lideTrenovali) expect(s.lide).toContain(id);
    }
  });
});

test.describe("nový admin, fáze B2 (demo data)", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "admin2_e2e", value: "1", domain: "localhost", path: "/" }]);
  });

  test("Schránka: nové položky, vyřízení, odpověď v testovacím režimu, odznak v navigaci", async ({ page }) => {
    await page.goto("/admin/novy/zpravy");
    await expect(page.getByTestId("a2-schranka")).toBeVisible({ timeout: 30_000 });
    const pocet = await page.getByTestId("a2-polozka").count();
    expect(pocet).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId("a2-nav-zpravy").locator("visible=true").first()).toContainText(String(pocet));
    await page.getByTestId("a2-polozka").first().getByRole("button", { name: "Odpovědět" }).click();
    await expect(page.getByText(/Testovací režim: odpověď přijde na tvou adresu/)).toBeVisible();
    await page.getByTestId("a2-polozka").filter({ hasText: "Chyba v úloze" }).getByRole("link", { name: "Zobrazit úlohu" }).isVisible();
    await bezPreteceni(page);
  });

  test("Odeslané: tečky stavu, filtr problémů, doručitelnost; Šablony s dopadem", async ({ page }) => {
    await page.goto("/admin/novy/zpravy?tab=odeslane");
    await expect(page.getByTestId("a2-odeslane")).toBeVisible({ timeout: 30_000 });
    expect(await page.getByTestId("a2-zprava").count()).toBeGreaterThan(10);
    await expect(page.getByTestId("a2-dorucitelnost")).toContainText("Vráceno");
    await page.getByRole("link", { name: /Problémy/ }).click();
    await expect(page.getByTestId("a2-zprava").first()).toContainText("Vráceno");
    await page.getByTestId("a2-tab-sablony").click();
    await expect(page.getByTestId("a2-sablona").first()).toContainText("Trénovali do 48 h");
  });

  test("hromadné odeslání: segment → šablona → náhled konkrétní zprávy → test", async ({ page }) => {
    await page.goto("/admin/novy/zpravy/hromadne");
    await expect(page.getByTestId("a2-hromadne")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("group", { name: "Segment" }).getByRole("link", { name: /Netrénují/ }).click();
    await page.getByRole("group", { name: "Šablona" }).getByRole("link", { name: /Stýská se mi/ }).click();
    await expect(page.locator('iframe[title="Náhled e-mailu"]')).toBeVisible();
    await expect(page.getByTestId("a2-hromadne-test")).toBeEnabled();
    await expect(page.getByTestId("a2-hromadne-odeslat")).toBeDisabled();
  });

  test("večerní kolečko: karta po kartě, Hotovo posune dál, na konci shrnutí", async ({ page }) => {
    await page.goto("/admin/novy");
    await page.getByTestId("a2-spustit-kolecko").click();
    await expect(page.getByTestId("a2-kolecko")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("a2-kolecko-karta")).toHaveAttribute("data-druh", "zprava");
    const text = await page.getByTestId("a2-kolecko").innerText();
    const celkem = Number(text.match(/1 z (\d+)/)?.[1]);
    expect(celkem).toBeGreaterThan(3);
    for (let i = 0; i < celkem; i++) await page.getByTestId("a2-kolecko-hotovo").click();
    await expect(page.getByTestId("a2-kolecko-konec")).toContainText(`Vyřízeno ${celkem}`);
  });

  test("zvonek ukáže upozornění a karta žáka má záložku Zprávy", async ({ page }) => {
    await page.goto("/admin/novy");
    await page.getByTestId("a2-zvonek").click();
    await expect(page.getByTestId("a2-upozorneni")).toContainText("Schránce");
    await page.goto(`/admin/novy/zaci/00000000-0000-4000-8000-000000000004?tab=zpravy`);
    await expect(page.getByTestId("a2-zpravy-zaka")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("a2-zpravy-zaka")).toContainText("Odeslané zprávy");
  });

  for (const sirka of [320, 375]) {
    test(`mobil ${sirka} px: Zprávy, hromadné a kolečko bez přetečení`, async ({ page }) => {
      await page.setViewportSize({ width: sirka, height: 800 });
      for (const url of ["/admin/novy/zpravy", "/admin/novy/zpravy?tab=odeslane", "/admin/novy/zpravy?tab=sablony", "/admin/novy/zpravy/hromadne?segment=netrenuji&sablona=styska", "/admin/novy/kolecko"]) {
        await page.goto(url);
        await expect(page.getByTestId("admin2")).toBeVisible({ timeout: 30_000 });
        await bezPreteceni(page);
      }
    });
  }
});
