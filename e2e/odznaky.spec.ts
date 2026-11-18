import { test, expect } from "@playwright/test";
import { stavOdznaku, noveStupne, nejblizsiMedaile, ZVLADNUTI, type VstupOdznaku } from "../src/lib/odznaky";
import { examples, examples5 } from "../src/data/examples";

// Odznaky na profilu jako 3D medaile (schválil Karel 18. 11. 2026).

const zaklad = (z: Partial<VstupOdznaku> = {}): VstupOdznaku => ({
  trida: 9, karty: [], maxSerie: 0, tydny5: 0, vyreseno: 0, napraveno: 0, perfektni: 0, diagnostika: {}, testu: 0, rustOdhadu: 0, generalek: 0, stareOdznaky: [], ...z,
});
const karty = (ids: string[], q = 4) => ids.map((exampleId) => ({ exampleId, repetitions: 1, easeFactor: 2.5, interval: 1, nextReview: 0, lastQuality: q }));
const najdi = (v: VstupOdznaku, id: string) => stavOdznaku(v).find((m) => m.id === id)!;

test.describe("Odznaky", () => {
  test("každá třída má medaile jen za svá témata", () => {
    const m9 = stavOdznaku(zaklad()), m5 = stavOdznaku(zaklad({ trida: 5 }));
    expect(m9.filter((m) => m.kategorie === "temata")).toHaveLength(9);
    expect(m5.filter((m) => m.kategorie === "temata")).toHaveLength(8);
    expect(m5.some((m) => m.id === "tema:zlomky")).toBe(false);
    expect(m9.every((m) => m.stupen === -1)).toBe(true);
    expect(m5.find((m) => m.id === "testy")!.nazev).toBe("Cvičný test");
  });

  test("mistr tématu: bronz po zvládnutí 1. úrovně, stříbro po 2., zlato po 3.", () => {
    const zl = (o: number) => examples.filter((e) => e.tema === "zlomky" && e.obtiznost === o).slice(0, ZVLADNUTI).map((e) => e.id);
    expect(najdi(zaklad({ karty: karty(zl(1)) }), "tema:zlomky").stupen).toBe(0);
    expect(najdi(zaklad({ karty: karty([...zl(1), ...zl(2)]) }), "tema:zlomky").stupen).toBe(1);
    expect(najdi(zaklad({ karty: karty([...zl(1), ...zl(2), ...zl(3)]) }), "tema:zlomky").stupen).toBe(2);
    expect(najdi(zaklad({ karty: karty(zl(1), 2) }), "tema:zlomky").stupen).toBe(-1);
    const p5 = examples5.filter((e) => e.tema === "p5_pocitani" && e.obtiznost === 1).slice(0, ZVLADNUTI).map((e) => e.id);
    expect(najdi(zaklad({ trida: 5, karty: karty(p5) }), "tema:p5_pocitani").stupen).toBe(0);
  });

  test("prahy, převod starých odznaků a bonusové", () => {
    expect(najdi(zaklad({ vyreseno: 260 }), "pocetar")).toMatchObject({ stupen: 1 });
    expect(najdi(zaklad({ maxSerie: 2, stareOdznaky: ["badge_streak_30"] }), "plamen").stupen).toBe(2);
    expect(najdi(zaklad({ stareOdznaky: ["badge_rovnice_master"] }), "tema:rovnice").stupen).toBe(1);
    expect(najdi(zaklad({ stareOdznaky: ["badge_early_bird"] }), "rano").stupen).toBe(0);
    expect(najdi(zaklad({ diagnostika: { zlomky: { correct: 7, total: 8 }, p5_pocitani: { correct: 0, total: 5 } } }), "diagnostika").stupen).toBe(2);
    expect(najdi(zaklad({ rustOdhadu: 10 }), "nahoru").stupen).toBe(2);
  });

  test("nové stupně dají krystaly jen jednou, i za přeskočené stupně", () => {
    const m = stavOdznaku(zaklad({ vyreseno: 600, perfektni: 1 }));
    const r = noveStupne(m, {});
    expect(r.nove.map((x) => x.id).sort()).toEqual(["cista", "pocetar"]);
    expect(r.krystaly).toBe(20 + 40 + 80 + 20);
    expect(noveStupne(m, r.odmeneno).krystaly).toBe(0);
    expect(nejblizsiMedaile(m)?.id).toBeTruthy();
  });
});
