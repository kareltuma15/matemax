import { test, expect, type Page } from "@playwright/test";
import { minulyTyden, tydenVKostce, shrnutiProClauda, vyhodnot } from "../src/lib/admin2/plan";
import { demoData } from "../src/lib/admin2/demo";
import { mapaDnu } from "../src/lib/admin2/metriky";

/** Admin 2.1, fáze B4: Plán (týden v kostce, kronika s vyhodnocením, kalendář) a Systém (limity, zálohy, souhlasy). Demo data. */

async function bezPreteceni(page: Page) {
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(w.s, "stránka nesmí přetékat do strany").toBeLessThanOrEqual(w.c + 1);
}

test.describe("plán (bez prohlížeče)", () => {
  test("minulý týden je pondělí až neděle; shrnutí pro Clauda bez jmen, e-mailů a ID", () => {
    expect(minulyTyden("2026-12-02")).toEqual({ od: "2026-11-23", do: "2026-11-29", predOd: "2026-11-16", predDo: "2026-11-22" });
    expect(minulyTyden("2026-11-30").od).toBe("2026-11-23");
    const d = demoData();
    const zaci = d.zaci.filter((z) => !z._testovaci && !z._admin);
    const t = tydenVKostce(zaci, mapaDnu(d.aktivita));
    const md = shrnutiProClauda(t, [{ klic: "x", pravidlo: "x", oblast: "aktivace", titulek: "Test", proc: "Proč", lide: zaci.slice(0, 3).map((z) => z.id), akce: { typ: "odkaz", text: "x", href: "/" }, priorita: 1 }], []);
    expect(md).toContain("Žák 1");
    for (const z of zaci) { expect(md).not.toContain(z.id); if (z.jmeno) expect(md).not.toContain(z.jmeno); if (z.email) expect(md).not.toContain(z.email); }
  });

  test("vyhodnocení změny: stejní žáci před a po, neúplné období se tak označí", () => {
    const d = demoData();
    const zaci = d.zaci.filter((z) => !z._testovaci && !z._admin);
    const v = vyhodnot("2026-11-20", { proc: "", sledovat: "dny_tydne", vyhodnotit: "2026-12-04" }, zaci, mapaDnu(d.aktivita), "2026-11-27");
    expect(v.hotovo).toBe(false);
    expect(v.zakladPred).toBe(v.zakladPo);
    const a = vyhodnot("2026-11-01", { proc: "", sledovat: "aktivace", vyhodnotit: "2026-11-15" }, zaci, mapaDnu(d.aktivita), "2026-11-27");
    expect(a.hotovo).toBe(true);
  });
});

test.describe("nový admin, fáze B4 (demo data)", () => {
  test.beforeEach(async ({ context }) => { await context.addCookies([{ name: "admin2_e2e", value: "1", domain: "localhost", path: "/" }]); });

  test("Plán: týden v kostce, navržené úkoly, kopírování pro Clauda, kronika a kalendář", async ({ page }) => {
    await page.goto("/admin/novy/plan?demo=1");
    await expect(page.getByTestId("a2-tyden")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("a2-tyden")).toContainText("Pravidelní");
    await expect(page.getByTestId("a2-kopirovat-claude")).toBeVisible();
    await expect(page.getByTestId("a2-kronika")).toContainText("Před:");
    await expect(page.getByTestId("a2-kalendar")).toContainText("Přijímačky");
  });

  test("Systém: limity tarifů, záloha, souhlasy", async ({ page }) => {
    await page.goto("/admin/novy/nastaveni");
    await expect(page.getByTestId("a2-limity")).toContainText("Resend");
    await expect(page.getByTestId("a2-limity")).toContainText("Poslední záloha");
    await expect(page.getByTestId("a2-souhlasy")).toContainText("Návrh uchovávání");
  });

  for (const sirka of [320, 375]) {
    test(`mobil ${sirka} px: Plán a Systém bez přetečení`, async ({ page }) => {
      await page.setViewportSize({ width: sirka, height: 800 });
      for (const url of ["/admin/novy/plan?demo=1", "/admin/novy/nastaveni"]) {
        await page.goto(url);
        await expect(page.getByTestId("admin2")).toBeVisible({ timeout: 30_000 });
        await bezPreteceni(page);
      }
    });
  }
});
