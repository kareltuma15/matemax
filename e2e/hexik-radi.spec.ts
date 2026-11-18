import { test, expect } from "@playwright/test";
import { vychoziStav, type SbirkaStav } from "../src/lib/sbirka";
import { radaHexika } from "../src/lib/hexik-radi";
import { prahUrovne } from "../src/lib/urovne";

// „Hexík radí“: pořadí rad na Domově (18. 11. 2026).

const den = "2026-11-18";
const s0 = (z: Partial<SbirkaStav> = {}): SbirkaStav => ({ ...vychoziStav(), ...z });
const trenink = { nazevTematu: "Zlomky", nazevDovednosti: null, href: "/trenink?tema=zlomky" };
const xpDaleko = prahUrovne(5) + 10;

test.describe("Hexík radí", () => {
  test("nejdřív čekající truhla, pak kousek do úrovně, pak nejslabší téma", () => {
    const sTruhla = s0({ naroky: { doporuceni: ["tema:zlomky"] } });
    expect(radaHexika({ stav: sTruhla, trida: 9, xp: xpDaleko, den, trenink, bossExistuje: true })).toMatchObject({ druh: "truhla", href: "/sbirka" });

    const blizko = radaHexika({ stav: s0(), trida: 9, xp: prahUrovne(5) - 30, den, trenink, bossExistuje: true });
    expect(blizko.druh).toBe("uroven");
    expect(blizko.text).toContain("Do úrovně 5 ti chybí jen 30 XP");
    expect(blizko.text).toContain("Beton");

    const tema = radaHexika({ stav: s0(), trida: 9, xp: xpDaleko, den, trenink, bossExistuje: true });
    expect(tema).toMatchObject({ druh: "tema", href: "/trenink?tema=zlomky" });
    expect(tema.text).toContain("Téma Zlomky ti zatím jde nejhůř");
    expect(tema.text).toContain("Truhlu doporučení");
  });

  test("bez doporučeného tématu: mise, potom Boss týdne, nakonec pochvala", () => {
    const mise = radaHexika({ stav: s0(), trida: 5, xp: xpDaleko, den, trenink: null, bossExistuje: true });
    expect(mise.druh).toBe("mise");
    expect(mise.text).toContain("zbývají 3 mise");

    const hotoveMise = s0({ mise: { d: den, hotove: ["trenink", "spravne10", "spravne20", "serie5", "tezke3"], serie: 1, maxSerie: 1, tezke: 3 }, denniOtevrena: den, denniOdemcena: den });
    expect(radaHexika({ stav: hotoveMise, trida: 5, xp: xpDaleko, den, trenink: null, bossExistuje: true }).druh).toBe("boss");
    expect(radaHexika({ stav: hotoveMise, trida: 5, xp: xpDaleko, den, trenink: null, bossExistuje: false }).druh).toBe("hotovo");
  });
});
