import { test, expect } from "@playwright/test";
import {
  ODMENY, TRUHLY, vychoziStav, krystaly, krystalyZaOdpoved, pripis, dokoncenyTrenink, zapocitejOdhad,
  otevriTruhlu, kupOdmenu, nasadOdmenu, nasazena, slucSbirku, dostupnostTruhly, etapaHexika,
  DENNI_STROP, POJISTKA_VZACNA, type SbirkaStav,
} from "../src/lib/sbirka";
import { allExamples } from "../src/data/examples";

// Sekce Hexík načítá 3D pokojíček; bez grafické karty v souběžných testech pomalu
test.beforeEach(() => test.slow());

// Sbírka MateMax (1. etapa herního systému, 16. 11. 2026): Hexík u příkladu, krystaly, šatník a truhly.

const s0 = (zmeny: Partial<SbirkaStav> = {}): SbirkaStav => ({ ...vychoziStav(), ...zmeny });

test.describe("pravidla sbírky", () => {
  test("katalog: každá třída má zdarma podobu, oslavu i efekt a v truhlách nikdy nechybí obsah", () => {
    for (const t of [5, 9] as const) {
      const o = ODMENY[t];
      expect(new Set(o.map((x) => x.id)).size).toBe(o.length);
      expect(o.every((x) => x.id.startsWith(`${t}-`))).toBe(true);
      for (const typ of ["podoba", "oslava", "efekt"] as const) {
        expect(o.filter((x) => x.typ === typ && x.cena === 0), `${t}/${typ}`).toHaveLength(1);
      }
      for (const vz of ["bezna", "neobvykla", "vzacna", "legenda"] as const) {
        expect(o.some((x) => x.vz === vz && x.cena !== 0), `${t}/${vz}`).toBe(true);
      }
      // legendární nejde koupit
      expect(o.filter((x) => x.vz === "legenda").every((x) => x.cena === null)).toBe(true);
    }
    for (const tr of TRUHLY) {
      expect(Object.values(tr.sance).reduce((a, b) => a + b, 0), tr.id).toBeCloseTo(1, 5);
    }
  });

  test("krystaly za odpověď: jen správně, podle úrovně, tip naslepo nic", () => {
    expect(krystalyZaOdpoved(false, 2, 2, 9000, false)).toBe(0);
    expect(krystalyZaOdpoved(true, 2, 2, 9000, false)).toBe(2);
    expect(krystalyZaOdpoved(true, 3, 3, 9000, false)).toBe(4);
    expect(krystalyZaOdpoved(true, 1, 2, 9000, false)).toBe(1);
    expect(krystalyZaOdpoved(true, 2, 2, 1200, true)).toBe(0);
    expect(krystalyZaOdpoved(true, 2, 2, 1200, false)).toBe(2);
  });

  test("denní strop krystalů za učení", () => {
    let s = s0();
    s = pripis(s, 200, "2026-11-16").s;
    const r = pripis(s, 100, "2026-11-16");
    expect(r.vysledek).toBe(DENNI_STROP - 200);
    expect(krystaly(r.s)).toBe(DENNI_STROP);
    expect(pripis(r.s, 10, "2026-11-17").vysledek).toBe(10);
  });

  test("dokončený trénink: +10 jednou denně, denní truhla, zlatá po 5 dnech v týdnu", () => {
    let s = s0();
    const a = dokoncenyTrenink(s, "2026-11-16");
    expect(a.vysledek).toEqual({ krystaly: 10, denniNove: true, zlataNove: false });
    expect(dostupnostTruhly(a.s, "denni", "2026-11-16").ok).toBe(true);
    const b = dokoncenyTrenink(a.s, "2026-11-16");
    expect(b.vysledek.krystaly).toBe(0);
    expect(b.vysledek.denniNove).toBe(false);
    s = b.s;
    for (const d of ["2026-11-17", "2026-11-18", "2026-11-19"]) s = dokoncenyTrenink(s, d).s;
    expect(dostupnostTruhly(s, "zlata", "2026-11-19").ok).toBe(false);
    const paty = dokoncenyTrenink(s, "2026-11-20");
    expect(paty.vysledek.zlataNove).toBe(true);
    expect(dostupnostTruhly(paty.s, "zlata", "2026-11-20").ok).toBe(true);
    // další týden se počítá znovu
    expect(dostupnostTruhly(paty.s, "zlata", "2026-11-23").ok).toBe(false);
  });

  test("odhad bodů: první měření je základ, krystaly jen za nový rekord", () => {
    let s = s0();
    let r = zapocitejOdhad(s, 9, 20, "2026-11-16");
    expect(r.vysledek).toBe(0);
    s = r.s;
    r = zapocitejOdhad(s, 9, 22, "2026-11-16");
    expect(r.vysledek).toBe(60);
    s = r.s;
    expect(zapocitejOdhad(s, 9, 21, "2026-11-17").vysledek).toBe(0);
    expect(zapocitejOdhad(s, 9, 22, "2026-11-17").vysledek).toBe(0);
    expect(etapaHexika(s.maxOdhad[9])).toBe(2);
    expect(etapaHexika(undefined)).toBe(1);
    expect(etapaHexika(43)).toBe(5);
  });

  test("truhly: cena, denní jen jednou, pojistka vzácné, duplicita vrátí krystaly", () => {
    const den = "2026-11-16";
    // nedostatek krystalů
    expect(otevriTruhlu(s0(), "krystalova", 9, den).vysledek).toBeNull();
    // krystalová stojí 100
    const plny = s0({ ziskano: 5000 });
    const r = otevriTruhlu(plny, "krystalova", 9, den, () => 0.99);
    expect(r.vysledek?.vz).toBe("bezna");
    expect(r.s.utraceno).toBe(100);
    expect(r.s.mam).toHaveLength(1);
    // pojistka: po 9 truhlách bez vzácné je 10. aspoň vzácná
    const smula = s0({ ziskano: 5000, bezVzacne: POJISTKA_VZACNA - 1 });
    const p = otevriTruhlu(smula, "krystalova", 9, den, () => 0.99);
    expect(["vzacna", "legenda"]).toContain(p.vysledek?.vz);
    expect(p.s.bezVzacne).toBe(0);
    // mistrovská dá vždy aspoň vzácnou
    expect(["vzacna", "legenda"]).toContain(otevriTruhlu(plny, "mistrovska", 5, den, () => 0.99).vysledek?.vz);
    // duplicita: všechny běžné už má → vrátí krystaly
    const vsechnyBezne = ODMENY[9].filter((o) => o.vz === "bezna" && o.cena !== 0).map((o) => o.id);
    const d = otevriTruhlu(s0({ ziskano: 5000, mam: vsechnyBezne }), "krystalova", 9, den, () => 0.99);
    expect(d.vysledek?.nova).toBe(false);
    expect(d.vysledek!.krystaly).toBeGreaterThanOrEqual(50);
    // denní jen po tréninku a jen jednou
    expect(dostupnostTruhly(s0(), "denni", den).ok).toBe(false);
    const odemcena = dokoncenyTrenink(s0(), den).s;
    const otevrena = otevriTruhlu(odemcena, "denni", 9, den).s;
    expect(dostupnostTruhly(otevrena, "denni", den).ok).toBe(false);
    // z truhly padají jen věci vlastní třídy
    expect(r.s.mam.every((id) => id.startsWith("9-"))).toBe(true);
  });

  test("šatník: koupit, nasadit, legendární nejde koupit", () => {
    let s = s0({ ziskano: 500 });
    expect(nasazena(s, 9, "podoba").klic).toBe("klasik");
    const k = kupOdmenu(s, "9-podoba-neon");
    expect(k.vysledek).toBe(true);
    s = nasadOdmenu(k.s, "9-podoba-neon").s;
    expect(nasazena(s, 9, "podoba").klic).toBe("neon");
    expect(krystaly(s)).toBe(100);
    expect(kupOdmenu(s0({ ziskano: 5000 }), "9-podoba-zlaty").vysledek).toBe(false);
    expect(nasadOdmenu(s0(), "9-podoba-kyber").vysledek).toBe(false);
  });

  test("sloučení dvou zařízení neztratí krystaly ani odměny", () => {
    const a = s0({ ziskano: 300, utraceno: 100, mam: ["9-podoba-neon"], t: 1 });
    const b = s0({ ziskano: 250, utraceno: 150, mam: ["9-efekt-konfety"], t: 2, nasazeno: { 9: { efekt: "9-efekt-konfety" } } });
    const m = slucSbirku(a, b);
    expect(m.ziskano).toBe(300);
    expect(m.utraceno).toBe(150);
    expect(m.mam.sort()).toEqual(["9-efekt-konfety", "9-podoba-neon"]);
    expect(m.nasazeno[9]?.efekt).toBe("9-efekt-konfety");
  });
});

test("stránka Hexík: koupit a nasadit podobu, otevřít truhlu za krystaly", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("matemax-trida", "9");
    localStorage.setItem("matemax-sbirka", JSON.stringify({ v: 1, ziskano: 1000, utraceno: 0, mam: [], nasazeno: {}, dnes: { d: "", k: 0 }, denniOdemcena: null, denniOtevrena: null, dnyTreninku: [], zlataOtevrena: null, bezVzacne: 0, bezLegendy: 0, otevreno: 0, maxOdhad: {}, dny: {}, t: 1 }));
  });
  await page.goto("/sbirka");
  await expect(page.getByTestId("sbirka-krystaly")).toContainText("1000");
  await expect(page.getByTestId("otevrit-denni")).toBeDisabled();
  await expect(page.getByTestId("otevrit-mistrovska")).toBeEnabled();

  await page.getByTestId("otevrit-krystalova").click();
  await expect(page.getByTestId("odhaleni")).toContainText(/běžná|neobvyklá|vzácná|legendární/, { timeout: 15000 });
  await page.getByTestId("odhaleni-hotovo").click();
  await expect(page.getByTestId("sbirka-krystaly")).not.toContainText("1000 ");

  await page.getByTestId("zalozka-satnik").click();
  await page.getByTestId("odmena-neon").click();
  const akce = page.getByTestId("satnik-akce");
  if (await akce.textContent().then((t) => /Koupit/.test(t ?? ""))) await akce.click();
  else if (await akce.textContent().then((t) => /Nasadit/.test(t ?? ""))) await akce.click();
  await expect(akce).toHaveText("Nasazeno");
  // 9. třída nevidí odměny 5. třídy
  await expect(page.getByTestId("odmena-kocicka")).toHaveCount(0);
});

test("stránka Hexík: páťák vidí jen odměny 5. třídy", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
  await page.goto("/sbirka?tab=satnik");
  await expect(page.getByTestId("odmena-kocicka")).toBeVisible();
  await expect(page.getByTestId("odmena-neon")).toHaveCount(0);
});

test("Hexík u příkladu: po správné odpovědi zajásá a připíše krystaly", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto("/trenink?tema=zlomky");
  await expect(page.getByTestId("hexik-parta")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("hexik-krystaly")).toHaveText("0");

  const input = page.getByPlaceholder("Tvoje odpověď");
  const skip = page.getByRole("button", { name: /Přeskočit úlohu/ });
  for (let i = 0; i < 25 && (await input.count()) === 0; i++) {
    if ((await skip.count()) === 0) break;
    await skip.first().click();
    await page.waitForTimeout(150);
  }
  test.skip((await input.count()) === 0, "žádná úloha s psaním");
  const id = await page.getByTestId("sezeni").getAttribute("data-aktualni");
  const priklad = allExamples.find((e) => e.id === id)!;
  await input.fill(String(priklad.odpoved));
  await input.press("Enter");
  await expect(page.getByTestId("hexik-bublina")).not.toHaveText(" ", { timeout: 3000 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("hexik-krystaly")).not.toHaveText("0", { timeout: 3000 });
});
