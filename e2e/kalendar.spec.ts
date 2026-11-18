import { test, expect } from "@playwright/test";
import { denAdventu, stavOkna, otevriOkno, oknaKOtevreni, zapocitejTreninkAdvent, vecOkna, OKNA, PORADI_OKEN } from "../src/lib/kalendar";
import { vychoziStav, slucSbirku, TROFEJE, ODMENY, type SbirkaStav } from "../src/lib/sbirka";

// Adventní kalendář (schválil Karel 18. 11. 2026): okénko po tréninku, dohánění, odměny, trofej.

const rnd = () => 0.3;
const den = (d: number) => `2026-12-${String(d).padStart(2, "0")}`;
const trenink = (s: SbirkaStav, d: number, kolikrat = 1) => { let x = s; for (let i = 0; i < kolikrat; i++) x = zapocitejTreninkAdvent(x, den(d)); return x; };

test.describe("Adventní kalendář", () => {
  test("24 okének, sedm vlastních věcí pro každou třídu, nejdou koupit ani vylosovat", () => {
    expect([...PORADI_OKEN].sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(Object.keys(OKNA)).toHaveLength(24);
    for (const t of [5, 9] as const) {
      const veci = ODMENY[t].filter((o) => o.zdroj === "kalendar");
      expect(veci).toHaveLength(7);
      expect(veci.every((o) => o.cena === null)).toBe(true);
      for (const d of [3, 8, 11, 15, 18, 22, 24]) expect(vecOkna(d, t), `den ${d}`).not.toBeNull();
    }
    expect(vecOkna(18, 5)?.klic).toBe("pernicek");
    expect(vecOkna(18, 9)?.klic).toBe("polarni");
    expect([denAdventu("2026-11-30"), denAdventu("2026-12-01"), denAdventu("2026-12-24"), denAdventu("2026-12-25")]).toEqual([null, 1, 24, null]);
  });

  test("dnešní okénko až po tréninku, budoucí zavřená", () => {
    const s = vychoziStav();
    expect(stavOkna(s, den(3), 3)).toBe("dnes-po-treninku");
    expect(otevriOkno(s, 9, den(3), 3, rnd).vysledek).toBeNull();
    const t = trenink(s, 3);
    expect(stavOkna(t, den(3), 3)).toBe("dnes");
    expect(stavOkna(t, den(3), 4)).toBe("budouci");
    expect(oknaKOtevreni(t, den(3))).toBe(1);
    const r = otevriOkno(t, 9, den(3), 3, rnd);
    expect(r.vysledek).toMatchObject({ druh: "vec", nova: true });
    expect(r.vysledek!.odmena!.klic).toBe("parohy");
    expect(r.s.mam).toContain("9-hlava-parohy");
    expect(stavOkna(r.s, den(3), 3)).toBe("otevreno");
    expect(otevriOkno(r.s, 9, den(3), 3, rnd).vysledek).toBeNull();
  });

  test("zmeškané okénko dohoní každý další trénink v jednom dni", () => {
    let s = trenink(vychoziStav(), 5);
    expect(stavOkna(s, den(5), 4)).toBe("zmeskane");
    s = trenink(s, 5);
    expect(stavOkna(s, den(5), 4)).toBe("dohnat");
    expect(oknaKOtevreni(s, den(5))).toBe(2);
    const k0 = s.ziskano;
    const r = otevriOkno(s, 5, den(5), 4, rnd);
    expect(r.vysledek).toMatchObject({ druh: "krystaly", krystaly: 60 });
    expect(r.s.ziskano - k0).toBe(60);
    expect(stavOkna(r.s, den(5), 2)).toBe("zmeskane");
    expect(stavOkna(r.s, den(5), 5)).toBe("dnes");
  });

  test("adventní neděle: sezónní truhla zdarma, nic se neutratí", () => {
    const s = trenink(vychoziStav(), 6);
    const r = otevriOkno(s, 9, den(6), 6, rnd);
    expect(r.vysledek?.druh).toBe("truhla");
    expect(r.vysledek?.truhla).not.toBeNull();
    expect(r.s.utraceno).toBe(0);
    expect(r.vysledek!.odmena?.sezona).toBe("vanoce");
  });

  test("všech 24 okének: trofej Adventní mistr a bonus 300 jen jednou, sloučení zařízení nic neztratí", () => {
    let s = vychoziStav();
    for (let d = 1; d <= 24; d++) { s = trenink(s, d); s = otevriOkno(s, 9, den(d), d, rnd).s; }
    expect(s.advent?.otevreno).toHaveLength(24);
    expect(s.advent?.mistr).toBe(true);
    expect(TROFEJE.find((t) => t.id === "advent_mistr")!.splneno(s)).toBe(true);
    expect(s.mam).toContain("9-hlava-hvezda");
    const a = { ...vychoziStav(), advent: { rok: 2026, otevreno: [1, 2], tr: { d: den(2), n: 1 }, dohnano: { d: "", n: 0 } }, t: 1 };
    const b = { ...vychoziStav(), advent: { rok: 2026, otevreno: [2, 3], tr: { d: den(3), n: 2 }, dohnano: { d: den(3), n: 1 } }, t: 2 };
    expect(slucSbirku(a, b).advent).toMatchObject({ otevreno: [1, 2, 3], tr: { d: den(3), n: 2 } });
  });
});

test("8. prosince: okénko po tréninku jde otevřít ve Sbírce a Domov ukáže kartu kalendáře", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.setFixedTime(new Date("2026-12-08T10:00:00"));
  await page.addInitScript(() => {
    localStorage.setItem("matemax-trida", "9");
    localStorage.setItem("matemax-sbirka", JSON.stringify({ v: 1, ziskano: 0, utraceno: 0, mam: [], nasazeno: {}, dnes: { d: "", k: 0 }, advent: { rok: 2026, otevreno: [1, 2, 3], tr: { d: "2026-12-08", n: 1 }, dohnano: { d: "", n: 0 } }, t: 1 }));
  });
  await page.goto("/sbirka?tab=kalendar");
  await expect(page.getByTestId("adventni-kalendar")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("okno-8")).toHaveAttribute("data-stav", "dnes");
  await expect(page.getByTestId("okno-9")).toHaveAttribute("data-stav", "budouci");
  await expect(page.getByTestId("okno-4")).toHaveAttribute("data-stav", "zmeskane");
  await page.getByTestId("okno-8").click({ force: true });
  await expect(page.getByTestId("kalendar-odhal")).toContainText("Vánoční svetr", { timeout: 5000 });
  await page.getByRole("button", { name: "Nasadit" }).click();
  await expect(page.getByTestId("okno-8")).toHaveAttribute("data-stav", "otevreno");
  const sbirka = await page.evaluate(() => JSON.parse(localStorage.getItem("matemax-sbirka") ?? "{}"));
  expect(sbirka.mam).toContain("9-krk-svetr");
  expect(sbirka.nasazeno[9].krk).toBe("9-krk-svetr");
  const sirka = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sirka).toBeLessThanOrEqual(0);
});

test("mimo advent kalendář ve Sbírce není", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-20T10:00:00"));
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto("/sbirka?tab=kalendar");
  await expect(page.getByText("Denní truhla").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("adventni-kalendar")).toHaveCount(0);
});
