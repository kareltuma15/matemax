import { test, expect, type Page } from "@playwright/test";
import { demoUceni, prvniPokusy, statTemat, statUloh, mrizka, opakovani, tematZaka, pripravenost } from "../src/lib/admin2/uceni";
import { demoData } from "../src/lib/admin2/demo";
import { mapaDnu } from "../src/lib/admin2/metriky";
import { allExamples } from "../src/data/examples";

/**
 * Admin 2.1, fáze B3: Učení (témata, úlohy s příznaky, mřížka, opakování, detail úlohy), karta žáka (Učení, Testy, Rodina),
 * Rodiče a tlačítko „Nahlásit chybu“ v appce žáka. Demo data, nic se nezapisuje (hlášení chyby se v testu zachytí).
 */

async function bezPreteceni(page: Page) {
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(w.s, "stránka nesmí přetékat do strany").toBeLessThanOrEqual(w.c + 1);
}

test.describe("učení (bez prohlížeče)", () => {
  test("úspěšnost z prvního pokusu u všech, kdo začali; čísla sedí napříč pohledy", () => {
    const { odpovedi, karty } = demoUceni();
    const prvni = prvniPokusy(odpovedi);
    expect(new Set(prvni.map((r) => `${r.user_id}|${r.uloha_id}`)).size).toBe(prvni.length);
    expect(prvni.every((r) => r.rezim !== "opakovani")).toBe(true);
    const temata = statTemat(odpovedi);
    const ulohy = statUloh(odpovedi);
    for (const t of temata) {
      const zUloh = ulohy.filter((u) => u.tema === t.tema);
      expect(zUloh.reduce((s, u) => s + u.pokusy, 0), `${t.tema}: pokusy úloh = první pokusy tématu`).toBe(t.prvni);
      expect(zUloh.reduce((s, u) => s + u.spravne, 0)).toBe(t.spravne);
    }
    const m = mrizka(odpovedi);
    let bunky = 0; for (const r of m.radky.values()) for (const b of r.values()) bunky += b.odpovedi;
    expect(bunky).toBe(prvni.filter((r) => r.tema).length);
    for (let i = 1; i < temata.length; i++) expect((temata[i - 1].uspesnost ?? 101) <= (temata[i].uspesnost ?? 101)).toBe(true);
    // Demo úloha ZLO2_14 má častou špatnou odpověď 0,75 → podezřelá
    expect(ulohy.find((u) => u.uloha_id === "ZLO2_14")?.priznaky).toContain("podezrela");
    const o = opakovani(karty, odpovedi);
    expect(o.poTerminu).toBeLessThanOrEqual(o.naRade);
    expect(o.intervaly.reduce((s, i) => s + i.pocet, 0)).toBe(o.karet);
  });

  test("obtížnost pro žáka a pravidlo „pozadu“", () => {
    const { odpovedi } = demoUceni();
    const uid = odpovedi[0].user_id;
    for (const t of tematZaka(odpovedi.filter((r) => r.user_id === uid), odpovedi)) {
      if (t.obtiznost === "lehke") expect(t.posledni.spravne / t.posledni.n).toBeGreaterThan(0.9);
      if (t.posledni.n < 8) expect(t.obtiznost).toBeNull();
    }
    const zak = demoData().zaci.find((z) => z.trida === 9)!;
    const dny = mapaDnu([]);
    const p = pripravenost(zak, dny, [{ tema: "zlomky", label: "Zlomky", body: 1, max: 6 }, { tema: "vyrazy", label: "Výrazy", body: 5, max: 6 }], new Set(), "2026-12-01");
    expect(p.slaba.map((s) => s.tema)).toEqual(["zlomky"]);
    expect(p.tempo).toBe(0);
    expect(p.pozadu).toBe(true);
    expect(p.netrenovanaSlaba).toEqual(["Zlomky"]);
  });
});

test.describe("nový admin, fáze B3 (demo data)", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "admin2_e2e", value: "1", domain: "localhost", path: "/" }]);
  });

  test("Učení: témata od nejslabšího, úlohy s příznaky, mřížka, opakování", async ({ page }) => {
    await page.goto("/admin/novy/uceni");
    await expect(page.getByTestId("a2-temata")).toBeVisible({ timeout: 30_000 });
    expect(await page.getByTestId("a2-tema").count()).toBeGreaterThanOrEqual(3);
    await page.getByTestId("a2-tab-ulohy").click();
    await page.getByRole("group", { name: "Příznak" }).getByRole("link", { name: /podezřelá/ }).click();
    await expect(page.getByTestId("a2-uloha").first()).toContainText("ZLO2_14");
    await page.getByTestId("a2-uloha").first().click();
    await expect(page.getByTestId("a2-detail-ulohy")).toContainText("ZLO2_14");
    await expect(page.getByText("Jaké odpovědi žáci dávají?")).toBeVisible();
    await page.goto("/admin/novy/uceni?tab=mrizka");
    await expect(page.getByTestId("a2-mrizka")).toBeVisible();
    await page.goto("/admin/novy/uceni?tab=opakovani");
    await expect(page.getByTestId("a2-opakovani")).toContainText("dnes na řadě");
  });

  test("karta žáka: Učení s odhadem a posledními odpověďmi, Testy, Rodina; Rodiče", async ({ page }) => {
    const id = demoUceni().odpovedi.find((r) => r.trida === 9)!.user_id;
    await page.goto(`/admin/novy/zaci/${id}?tab=uceni`);
    await expect(page.getByTestId("a2-uceni-zaka")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("a2-uceni-zaka")).toContainText("Odhad bodů");
    await expect(page.getByTestId("a2-uceni-zaka")).toContainText("Posledních");
    await expect(page.getByTestId("a2-kopirovat-claude")).toBeVisible();
    await page.goto(`/admin/novy/zaci/${id}?tab=testy`);
    await expect(page.getByTestId("admin2")).toContainText(/test nanečisto|Propojeno/);
    await page.goto(`/admin/novy/zaci/${id}?tab=rodina`);
    await expect(page.getByTestId("a2-rodina-zaka")).toBeVisible();
    await page.goto("/admin/novy/zaci");
    await page.getByTestId("a2-odkaz-rodice").click();
    await expect(page).toHaveURL(/\/admin\/novy\/zaci\/rodice/);
    await expect(page.getByTestId("admin2")).toContainText(/Rodiče|propojený rodič/);
  });

  test("doporučení z učení se objeví na Dnes", async ({ page }) => {
    await page.goto("/admin/novy");
    await expect(page.getByTestId("admin2")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("a2-akce-uloha_ZLO2_14")).toBeVisible();
  });

  for (const sirka of [320, 375]) {
    test(`mobil ${sirka} px: Učení a karta bez přetečení`, async ({ page }) => {
      await page.setViewportSize({ width: sirka, height: 800 });
      const id = demoUceni().odpovedi[0].user_id;
      for (const url of ["/admin/novy/uceni", "/admin/novy/uceni?tab=ulohy", "/admin/novy/uceni?tab=mrizka", "/admin/novy/uceni?tab=opakovani", "/admin/novy/uceni/uloha/ZLO2_14", `/admin/novy/zaci/${id}?tab=uceni`, "/admin/novy/zaci/rodice"]) {
        await page.goto(url);
        await expect(page.getByTestId("admin2")).toBeVisible({ timeout: 30_000 });
        await bezPreteceni(page);
      }
    });
  }
});

test("appka žáka: mezerník a Enter v poznámce k nahlášené chybě píšou text, neposunou na další příklad", async ({ page }) => {
  const ex = allExamples.find((e) => !e.moznosti && !e.image && !e.podulohy && !e.prirazeni && !e.latex && /^\d{1,4}$/.test(e.odpoved) && !e.trida)!;
  await page.goto(`/nahled?ids=${ex.id}`);
  const pole = page.locator("input[type=text], input[inputmode]").first();
  await pole.fill(ex.odpoved);
  await pole.press("Enter");
  await expect(page.getByText("Správně!")).toBeVisible();
  await page.getByTestId("nahlasit-chybu").click();
  const poznamka = page.getByTestId("nahlasit-formular").locator("textarea");
  await poznamka.click();
  await page.keyboard.type("vysledek je jiny");
  await page.keyboard.press("Enter");
  await page.keyboard.type("radek");
  await expect(poznamka).toHaveValue("vysledek je jiny\nradek");
  // Karta zůstala na vyhodnocení (formulář hlášení je pořád otevřený)
  await expect(page.getByTestId("nahlasit-formular")).toBeVisible();
  await expect(page.getByText("Správně!")).toBeVisible();
});

test("appka žáka: Nahlásit chybu pod vyhodnocením úlohy (odeslání se v testu zachytí)", async ({ page }) => {
  const ex = allExamples.find((e) => e.moznosti && e.moznosti.length >= 2 && !e.image && !e.podulohy && !e.prirazeni)!;
  let poslano: Record<string, unknown> | null = null;
  await page.route("**/api/nahlasit-chybu", async (route) => { poslano = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
  await page.goto(`/nahled?ids=${ex.id}`);
  await expect(page.getByTestId("nahlasit-chybu")).toHaveCount(0);
  await page.getByRole("button", { name: /^A\b/ }).first().click();
  await page.getByTestId("nahlasit-chybu").click();
  await page.getByRole("radio", { name: "Nejasné zadání" }).click();
  await page.getByRole("button", { name: "Odeslat" }).click();
  await expect(page.getByTestId("nahlasit-hotovo")).toBeVisible();
  expect(poslano).toMatchObject({ uloha: ex.id, duvod: "nejasne_zadani" });
});
