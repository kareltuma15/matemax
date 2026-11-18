import { test, expect } from "@playwright/test";
import { krokComba, stupenComba, bonusZaMilnik, VYCHOZI_COMBO, type StavComba } from "../src/lib/combo";
import { vychoziStav, slucSbirku, TROFEJE } from "../src/lib/sbirka";

// Combo v tréninku (schválil Karel 18. 11. 2026): stupně, štít, milníky a rekord.

const rada = (odpovedi: boolean[], s: StavComba = VYCHOZI_COMBO) => {
  let x = s;
  const udalosti = odpovedi.map((o) => { const r = krokComba(x, o); x = r.s; return r.udalost; });
  return { s: x, udalosti };
};

test.describe("Combo", () => {
  test("stupně a krystaly za milníky", () => {
    expect([0, 2, 3, 5, 9, 10, 15, 19, 20, 40].map(stupenComba)).toEqual([0, 0, 1, 2, 2, 3, 4, 4, 5, 5]);
    expect([5, 9, 10, 15, 20, 25, 30, 33].map(bonusZaMilnik)).toEqual([0, 0, 5, 5, 10, 10, 10, 0]);
    const { s, udalosti } = rada(Array(10).fill(true));
    expect(s.n).toBe(10);
    expect(udalosti[9]).toMatchObject({ druh: "vic", milnik: 10, bonus: 5, novyStupen: true });
    expect(udalosti[2]).toMatchObject({ druh: "vic", milnik: 0, novyStupen: true });
  });

  test("štít od 5 v řadě podrží jednu chybu, jednou za trénink", () => {
    const a = rada([true, true, true, true, true]);
    expect(a.s.stit).toBe(true);
    expect(a.udalosti[4]).toMatchObject({ noveStit: true });
    const b = rada([false], a.s);
    expect(b.udalosti[0]).toEqual({ druh: "stit" });
    expect(b.s).toMatchObject({ n: 5, stit: false, stitPouzit: true });
    const c = rada([true, true, true, true, true, false], b.s);
    expect(c.s.stit).toBe(false);
    expect(c.udalosti[5]).toEqual({ druh: "konec", bylo: 10 });
    expect(c.s).toMatchObject({ n: 0, max: 10 });
  });

  test("rychlý tip u výběru combo nezvedne ani nesrazí, chyba na nule nic nehlásí", () => {
    const a = rada([true, true]);
    expect(krokComba(a.s, true, true)).toEqual({ s: a.s, udalost: { druh: "nic" } });
    expect(krokComba(VYCHOZI_COMBO, false).udalost).toEqual({ druh: "nic" });
  });

  test("rekord se při slučování dvou zařízení bere jako maximum a dává trofeje", () => {
    const x = { ...vychoziStav(), comboRekord: 12, t: 1 }, y = { ...vychoziStav(), comboRekord: 26, t: 2 };
    expect(slucSbirku(x, y).comboRekord).toBe(26);
    const t10 = TROFEJE.find((t) => t.id === "combo_10")!, t25 = TROFEJE.find((t) => t.id === "combo_25")!;
    expect([t10.splneno(x), t25.splneno(x), t25.splneno(y)]).toEqual([true, false, true]);
  });
});

test("v tréninku: tři správně za sebou rozsvítí combo u Hexíka", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto("/trenink?tema=zlomky");
  await expect(page.getByTestId("hexik-parta")).toBeVisible({ timeout: 20_000 });
  const input = page.getByPlaceholder("Tvoje odpověď");
  const skip = page.getByRole("button", { name: /Přeskočit úlohu/ });
  let spravne = 0;
  for (let i = 0; i < 40 && spravne < 3; i++) {
    if ((await input.count()) === 0) {
      if ((await skip.count()) === 0) break;
      await skip.first().click(); await page.waitForTimeout(150); continue;
    }
    const id = await page.getByTestId("sezeni").getAttribute("data-aktualni");
    const { allExamples } = await import("../src/data/examples");
    const priklad = allExamples.find((e) => e.id === id)!;
    await input.fill(String(priklad.odpoved));
    await input.press("Enter");
    await expect(page.getByTestId("hexik-bublina")).not.toHaveText(" ", { timeout: 3000 });
    spravne++;
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
  }
  test.skip(spravne < 3, "málo úloh s psaním");
  await expect(page.getByTestId("combo")).toHaveAttribute("data-n", "3");
  await expect(page.getByTestId("combo-hexik")).toHaveAttribute("data-t", "1");
});
