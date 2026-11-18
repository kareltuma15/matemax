import { test, expect } from "@playwright/test";
import {
  ODMENY, SADY, SEZONY, vychoziStav, aktualniSezona, konecSezony, jeVNabidce, najdiOdmenu, kupOdmenu, otevriTruhlu,
  dostupnostTruhly, zapisSady, slucSbirku, postupSady, krystaly, type SbirkaStav,
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

  test("sady: všechny věci existují a patří ke své třídě; bonus jen jednou", () => {
    for (const t of [5, 9] as const) {
      expect(new Set(SADY[t].map((sd) => sd.id)).size).toBe(SADY[t].length);
      for (const sd of SADY[t]) {
        for (const id of sd.polozky) {
          const o = najdiOdmenu(id);
          expect(o, id).toBeTruthy();
          expect(o!.trida).toBe(t);
          if (sd.sezona) expect(o!.sezona, id).toBe(sd.sezona);
        }
      }
    }
    const ovoce = SADY[5].find((sd) => sd.id === "5-ovoce")!;
    let s = s0({ mam: ovoce.polozky.slice(0, 3) });
    expect(postupSady(s, ovoce)).toEqual({ mam: 3, z: 4 });
    expect(zapisSady(s, "2026-11-20").vysledek.ids).toEqual([]);
    s = { ...s, mam: [...s.mam, ovoce.polozky[3]] };
    const r = zapisSady(s, "2026-11-20");
    expect(r.vysledek).toEqual({ ids: ["5-ovoce"], krystaly: ovoce.bonus });
    expect(krystaly(r.s)).toBe(ovoce.bonus);
    expect(zapisSady(r.s, "2026-11-21").vysledek.ids).toEqual([]);
    const m = slucSbirku(s0({ sady: { "5-ovoce": "2026-11-21" }, t: 1 }), s0({ sady: { "5-ovoce": "2026-11-20", "9-kyber": "2026-11-22" }, t: 2 }));
    expect(m.sady).toEqual({ "5-ovoce": "2026-11-20", "9-kyber": "2026-11-22" });
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

test("dokončená sada: ohlášení s bonusem a zlatý rámeček v Sadách", async ({ page }) => {
  await page.addInitScript((s) => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-sbirka", s); },
    stav({ ziskano: 1000, mam: ["9-podoba-neon", "9-podoba-kyber", "9-vzhled-matrix"] }));
  await page.goto("/sbirka?tab=satnik");
  await page.getByTestId("typ-pozadi").click();
  await page.getByTestId("odmena-mrizka").click();
  await page.getByTestId("satnik-akce").click(); // koupit za 150 → sada Kyber je kompletní
  await expect(page.getByTestId("nova-trofej")).toContainText("Sada Kyber je kompletní! +400 krystalů");
  await page.getByTestId("zalozka-sady").click();
  await expect(page.getByTestId("sada-9-kyber")).toHaveAttribute("data-hotovo", "1");
});
