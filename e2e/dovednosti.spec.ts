import { test, expect } from "@playwright/test";
import { examples } from "../src/data/examples";
import { DOVEDNOSTI, TESTOVE, dovednostUlohy, dovednostiTematu } from "../src/lib/dovednosti";
import { TEMATA_ORDER } from "../src/types";

// Témata 9. třídy rozdělená na dovednosti + testové příklady (src/lib/dovednosti.ts, scripts/rozdel-dovednosti.mjs).

test.describe("rozdělení úloh 9. třídy", () => {
  test("každá úloha patří do dovednosti svého tématu nebo mezi testové", () => {
    const bez: string[] = [];
    for (const e of examples) {
      const d = dovednostUlohy(e);
      const platne = [...dovednostiTematu(e.tema).map((x) => x.klic), TESTOVE];
      if (!d || !platne.includes(d)) bez.push(`${e.id} (${e.tema}/${e.podtema} → ${d ?? "nic"})`);
    }
    expect(bez, "úlohy bez dovednosti").toEqual([]);
  });

  test("každé téma má dovednosti, každá dovednost aspoň 4 úlohy a téma testové příklady", () => {
    for (const tema of TEMATA_ORDER) {
      const dov = DOVEDNOSTI[tema];
      expect(dov?.length ?? 0, tema).toBeGreaterThanOrEqual(3);
      for (const d of dov) {
        const n = examples.filter((e) => e.tema === tema && dovednostUlohy(e) === d.klic).length;
        expect(n, `${tema}/${d.klic}`).toBeGreaterThanOrEqual(4);
      }
      const testove = examples.filter((e) => e.tema === tema && dovednostUlohy(e) === TESTOVE).length;
      expect(testove, `${tema}: testové`).toBeGreaterThanOrEqual(10);
    }
  });

  test("testové příklady jsou těžké (žádná úloha z úrovně 1)", () => {
    const lehke = examples.filter((e) => dovednostUlohy(e) === TESTOVE && e.obtiznost === 1).map((e) => e.id);
    expect(lehke).toEqual([]);
  });
});

test("výběr dovedností: zlomky mají pět dovedností, testové příklady a celé téma", async ({ page }) => {
  await page.goto("/nahled?vyber=zlomky");
  const v = page.getByTestId("tema-dovednosti");
  await expect(v.getByRole("heading", { name: "Zlomky" })).toBeVisible();
  await expect(v.locator("[data-dovednost]")).toHaveCount(DOVEDNOSTI.zlomky.length + 2);
  await expect(v.getByRole("button", { name: /Sčítání a odčítání/ })).toBeVisible();
  await expect(v.getByRole("button", { name: /Násobení a dělení/ })).toBeVisible();
  const testove = examples.filter((e) => e.tema === "zlomky" && dovednostUlohy(e) === TESTOVE).length;
  await expect(v.locator(`[data-dovednost="${TESTOVE}"]`)).toContainText(`Zvládnuto 0 z ${testove}`);
});

test("trénink dovednosti dává jen úlohy z ní", async ({ page }) => {
  // Zlomky jsou zdarma i bez přihlášení, takže jde trénink otevřít rovnou odkazem.
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto("/trenink?tema=zlomky&dovednost=nasobeni_deleni");
  await expect(page.getByTestId("nazev-dovednosti")).toHaveText("· Násobení a dělení");
  const ids = (await page.getByTestId("sezeni").getAttribute("data-ulohy"))!.split(",");
  expect(ids.length).toBeGreaterThanOrEqual(5);
  for (const id of ids) expect(dovednostUlohy(examples.find((e) => e.id === id)!), id).toBe("nasobeni_deleni");
  // Začátečník dostane hlavně lehčí úlohy: nejvýš střední, těžké jen když by jinak nebylo z čeho vybírat.
  expect(ids.filter((id) => examples.find((e) => e.id === id)!.obtiznost === 3)).toEqual([]);
});

test("testové příklady se otevřou bez ohledu na odemčenou úroveň", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto(`/trenink?tema=zlomky&dovednost=${TESTOVE}`);
  await expect(page.getByTestId("nazev-dovednosti")).toHaveText("· Testové příklady");
  const ids = (await page.getByTestId("sezeni").getAttribute("data-ulohy"))!.split(",");
  for (const id of ids) expect(dovednostUlohy(examples.find((e) => e.id === id)!), id).toBe(TESTOVE);
});
