import { test, expect } from "@playwright/test";
import { ODMENY, vychoziStav, krystaly, kupOdmenu, otevriTruhlu, naroku, slucSbirku, najdiOdmenu, type SbirkaStav } from "../src/lib/sbirka";
import { prahUrovne, urovenZXP, odmenaUrovne, zapisUroven, dalsiVelkaOdmena, krystalyZaUroven } from "../src/lib/urovne";
import { hexikSvg } from "../src/lib/hexik-svg";

// XP úrovně s odměnami a jeden společný boss (17. 11. 2026).

const s0 = (zmeny: Partial<SbirkaStav> = {}): SbirkaStav => ({ ...vychoziStav(), ...zmeny });
const UROVNE_S_VECI = [3, 5, 8, 10, 13, 16, 20, 25, 30];

test.describe("XP úrovně: pravidla", () => {
  test("prahy úrovní rostou a hodnost zůstává podle původních hranic", () => {
    expect(prahUrovne(1)).toBe(0);
    expect(prahUrovne(2)).toBe(100);
    expect(prahUrovne(3)).toBe(240);
    expect(urovenZXP(0).n).toBe(1);
    expect(urovenZXP(239).n).toBe(2);
    expect(urovenZXP(240).n).toBe(3);
    expect(urovenZXP(240).podil).toBe(0);
    for (let n = 2; n < 40; n++) expect(prahUrovne(n + 1) - prahUrovne(n)).toBeGreaterThan(prahUrovne(n) - prahUrovne(n - 1));
    expect(urovenZXP(0).hodnost.key).toBe("zacatecnik");
    expect(urovenZXP(7500).hodnost.key).toBe("mistr");
  });

  test("každá třída má věc na stejných úrovních, nejde koupit ani vylosovat a podoby mají kresbu", () => {
    for (const t of [5, 9] as const) {
      const veci = ODMENY[t].filter((o) => o.zdroj === "uroven");
      expect(veci.map((o) => o.uroven).sort((a, b) => a! - b!)).toEqual(UROVNE_S_VECI);
      for (const o of veci) {
        expect(o.cena).toBeNull();
        expect(kupOdmenu(s0({ ziskano: 99999 }), o.id).vysledek).toBe(false);
        if (o.typ === "podoba") expect(hexikSvg(o.klic), o.klic).not.toBe(hexikSvg("klasik"));
      }
      expect(odmenaUrovne(t, 30).vec?.vz).toBe("legenda");
      expect(odmenaUrovne(t, 10).legendarni).toBe(true);
      expect(odmenaUrovne(t, 11).legendarni).toBe(false);
      expect(dalsiVelkaOdmena(t, 3)?.n).toBe(5);
    }
    let s = s0({ ziskano: 100000 });
    for (let i = 0; i < 80; i++) {
      const r = otevriTruhlu(s, "mistrovska", 9, "2026-11-20");
      expect(r.vysledek?.odmena?.zdroj).toBeUndefined();
      s = r.s;
    }
  });

  test("odměny za úrovně: krystaly a truhla jen jednou, věci i zpětně a pro novou třídu", () => {
    const xp = prahUrovne(10);
    const r = zapisUroven(s0(), 5, xp);
    expect(r.vysledek.map((u) => u.n)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const ocek = [2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((a, n) => a + krystalyZaUroven(n), 0);
    expect(krystaly(r.s)).toBe(ocek);
    expect(r.s.uroven).toBe(10);
    expect(naroku(r.s, "legendarni")).toBe(1);
    expect(r.s.mam.filter((id) => najdiOdmenu(id)?.zdroj === "uroven")).toHaveLength(4);
    expect(r.s.mam).toContain("5-podoba-vcelka");

    // Podruhé nic
    expect(zapisUroven(r.s, 5, xp).vysledek).toEqual([]);
    expect(zapisUroven(r.s, 5, xp).s).toBe(r.s);
    // Přechod do 9. třídy: věci 9. třídy ano, krystaly podruhé ne
    const t9 = zapisUroven(r.s, 9, xp);
    expect(t9.vysledek).toEqual([]);
    expect(krystaly(t9.s)).toBe(ocek);
    expect(t9.s.mam).toContain("9-podoba-toxic");
    // Další úroveň přidá jen svoje krystaly
    const dalsi = zapisUroven(t9.s, 9, prahUrovne(11));
    expect(dalsi.vysledek.map((u) => u.n)).toEqual([11]);
    expect(krystaly(dalsi.s)).toBe(ocek + krystalyZaUroven(11));
    // Sloučení zařízení bere vyšší úroveň
    expect(slucSbirku(s0({ uroven: 4, t: 1 }), s0({ uroven: 9, t: 2 })).uroven).toBe(9);
  });
});

const stav = (zmeny: Record<string, unknown>) => JSON.stringify({ ...vychoziStav(), t: 1, ...zmeny });

test("Sbírka: cesta úrovní, věc za úroveň v šatníku a uvítání Hexíka", async ({ page }) => {
  await page.addInitScript(([s, p]) => {
    localStorage.setItem("matemax-trida", "5");
    localStorage.setItem("matemax-sbirka", s);
    localStorage.setItem("matemax-progress", p);
  }, [stav({}), JSON.stringify({ xp: prahUrovne(8) + 10, streak: 0, lastActiveDate: null, consecutiveCorrect: 0 })]);
  await page.goto("/sbirka?tab=urovne");
  await expect(page.getByTestId("hexik-uvod")).toBeVisible();
  await expect(page.getByTestId("cesta-uroven")).toHaveText("8");
  await expect(page.getByTestId("cesta-8")).toHaveAttribute("data-hotovo", "1");
  await expect(page.getByTestId("cesta-9")).toContainText("chybí");
  await expect(page.getByTestId("cesta-10")).toContainText("Kouzelný les");
  await expect(page.getByTestId("cesta-10")).toContainText("legendární truhla");
  await expect(page.getByTestId("sbirka-uroven")).toHaveText("Úroveň 8");

  // Odměny za úrovně 2–8 připsané zpětně: Včelka je v šatníku jako „Máš“
  await page.getByTestId("zalozka-satnik").click();
  await expect(page.getByTestId("odmena-vcelka")).toContainText("Máš");
  await page.getByTestId("typ-vzhled").click();
  await page.getByTestId("odmena-les").click();
  await expect(page.getByTestId("satnik-akce")).toHaveText("Odemkne úroveň 10");
  await expect(page.getByTestId("satnik-akce")).toBeDisabled();

  // Uvítání se po „Rozumím“ už neukáže
  await page.getByTestId("hexik-uvod-zavrit").click();
  await expect(page.getByTestId("hexik-uvod")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("sbirka-krystaly")).toBeVisible();
  await expect(page.getByTestId("hexik-uvod")).toHaveCount(0);
  await page.getByTestId("zalozka-truhly").click();
  await expect(page.getByTestId("jak-ziskat")).toContainText("Nová XP úroveň");
});
