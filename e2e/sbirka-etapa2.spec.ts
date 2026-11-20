import { test, expect } from "@playwright/test";
import {
  ODMENY, TRUHLY, vychoziStav, krystaly, otevriTruhlu, dostupnostTruhly, slucSbirku, nasadOdmenu, kupOdmenu,
  ziskejDoporuceni, doporuceniKOtevreni, novaZvladnutaTemata, dnesniMise, misePriOdpovedi, splnMise, postupMise,
  zapisOdpoved, dokoncenyTrenink, tydenSbirky, ZA_MISI, DENNI_STROP, TMAVE_VZHLEDY, type SbirkaStav,
} from "../src/lib/sbirka";
import { buildReportHtml } from "../src/lib/report-rodice";

// Sekce Hexík načítá 3D pokojíček; bez grafické karty v souběžných testech pomalu
test.beforeEach(() => test.slow());

// Sbírka MateMax, 2. etapa (17. 11. 2026): vzhled appky, pozadí profilu, Truhla doporučení, denní mise, odměny v e-mailu rodičům.

const s0 = (zmeny: Partial<SbirkaStav> = {}): SbirkaStav => ({ ...vychoziStav(), ...zmeny });
const DEN = "2026-11-18";

test.describe("2. etapa: pravidla", () => {
  test("katalog: vzhled i pozadí mají zdarma klasik, legendární jen z truhly, tmavé vzhledy jsou v katalogu", () => {
    for (const t of [5, 9] as const) {
      for (const typ of ["vzhled", "pozadi"] as const) {
        const o = ODMENY[t].filter((x) => x.typ === typ);
        expect(o.filter((x) => x.cena === 0).map((x) => x.klic), `${t}/${typ}`).toEqual(["klasik"]);
        expect(o.some((x) => x.vz === "legenda" && x.cena === null), `${t}/${typ}`).toBe(true);
      }
    }
    const vzhledy = new Set([...ODMENY[5], ...ODMENY[9]].filter((x) => x.typ === "vzhled").map((x) => x.klic));
    for (const k of TMAVE_VZHLEDY) expect(vzhledy.has(k), k).toBe(true);
    expect(TRUHLY.find((t) => t.id === "doporuceni")?.cena).toBeNull();
  });

  test("Truhla doporučení: za každé doporučení jen jednou, otevřít jde jen tolikrát, kolik jich žák získal", () => {
    let s = s0();
    expect(dostupnostTruhly(s, "doporuceni", DEN).ok).toBe(false);
    s = ziskejDoporuceni(s, "tema:zlomky").s;
    const znovu = ziskejDoporuceni(s, "tema:zlomky");
    expect(znovu.vysledek).toBe(false);
    s = ziskejDoporuceni(znovu.s, "plan:2026-11-15T10:00:00Z").s;
    expect(doporuceniKOtevreni(s)).toBe(2);
    const a = otevriTruhlu(s, "doporuceni", 9, DEN, () => 0.5);
    expect(a.vysledek).not.toBeNull();
    expect(["neobvykla", "vzacna", "legenda"]).toContain(a.vysledek!.vz);
    expect(doporuceniKOtevreni(a.s)).toBe(1);
    const b = otevriTruhlu(a.s, "doporuceni", 9, DEN, () => 0.5);
    expect(doporuceniKOtevreni(b.s)).toBe(0);
    expect(otevriTruhlu(b.s, "doporuceni", 9, DEN).vysledek).toBeNull();
    expect(b.s.dny[DEN].tr).toBe(2);
  });

  test("zvládnuté téma: truhlu dá jen téma, které v tréninku přešlo přes práh", () => {
    expect(novaZvladnutaTemata({ zlomky: 60, rovnice: 80 }, { zlomky: 72, rovnice: 85, uhly: 40 }, 70)).toEqual(["zlomky"]);
    expect(novaZvladnutaTemata(null, { zlomky: 90 }, 70)).toEqual([]);
  });

  test("denní mise: tři na den, první je vždy trénink, a střídají se", () => {
    const dny = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"];
    const sady = dny.map(dnesniMise);
    for (const m of sady) {
      expect(m).toHaveLength(3);
      expect(m[0]).toBe("trenink");
      expect(new Set(m).size).toBe(3);
    }
    expect(new Set(sady.map((m) => m.join())).size).toBeGreaterThan(1);
  });

  test("denní mise: série, těžké příklady a dokončený trénink, +15 za každou a jen jednou", () => {
    // den, kdy jsou mise trénink + série 5 + 3 těžší příklady
    const den = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].find((d) => dnesniMise(d).join() === "trenink,serie5,tezke3")!;
    expect(den).toBeTruthy();
    let s = s0();
    let k = 0;
    for (let i = 0; i < 5; i++) {
      s = misePriOdpovedi(zapisOdpoved(s, true, den), true, 2, den);
      const r = splnMise(s, den);
      s = r.s; k += r.vysledek.krystaly;
    }
    expect(postupMise(s, "serie5", den)).toBe(5);
    expect(s.mise.hotove.sort()).toEqual(["serie5", "tezke3"]);
    expect(k).toBe(2 * ZA_MISI);
    // chyba sérii vynuluje, ale splněná mise zůstane
    s = misePriOdpovedi(s, false, 1, den);
    expect(s.mise.serie).toBe(0);
    expect(splnMise(s, den).vysledek.nove).toEqual([]);
    // dokončený trénink splní třetí misi
    s = dokoncenyTrenink(s, den).s;
    const t = splnMise(s, den);
    expect(t.vysledek.nove).toEqual(["trenink"]);
    expect(t.s.dny[den].m).toBe(3);
    // druhý den začíná od nuly
    expect(postupMise(t.s, "serie5", "2026-12-01")).toBe(0);
  });

  test("mise podléhají dennímu stropu krystalů za učení", () => {
    const den = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].find((d) => dnesniMise(d).includes("spravne10"))!;
    let s = s0({ dnes: { d: den, k: DENNI_STROP }, ziskano: DENNI_STROP });
    for (let i = 0; i < 10; i++) s = zapisOdpoved(s, true, den);
    const r = splnMise(s, den);
    expect(r.vysledek.nove).toContain("spravne10");
    expect(r.vysledek.krystaly).toBe(0);
    expect(krystaly(r.s)).toBe(DENNI_STROP);
  });

  test("sloučení zařízení: doporučení i mise se neztratí", () => {
    const a = s0({ naroky: { doporuceni: ["tema:zlomky"] }, otevrenoNaroku: { doporuceni: 1 }, mise: { d: DEN, hotove: ["serie5"], serie: 2, maxSerie: 5, tezke: 1 }, dny: { [DEN]: { n: 4, ok: 3, m: 1 } }, t: 1 });
    const b = s0({ naroky: { doporuceni: ["plan:x"] }, otevrenoNaroku: { doporuceni: 0 }, mise: { d: DEN, hotove: ["trenink"], serie: 0, maxSerie: 1, tezke: 3 }, dny: { [DEN]: { n: 6, ok: 2, tr: 2 } }, t: 2 });
    const m = slucSbirku(a, b);
    expect([...(m.naroky.doporuceni ?? [])].sort()).toEqual(["plan:x", "tema:zlomky"]);
    expect(doporuceniKOtevreni(m)).toBe(1);
    expect(m.mise.hotove.sort()).toEqual(["serie5", "trenink"]);
    expect(m.mise.tezke).toBe(3);
    expect(m.dny[DEN]).toEqual({ n: 6, ok: 3, m: 1, tr: 2 });
  });

  test("týden pro e-mail rodičům a blok Odměny za učení", () => {
    const s = s0({ t: 1, dnyTreninku: ["2026-11-09", "2026-11-16", "2026-11-18"], dny: { "2026-11-15": { n: 9, ok: 9, m: 3, tr: 1 }, "2026-11-16": { n: 5, ok: 4, m: 2, tr: 1 }, "2026-11-18": { n: 3, ok: 3, m: 1 } } });
    expect(tydenSbirky(s, "2026-11-22")).toMatchObject({ dnyTreninku: 2, mise: 3, truhly: 1 });
    expect(tydenSbirky(s0(), "2026-11-22")).toBeNull();
    const zaklad = {
      childName: "Ema", weekDate: "x", weekTotal: 10, lastWeekTotal: 5, streak: 2, accuracy: 70,
      odhad: { trida: 5 as const, celkem: 0, max: 50, bezDat: true, cil: null, temata: [], nejvicBodu: null, tydny: [], zmena: null },
    };
    const html = buildReportHtml({ ...zaklad, odmeny: tydenSbirky(s, "2026-11-22") });
    expect(html).toContain("Odměny za učení");
    expect(html).toContain("2 dny tréninku");
    expect(html).toContain("3 splněné denní mise");
    expect(html).toContain("1 otevřená truhla");
    expect(buildReportHtml({ ...zaklad, odmeny: null })).not.toContain("Odměny za učení");
  });
});

const stav = (zmeny: Record<string, unknown>) => JSON.stringify({ ...vychoziStav(), t: 1, ...zmeny });

test("vzhled appky: v Obchůdku se zkouší naživo, po koupi a nasazení platí v celé appce", async ({ page }) => {
  test.slow(); // sekce Hexík načítá 3D pokojíček, bez grafické karty pomalu
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("hotovo")) {
      localStorage.setItem("matemax-trida", "9");
      localStorage.setItem("matemax-sbirka", s);
      sessionStorage.setItem("hotovo", "1");
    }
  }, stav({ ziskano: 2000 }));
  await page.goto("/sbirka?tab=obchudek");
  await page.getByTestId("typ-vzhled").click();
  await page.getByTestId("odmena-mesto").click();
  await expect(page.locator("html")).toHaveAttribute("data-vzhled", "mesto");
  await expect(page.locator("html")).toHaveAttribute("data-vzhled-tmavy", "");
  // zpět na truhly = vrátí se nasazený (klasik)
  await page.getByTestId("zalozka-truhly").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-vzhled", /./);

  await page.getByTestId("zalozka-obchudek").click();
  await page.getByTestId("typ-vzhled").click();
  await page.getByTestId("odmena-ocean").click();
  await page.getByTestId("satnik-akce").click(); // koupit
  await expect(page.getByTestId("satnik-akce")).toHaveText("Nasazeno");
  await page.goto("/testy");
  await expect(page.locator("html")).toHaveAttribute("data-vzhled", "ocean");
  await expect(page.locator("html")).not.toHaveAttribute("data-vzhled-tmavy", /.*/);
  // páťák stejné zařízení: vzhled 9. třídy se ho netýká
  await page.evaluate(() => localStorage.setItem("matemax-trida", "5"));
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-vzhled", /./);
});

// Profil je jen pro přihlášené (na ostré databázi se testovací účty nezakládají), proto se ověřuje hlavička Sbírky,
// která bere pozadí ze stejného místa (nasazena(…, "pozadi")).
test("pozadí profilu: nasazené pozadí je v hlavičce Sbírky a náhled pozadí v šatníku", async ({ page }) => {
  await page.addInitScript((s) => {
    localStorage.setItem("matemax-trida", "9");
    localStorage.setItem("matemax-sbirka", s);
  }, stav({ mam: ["9-pozadi-synthwave"], nasazeno: { 9: { pozadi: "9-pozadi-synthwave" } } }));
  await page.goto("/sbirka");
  await expect(page.getByTestId("sbirka-hlavicka")).toHaveAttribute("data-pozadi", "synthwave");
  await page.getByTestId("zalozka-obchudek").click();
  await page.getByTestId("typ-pozadi").click();
  await page.getByTestId("odmena-zapad").click();
  await expect(page.getByTestId("satnik-nahled-pozadi")).toHaveAttribute("data-pozadi", "zapad");
});

test("Sbírka: denní mise s plamínkem a Truhla doporučení, když na ni má žák nárok", async ({ page }) => {
  await page.addInitScript((s) => {
    localStorage.setItem("matemax-trida", "5");
    localStorage.setItem("matemax-sbirka", s);
  }, stav({ naroky: { doporuceni: ["tema:p5_zlomky"] } }));
  await page.goto("/sbirka");
  await expect(page.getByTestId("denni-mise")).toBeVisible();
  await expect(page.getByTestId("mise-trenink")).toBeVisible();
  await expect(page.getByTestId("mise-pocet")).toHaveText("0/3");
  await expect(page.getByTestId("truhla-doporuceni")).toContainText("čeká 1");
  await page.getByTestId("otevrit-doporuceni").click();
  await expect(page.getByTestId("odhaleni")).toContainText(/neobvyklá|vzácná|legendární/, { timeout: 15000 });
  await page.getByTestId("odhaleni-hotovo").click();
  await expect(page.getByTestId("otevrit-doporuceni")).toBeDisabled();
});

test("nákup a nasazení vzhledu nejde bez krystalů ani u legendárního", () => {
  expect(kupOdmenu(s0({ ziskano: 100 }), "9-vzhled-mesto").vysledek).toBe(false);
  expect(kupOdmenu(s0({ ziskano: 5000 }), "9-vzhled-aurora").vysledek).toBe(false);
  expect(nasadOdmenu(s0(), "5-pozadi-podmori").vysledek).toBe(false);
});
