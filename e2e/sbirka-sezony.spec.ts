import { test, expect } from "@playwright/test";
import {
  ODMENY, SADY, SEZONY, vychoziStav, aktualniSezona, konecSezony, jeVNabidce, najdiOdmenu, kupOdmenu, otevriTruhlu,
  dostupnostTruhly, zapisSady, slucSbirku, postupSady, krystaly, efektHexika, domovHexika, nastavEfekt, nastavDomov, slotyHexika, type SbirkaStav,
} from "../src/lib/sbirka";
import { hexikSvg } from "../src/lib/hexik-svg";

// Sbírka MateMax: sezónní odměny a sady (17. 11. 2026).

const s0 = (zmeny: Partial<SbirkaStav> = {}): SbirkaStav => ({ ...vychoziStav(), ...zmeny });

test.describe("sezóny a sady: pravidla", () => {
  test("kalendář sezón včetně přechodu přes Nový rok", () => {
    expect(aktualniSezona("2026-11-30")).toBeNull();
    expect(aktualniSezona("2026-12-01")?.id).toBe("vanoce");
    expect(aktualniSezona("2027-01-06")?.id).toBe("vanoce");
    expect(aktualniSezona("2027-01-07")?.id).toBe("zima");
    expect(aktualniSezona("2027-02-28")?.id).toBe("zima");
    expect(aktualniSezona("2027-03-01")?.id).toBe("finis");
    expect(aktualniSezona("2027-04-30")?.id).toBe("finis");
    expect(aktualniSezona("2027-05-01")).toBeNull();
    const v = SEZONY.find((z) => z.id === "vanoce")!;
    expect(konecSezony(v, "2026-12-10")).toBe("2027-01-06");
    expect(konecSezony(v, "2027-01-02")).toBe("2027-01-06");
  });

  test("katalog: každá sezóna má věci v obou třídách, legendární jen z truhel, sezónní podoby mají kresbu", () => {
    for (const t of [5, 9] as const) {
      for (const z of SEZONY) expect(ODMENY[t].filter((o) => o.sezona === z.id).length, `${t}/${z.id}`).toBeGreaterThanOrEqual(2);
      expect(ODMENY[t].filter((o) => o.sezona && o.vz === "legenda").every((o) => o.cena === null)).toBe(true);
    }
    for (const k of ["skritek", "santa", "snehulak", "yeti", "sampion", "finisher"]) expect(hexikSvg(k), k).not.toBe(hexikSvg("klasik"));
  });

  test("sezónní věc jde koupit jen v sezóně, mimo ni zůstane tomu, kdo ji má", () => {
    const id = "5-podoba-skritek";
    const o = najdiOdmenu(id)!;
    expect(jeVNabidce(o, "2026-11-20")).toBe(false);
    expect(jeVNabidce(o, "2026-12-20")).toBe(true);
    expect(kupOdmenu(s0({ ziskano: 2000 }), id, "2026-11-20").vysledek).toBe(false);
    const k = kupOdmenu(s0({ ziskano: 2000 }), id, "2026-12-20");
    expect(k.vysledek).toBe(true);
    expect(k.s.mam).toContain(id);
  });

  test("sezónní truhla: jen v sezóně a jen sezónní věci; běžné truhly mimo sezónu sezónní věci nedávají", () => {
    expect(dostupnostTruhly(s0({ ziskano: 1000 }), "sezonni", "2026-11-20").ok).toBe(false);
    let s = s0({ ziskano: 10000 });
    expect(dostupnostTruhly(s, "sezonni", "2026-12-20").ok).toBe(true);
    for (let i = 0; i < 12; i++) {
      const r = otevriTruhlu(s, "sezonni", 9, "2026-12-20");
      expect(r.vysledek?.odmena?.sezona).toBe("vanoce");
      s = r.s;
    }
    let b = s0({ ziskano: 100000 });
    for (let i = 0; i < 60; i++) {
      const r = otevriTruhlu(b, "mistrovska", 5, "2026-11-20");
      expect(r.vysledek?.odmena?.sezona).toBeUndefined();
      b = r.s;
    }
  });

  test("sady podle pravidel 19. 11.: 3–5 věcí různých druhů, žádné běžné, každá věc v jedné sadě", () => {
    const videno = new Map<string, string>();
    for (const t of [5, 9] as const) {
      expect(new Set(SADY[t].map((sd) => sd.id)).size).toBe(SADY[t].length);
      for (const sd of SADY[t]) {
        const druhy = new Set<string>();
        for (const id of sd.polozky) {
          const o = najdiOdmenu(id);
          expect(o, id).toBeTruthy();
          expect(o!.trida).toBe(t);
          if (sd.sezona) expect(o!.sezona, id).toBe(sd.sezona);
          if (sd.puvod === "kalendar") expect(o!.zdroj, id).toBe("kalendar");
          if (!sd.zacatecnicka) expect(o!.vz, id).not.toBe("bezna");
          expect(videno.get(id), `${id} je i v ${videno.get(id)}`).toBeUndefined();
          videno.set(id, sd.id);
          druhy.add(o!.typ);
        }
        if (!sd.puvod) {
          expect(sd.polozky.length, sd.id).toBeGreaterThanOrEqual(3);
          expect(sd.polozky.length, sd.id).toBeLessThanOrEqual(5);
          if (!sd.zacatecnicka) expect(druhy.size, sd.id).toBe(sd.polozky.length);
        }
        expect(sd.bonus).toBeLessThanOrEqual(250);
      }
    }
    expect(SADY[5].find((sd) => sd.id === "5-vanoce")!.domov).toEqual({ id: "vanocni-pokojicek", nazev: "Vánoční pokojíček", hotovy: true });
  });

  test("sady: za polovinu efekt kolem Hexíka, za celou domov a bonus jen jednou", () => {
    const vanoce = SADY[9].find((sd) => sd.id === "9-vanoce")!;
    let s = s0({ mam: vanoce.polozky.slice(0, 1) });
    expect(postupSady(s, vanoce)).toMatchObject({ mam: 1, z: 4, polovina: 2, efekt: false, hotovo: false });
    expect(zapisSady(s, "2026-12-05").vysledek).toEqual({ ids: [], krystaly: 0, poloviny: [] });
    // Polovina: efekt se zapne sám a objeví se na Hexíkovi
    s = zapisSady({ ...s, mam: vanoce.polozky.slice(0, 2) }, "2026-12-05").s;
    expect(s.polovinySad).toEqual({ "9-vanoce": "2026-12-05" });
    expect(efektHexika(s, 9)).toBe("snih");
    expect(slotyHexika(s, 9).okoli).toBe("snih");
    expect(krystaly(s)).toBe(0);
    // Vypnutý efekt zůstane vypnutý i po dalších sadách
    s = nastavEfekt(s, 9, null).s;
    expect(slotyHexika(s, 9).okoli).toBeUndefined();
    // Celá sada: domov (pokojíček je hotový, nastaví se sám) a bonus
    const r = zapisSady({ ...s, mam: [...vanoce.polozky] }, "2026-12-08");
    expect(r.vysledek).toEqual({ ids: ["9-vanoce"], krystaly: vanoce.bonus, poloviny: [] });
    expect(domovHexika(r.s, 9)?.id).toBe("vanocni-pokojicek");
    expect(r.s.okoli?.[9]).toBeNull();
    expect(zapisSady(r.s, "2026-12-09").vysledek.ids).toEqual([]);
    // Nehotový domov nejde nastavit, cizí třída taky ne
    const zv = SADY[5].find((sd) => sd.id === "5-zviratka")!; // Paseka zatím není hotová
    const m = zapisSady(s0({ mam: [...zv.polozky] }), "2026-11-20").s;
    expect(m.domov?.[5]).toBeUndefined();
    expect(nastavDomov(m, 5, "5-zviratka").vysledek).toBe(false);
    expect(nastavEfekt(m, 9, "5-zviratka").vysledek).toBe(false);
    expect(efektHexika(m, 5)).toBe("motylci");
    // Podmořský svět už hotový je: po dokončení Pod mořem se nastaví sám
    const more = SADY[5].find((sd) => sd.id === "5-more")!;
    expect(domovHexika(zapisSady(s0({ mam: [...more.polozky] }), "2026-11-20").s, 5)?.id).toBe("podmorsky-svet");
  });

  test("sady: kdo sadu dokončil podle dřívějšího složení, má efekt i domov dál; slučování dvou zařízení", () => {
    const kyber = SADY[9].find((sd) => sd.id === "9-kyber")!;
    const s = s0({ sady: { "9-kyber": "2026-11-18" } });
    expect(postupSady(s, kyber)).toMatchObject({ efekt: true, hotovo: true });
    expect(nastavEfekt(s, 9, "9-kyber").vysledek).toBe(true);
    const m = slucSbirku(
      s0({ sady: { "5-ovoce": "2026-11-21" }, polovinySad: { "9-led": "2026-11-20" }, okoli: { 9: "9-led" }, t: 1 }),
      s0({ sady: { "5-ovoce": "2026-11-20", "9-kyber": "2026-11-22" }, polovinySad: { "9-led": "2026-11-19" }, okoli: { 9: "9-kyber" }, t: 2 }),
    );
    expect(m.sady).toEqual({ "5-ovoce": "2026-11-20", "9-kyber": "2026-11-22" });
    expect(m.polovinySad).toEqual({ "9-led": "2026-11-19" });
    expect(m.okoli).toEqual({ 9: "9-kyber" });
  });

  test("pojistka sad: legenda z truhly doplní rozdělanou sadu", () => {
    // Kouzelník: klobouk a hvězdné brýle (2 ze 4) → legendární Kouzelnické rukavice mají přednost
    for (const r of [0.01, 0.37, 0.73, 0.99]) {
      const s = s0({ mam: ["5-hlava-klobouk", "5-oci-hvezdicky"], bezLegendy: 999 });
      const v = otevriTruhlu(s, "denni", 5, "2026-11-20", () => r, true).vysledek!;
      expect(v.vz).toBe("legenda");
      expect(v.odmena?.id).toBe("5-ruce-kouzelnicke");
    }
    // Bez rozdělané sady padá jakákoli legenda
    const ids = new Set([0.01, 0.5, 0.99].map((r) => otevriTruhlu(s0({ bezLegendy: 999 }), "denni", 5, "2026-11-20", () => r, true).vysledek!.odmena?.id));
    expect(ids.size).toBeGreaterThan(1);
  });
});

const stav = (zmeny: Record<string, unknown>) => JSON.stringify({ ...vychoziStav(), t: 1, ...zmeny });

test("Vánoce ve Sbírce: pruh sezóny, Vánoční truhla a sezónní věci v šatníku", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-12-10T10:00:00"));
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "5"); localStorage.setItem("matemax-sbirka", s); }, stav({ ziskano: 3000 }));
  await page.goto("/sbirka");
  await expect(page.getByTestId("sezona-pruh")).toHaveAttribute("data-sezona", "vanoce");
  await expect(page.getByTestId("sezona-pruh")).toContainText("6. 1.");
  await expect(page.getByTestId("truhla-sezonni")).toContainText("Vánoční truhla");
  await page.getByTestId("otevrit-sezonni").click();
  await expect(page.getByTestId("odhaleni")).toContainText(/neobvyklá|vzácná|legendární|běžná/, { timeout: 15000 });
  await page.getByTestId("odhaleni-hotovo").click();

  await page.getByTestId("zalozka-satnik").click();
  await expect(page.getByTestId("sezonni-skritek")).toContainText("do 6. 1.");
  await page.getByTestId("zalozka-sady").click();
  await expect(page.getByTestId("sada-5-vanoce")).toContainText("jen do 6. 1.");
});

test("mimo sezónu: sezónní věci nejdou koupit a Vánoční truhla není", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-20T10:00:00"));
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-sbirka", s); }, stav({ ziskano: 3000 }));
  await page.goto("/sbirka");
  await expect(page.getByTestId("sezona-pruh")).toHaveCount(0);
  await expect(page.getByTestId("truhla-sezonni")).toHaveCount(0);
  await page.getByTestId("zalozka-satnik").click();
  await page.getByTestId("odmena-santa").click();
  await expect(page.getByTestId("satnik-akce")).toHaveText("Jen v sezóně");
  await expect(page.getByTestId("satnik-akce")).toBeDisabled();
});

test("dokončená sada: ohlášení s domovem a bonusem, zlatý rámeček a přepínač efektu v Sadách", async ({ page }) => {
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-sbirka", s); },
    stav({ ziskano: 2000, mam: ["9-podoba-kyber", "9-oci-vizor", "9-vzhled-matrix"], polovinySad: { "9-kyber": "2026-11-18" }, okoli: { 9: "9-kyber" } }));
  await page.goto("/sbirka?tab=satnik");
  await page.getByTestId("typ-oslava").click();
  await page.getByTestId("odmena-teleport").click();
  await page.getByTestId("satnik-akce").click(); // koupit za 900 → sada Kyber je kompletní
  await expect(page.getByTestId("nova-trofej")).toContainText("Sada Kyber je kompletní! Domov Neonová garáž odemčen · +200 krystalů");
  await page.getByTestId("zalozka-sady").click();
  await expect(page.getByTestId("sada-9-kyber")).toHaveAttribute("data-hotovo", "1");
  await expect(page.getByTestId("sada-krok-domov-9-kyber")).toContainText("Hexík se nastěhuje v lednu");
  const prepinac = page.getByTestId("sada-efekt-9-kyber");
  await expect(prepinac).toHaveAttribute("aria-pressed", "true");
  await prepinac.click();
  await expect(prepinac).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("sada-krok-efekt-9-ulice")).toHaveAttribute("data-ok", "0");
});

test("Vánoční sada v Sadách: půlka zapne sněžení, celá nastěhuje Hexíka do pokojíčku", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-12-10T10:00:00"));
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "5"); localStorage.setItem("matemax-sbirka", s); },
    stav({ ziskano: 2000, mam: ["5-podoba-skritek", "5-hlava-cepice", "5-vzhled-snezeni"] }));
  await page.goto("/sbirka?tab=sady", { waitUntil: "commit" });
  await expect(page.getByTestId("nova-trofej")).toContainText("Půlka sady Vánoce! Kolem Hexíka: Sněžení");
  await expect(page.getByTestId("sada-efekt-5-vanoce")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("sada-krok-domov-5-vanoce")).toContainText("ještě 1");
});

test("Vánoční pokojíček: po dokončení sady bydlí Hexík doma a domov jde vypnout", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-12-10T10:00:00"));
  // Vánoční noc je legendární (jen z truhly), tady ji žák už má: při otevření Sbírky se sada dokončí
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-sbirka", s); },
    stav({ ziskano: 500, mam: ["9-podoba-santa", "9-hlava-cepice", "9-vzhled-snezeni", "9-pozadi-vanoce"] }));
  await page.goto("/sbirka?tab=sady");
  const domov = page.getByTestId("domov-hexika");
  await expect(domov).toHaveAttribute("data-domov", "vanocni-pokojicek", { timeout: 20_000 });
  await expect(domov.locator("canvas")).toHaveCount(1);
  await expect(page.getByTestId("sada-9-vanoce")).toHaveAttribute("data-hotovo", "1");
  await page.getByTestId("sada-domov-9-vanoce").click();
  await expect(page.getByTestId("domov-hexika")).toHaveCount(0);
  await expect(page.getByTestId("sada-domov-9-vanoce")).toHaveText("Nastěhovat Hexíka");
});
