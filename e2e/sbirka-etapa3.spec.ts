import { test, expect } from "@playwright/test";
import {
  ODMENY, TRUHLY, vychoziStav, otevriTruhlu, dostupnostTruhly, slucSbirku, naroku, ziskejNarok, zapocitejTest,
  vyberBosse, stavBosse, bojSBossem, zapisTrofeje, TROFEJE, krystaly, ZA_BOSSE, pondeli, type SbirkaStav,
} from "../src/lib/sbirka";
import { kodGeneralky, overKodGeneralky, normalizujKod } from "../src/lib/generalka-server";
import { kandidatiNaBosse, bossTydne } from "../src/lib/boss";
import { hexikSvg } from "../src/lib/hexik-svg";

// Sbírka MateMax, 3. etapa (17. 11. 2026): test nanečisto (kód Generálka, zlepšení), Boss týdne, trofeje, nové odměny.

const s0 = (zmeny: Partial<SbirkaStav> = {}): SbirkaStav => ({ ...vychoziStav(), ...zmeny });

test.describe("3. etapa: pravidla", () => {
  test("katalog: pozadí Generálka je jen za test a v truhlách nepadá; nové podoby mají vlastní kresbu", () => {
    for (const t of [5, 9] as const) {
      const g = ODMENY[t].find((o) => o.klic === "generalka" && o.typ === "pozadi");
      expect(g?.zdroj).toBe("test");
      expect(new Set(ODMENY[t].map((o) => o.id)).size).toBe(ODMENY[t].length);
    }
    // legendární truhla s tisíci pokusy nikdy nevylosuje pozadí Generálka
    let s = s0({ naroky: { legendarni: Array.from({ length: 40 }, (_, i) => `x${i}`) } });
    for (let i = 0; i < 40; i++) {
      const r = otevriTruhlu(s, "legendarni", 9, "2026-11-18");
      expect(r.vysledek?.odmena?.klic).not.toBe("generalka");
      expect(r.vysledek?.vz).toBe("legenda");
      s = r.s;
    }
    for (const k of ["boruvka", "lisak", "ledovy", "maskac", "ninja"]) {
      expect(hexikSvg(k), k).not.toBe(hexikSvg("klasik"));
    }
    for (const tr of TRUHLY) expect(Object.values(tr.sance).reduce((a, b) => a + b, 0), tr.id).toBeCloseTo(1, 5);
  });

  test("kód Generálka: stejný pro daný den, sedí i s malými písmeny a bez pomlčky, platí 45 dní", () => {
    const tajne = "testovaci-klic";
    const kod = kodGeneralky(tajne, "2026-12-12");
    expect(kod).toMatch(/^GEN-[A-HJ-NP-Z2-9]{6}$/);
    expect(kodGeneralky(tajne, "2026-12-12")).toBe(kod);
    expect(kodGeneralky(tajne, "2027-01-09")).not.toBe(kod);
    expect(kodGeneralky("jiny-klic", "2026-12-12")).not.toBe(kod);
    expect(normalizujKod(kod.toLowerCase().replace("-", " "))).toBe(kod);
    expect(normalizujKod(kod.slice(4))).toBe(kod);
    expect(overKodGeneralky(tajne, kod, new Date("2026-12-12T12:00:00Z"))).toBe("2026-12-12");
    expect(overKodGeneralky(tajne, kod, new Date("2027-01-20T12:00:00Z"))).toBe("2026-12-12");
    expect(overKodGeneralky(tajne, kod, new Date("2027-02-10T12:00:00Z"))).toBeNull();
    expect(overKodGeneralky(tajne, "GEN-AAAAAA", new Date("2026-12-12T12:00:00Z"))).toBeNull();
  });

  test("test nanečisto: truhla za každý test jednou, pozadí za první, legendární truhla jen za zlepšení", () => {
    let s = s0();
    const a = zapocitejTest(s, 9, "2026-11-14", 21);
    expect(a.vysledek).toEqual({ novy: true, zlepseni: false, pozadi: true });
    s = a.s;
    expect(s.mam).toContain("9-pozadi-generalka");
    expect(naroku(s, "generalka")).toBe(1);
    // stejný test podruhé (kód + výsledek z appky) nic nepřidá
    expect(zapocitejTest(s, 9, "2026-11-14").vysledek).toEqual({ novy: false, zlepseni: false, pozadi: false });
    // horší výsledek: jen truhla Generálka
    const b = zapocitejTest(s, 9, "2026-12-12", 19);
    expect(b.vysledek).toEqual({ novy: true, zlepseni: false, pozadi: false });
    // lepší než minule: Legendární truhla
    const c = zapocitejTest(b.s, 9, "2027-01-09", 25);
    expect(c.vysledek.zlepseni).toBe(true);
    expect(naroku(c.s, "legendarni")).toBe(1);
    expect(naroku(c.s, "generalka")).toBe(3);
    expect(dostupnostTruhly(c.s, "legendarni", "2027-01-10").ok).toBe(true);
    // kód bez bodů zlepšení nedá, body doplněné později už ano
    const d = zapocitejTest(c.s, 9, "2027-01-23");
    expect(d.vysledek.zlepseni).toBe(false);
    const e = zapocitejTest(d.s, 9, "2027-01-23", 30);
    expect(e.vysledek).toMatchObject({ novy: false, zlepseni: true });
  });

  test("Boss týdne: stejný celý týden, jiný další týden, jeden pokus, výhra +100 mimo denní strop", () => {
    for (const t of [5, 9] as const) expect(kandidatiNaBosse(t).length, `${t}. třída`).toBeGreaterThan(20);
    expect(bossTydne(9, "2026-11-16")?.id).toBe(bossTydne(9, "2026-11-22")?.id);
    expect(bossTydne(9, "2026-11-16")?.id).not.toBe(bossTydne(9, "2026-11-23")?.id);
    expect(bossTydne(5, "2026-11-16")?.tema.startsWith("p5_")).toBe(true);
    expect(bossTydne(9, "2026-11-16")?.tema.startsWith("p5_")).toBe(false);
    expect(vyberBosse([], "2026-11-16")).toBeNull();

    let s = s0({ dnes: { d: "2026-11-18", k: 250 }, ziskano: 250 });
    expect(stavBosse(s, "2026-11-18")).toBe("ceka");
    const v = bojSBossem(s, "2026-11-18", true);
    expect(v.vysledek).toEqual({ vyhra: true, krystaly: ZA_BOSSE });
    s = v.s;
    expect(krystaly(s)).toBe(250 + ZA_BOSSE);
    expect(stavBosse(s, "2026-11-20")).toBe("porazen");
    expect(bojSBossem(s, "2026-11-20", true).vysledek).toBeNull();
    // prohra: další týden nový pokus
    const p = bojSBossem(s, "2026-11-25", false);
    expect(p.vysledek).toEqual({ vyhra: false, krystaly: 0 });
    expect(stavBosse(p.s, "2026-11-26")).toBe("prohra");
    expect(stavBosse(p.s, "2026-12-01")).toBe("ceka");
    expect(p.s.boss.porazeno).toEqual([pondeli("2026-11-18")]);
  });

  test("trofeje: přibývají samy, každá jen jednou, s datem", () => {
    let s = s0({ otevreno: 1, boss: { pokusy: ["2026-11-16"], porazeno: ["2026-11-16"] } });
    const a = zapisTrofeje(s, "2026-11-18");
    expect(a.vysledek.sort()).toEqual(["premozitel", "prvni_truhla"]);
    s = a.s;
    expect(s.trofeje.premozitel).toBe("2026-11-18");
    expect(zapisTrofeje(s, "2026-11-19").vysledek).toEqual([]);
    s = zapocitejTest(s, 5, "2026-11-14", 20).s;
    expect(zapisTrofeje(s, "2026-11-19").vysledek).toEqual(["generalka"]);
    expect(new Set(TROFEJE.map((t) => t.id)).size).toBe(TROFEJE.length);
  });

  test("sloučení zařízení: nároky, boss, trofeje i testy se neztratí", () => {
    const a = s0({ naroky: { generalka: ["gen:2026-11-14"] }, otevrenoNaroku: { generalka: 1 }, boss: { pokusy: ["2026-11-09"], porazeno: [] }, trofeje: { generalka: "2026-11-15" }, testy: { "2026-11-14": null }, t: 1 });
    const b = s0({ naroky: { generalka: ["gen:2026-12-12"], legendarni: ["zlepseni:2026-12-12"] }, boss: { pokusy: ["2026-11-16"], porazeno: ["2026-11-16"] }, trofeje: { generalka: "2026-11-20", premozitel: "2026-11-18" }, testy: { "2026-11-14": 21, "2026-12-12": 25 }, t: 2 });
    const m = slucSbirku(a, b);
    expect(naroku(m, "generalka")).toBe(1);
    expect(naroku(m, "legendarni")).toBe(1);
    expect(m.boss).toEqual({ pokusy: ["2026-11-09", "2026-11-16"], porazeno: ["2026-11-16"] });
    expect(m.trofeje).toEqual({ generalka: "2026-11-15", premozitel: "2026-11-18" });
    expect(m.testy).toEqual({ "2026-11-14": 21, "2026-12-12": 25 });
    expect(ziskejNarok(m, "generalka", "gen:2026-12-12").vysledek).toBe(false);
  });
});

const stav = (zmeny: Record<string, unknown>) => JSON.stringify({ ...vychoziStav(), t: 1, ...zmeny });

test("Sbírka: Boss týdne, karta testu nanečisto a záložka Trofeje s Hexíkem, který roste", async ({ page }) => {
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-sbirka", s); }, stav({ otevreno: 2, maxOdhad: { 9: 27 } }));
  await page.goto("/sbirka");
  await expect(page.getByTestId("boss-karta")).toHaveAttribute("data-stav", "ceka");
  await expect(page.getByTestId("boss-utkat")).toHaveAttribute("href", "/trenink?boss=1");
  await expect(page.getByTestId("truhla-generalka")).toContainText("Napiš test nanečisto");
  await expect(page.getByTestId("truhla-legendarni")).toBeVisible();

  // neplatný kód
  await page.getByTestId("kod-generalka").fill("GEN-AAAAAA");
  await page.getByTestId("kod-uplatnit").click();
  await expect(page.getByTestId("kod-vysledek")).toContainText(/neznám|spojit|dostupn/);

  await page.getByTestId("zalozka-trofeje").click();
  await expect(page.getByTestId("trofej-prvni_truhla")).toHaveAttribute("data-ziskana", "1");
  await expect(page.getByTestId("trofej-zkuseny_hexik")).toHaveAttribute("data-ziskana", "1");
  await expect(page.getByTestId("trofej-mistr")).toHaveAttribute("data-ziskana", "0");
  await expect(page.getByTestId("hexik-roste")).toContainText("zatím 27 b.");
});

test("Sbírka: po testu nanečisto je pozadí Generálka ve sbírce a truhly čekají", async ({ page }) => {
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "5"); localStorage.setItem("matemax-sbirka", s); },
    stav({ mam: ["5-pozadi-generalka"], naroky: { generalka: ["gen:2026-11-14"], legendarni: ["zlepseni:2026-12-12"] }, testy: { "2026-11-14": 18, "2026-12-12": 24 } }));
  await page.goto("/sbirka");
  await expect(page.getByTestId("truhla-generalka")).toContainText("čeká 1");
  await expect(page.getByTestId("otevrit-legendarni")).toBeEnabled();
  await page.getByTestId("otevrit-legendarni").click();
  await expect(page.getByTestId("odhaleni")).toContainText("legendární", { timeout: 5000 });
  await page.getByTestId("odhaleni-hotovo").click();
  await page.getByTestId("zalozka-satnik").click();
  await page.getByTestId("typ-pozadi").click();
  await expect(page.getByTestId("odmena-generalka")).toContainText("Máš");
});

test("Boss týdne v tréninku: jedna úloha a po odpovědi výsledek v souhrnu", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-sbirka", s); }, stav({}));
  await page.goto("/trenink?boss=1");
  // Úvodní obrazovka bosse (převzatá ze starého bosse na konci tréninku tématu)
  await expect(page.getByTestId("boss-uvod")).toContainText("+50 XP", { timeout: 20_000 });
  await page.getByTestId("boss-bojovat").click();
  await expect(page.getByTestId("sezeni")).toBeAttached({ timeout: 20_000 });
  const boss = bossTydne(9, new Date().toLocaleDateString("sv-SE"))!;
  await expect(page.getByTestId("sezeni")).toHaveAttribute("data-aktualni", boss.id);
});
