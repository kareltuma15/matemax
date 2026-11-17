import { test, expect } from "@playwright/test";
import {
  povolenyNavrat, platnyState, navratUrl, normalizujVysledek, planZVysledku, souhrnProcvicovani, temataTreninku,
  NAVRAT_PRODUKCE, NAVRAT_VYVOJ,
} from "../src/lib/vysledky";
import { overApiKlic, hashKodu, novyKod, noveLinkId } from "../src/lib/vysledky-server";
import { bezpecnyNext, navratPoRegistraci } from "../src/lib/bezpecny-next";
import { normalizujDoporuceni } from "../src/lib/doporuceni";

// Propojení účtů s appkou Vyhodnocení testů (krok 2). Dohodnuté formáty, neměnit bez domluvy.

const LINK = "3f1c2a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const VYSLEDEK = {
  link_id: LINK, g: "m9", test: { n: 1, d: "2026-11-14" }, dalsi: "2026-12-12",
  celkem: { pts: 35, max: 50 },
  temata: [
    { k: "zlomky", pts: 2, max: 6, j: "doladit" },
    { k: "slovni_ulohy", s: "pohyb", pts: 0, max: 2, j: "zatim1" },
    { k: "geometrie", pts: 5, max: 9, j: "zhorsilo" },
    { k: "rovnice", pts: 8, max: 8, j: "jiste" },
    { k: "neznamy_okruh", pts: 0, max: 5, j: "klopyta" },
    { k: "p5_obsah", pts: 0, max: 5, j: "klopyta" },
  ],
};

test("návrat jen na povolenou adresu, localhost jen mimo produkci", () => {
  expect(povolenyNavrat(NAVRAT_PRODUKCE, true)).toBe(true);
  expect(povolenyNavrat(NAVRAT_VYVOJ, true)).toBe(false);
  expect(povolenyNavrat(NAVRAT_VYVOJ, false)).toBe(true);
  expect(povolenyNavrat("https://vysledky.matematika-snadno.cz/api/matemax/navrat?x=1", false)).toBe(false);
  expect(povolenyNavrat("https://zly.cz/api/matemax/navrat", false)).toBe(false);
  expect(platnyState("abc-123_XYZ.~")).toBe(true);
  expect(platnyState("a b")).toBe(false);
  expect(platnyState("")).toBe(false);
  expect(navratUrl(NAVRAT_PRODUKCE, "s1", { code: "k" })).toBe(`${NAVRAT_PRODUKCE}?state=s1&code=k`);
  expect(navratUrl(NAVRAT_PRODUKCE, "s1", { chyba: "odmitnuto" })).toBe(`${NAVRAT_PRODUKCE}?state=s1&chyba=odmitnuto`);
});

test("výsledek testu: neznámá a cizí témata se vynechají, nesmysly neprojdou", () => {
  const v = normalizujVysledek(VYSLEDEK)!;
  expect(v.temata.map((t) => t.k)).toEqual(["zlomky", "slovni_ulohy", "geometrie", "rovnice"]);
  expect(v.celkem).toEqual({ pts: 35, max: 50 });
  expect(v.dalsi).toBe("2026-12-12");
  expect(normalizujVysledek({ ...VYSLEDEK, link_id: "neni-uuid" })).toBeNull();
  expect(normalizujVysledek({ ...VYSLEDEK, g: "m7" })).toBeNull();
  expect(normalizujVysledek({ ...VYSLEDEK, test: { n: 1, d: "2026-02-30" } })).toBeNull();
});

test("plán do příštího testu: podle ztracených bodů a jistoty, nejvýš 3, ve tvaru doporučení v1", () => {
  const plan = planZVysledku(normalizujVysledek(VYSLEDEK)!, 1795000000)!;
  // zlomky 4 ztracené × 1,1 = 4,4 · geometrie 4 × 1,4 = 5,6 · pohyb 2 × 1,2 = 2,4 · rovnice 0 → ne
  expect(plan.top.map((t) => t.s ? `${t.k}/${t.s}` : t.k)).toEqual(["geometrie", "zlomky", "slovni_ulohy/pohyb"]);
  expect(normalizujDoporuceni(plan)).toEqual(plan);
  expect(planZVysledku(normalizujVysledek({ ...VYSLEDEK, temata: [{ k: "zlomky", pts: 6, max: 6, j: "jiste" }] })!)).toBeNull();
});

test("souhrn procvičování: okruh + rozpad podle dovedností, minuty podle počtu příkladů", () => {
  const s = souhrnProcvicovani([
    { datum: "2026-11-15", kdy: "2026-11-15T17:00:00.000Z", sekund: 600, temata: [{ k: "zlomky", s: "upravy", n: 6, ok: 5 }, { k: "slovni_ulohy", s: "pohyb", n: 4, ok: 2 }] },
    { datum: "2026-11-20", kdy: "2026-11-20T18:04:00.000Z", sekund: 1200, temata: [{ k: "zlomky", n: 10, ok: 8 }] },
  ]);
  expect(s.posledni_aktivita).toBe("2026-11-20T18:04:00Z");
  expect(s.temata).toEqual([
    { k: "zlomky", prikladu: 16, spravne: 13, minut: 26 },
    { k: "zlomky", s: "upravy", prikladu: 6, spravne: 5, minut: 6 },
    { k: "slovni_ulohy", prikladu: 4, spravne: 2, minut: 4 },
    { k: "slovni_ulohy", s: "pohyb", prikladu: 4, spravne: 2, minut: 4 },
  ]);
  expect(souhrnProcvicovani([])).toEqual({ temata: [], posledni_aktivita: null });
  expect(temataTreninku([
    { tema: "zlomky", dovednost: "upravy", ok: true }, { tema: "zlomky", dovednost: "upravy", ok: false }, { tema: "vyrazy", ok: true },
  ])).toEqual([{ k: "zlomky", s: "upravy", n: 2, ok: 1 }, { k: "vyrazy", n: 1, ok: 1 }]);
});

test("klíč API, jednorázový kód a link_id", () => {
  const req = (h?: string) => new Request("http://x", { headers: h ? { authorization: h } : {} });
  expect(overApiKlic(req("Bearer tajny"), "tajny")).toBe(true);
  expect(overApiKlic(req("Bearer jiny"), "tajny")).toBe(false);
  expect(overApiKlic(req(), "tajny")).toBe(false);
  expect(overApiKlic(req("Bearer tajny"), undefined)).toBe(false);
  const kod = novyKod();
  expect(kod).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(hashKodu(kod)).not.toBe(kod);
  expect(noveLinkId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("návrat po registraci jen na doporučení nebo propojení, žádné cizí weby", () => {
  expect(bezpecnyNext("//zly.cz")).toBeNull();
  expect(bezpecnyNext("/\\zly.cz")).toBeNull();
  expect(bezpecnyNext("https://zly.cz")).toBeNull();
  expect(bezpecnyNext("/profil")).toBe("/profil");
  expect(navratPoRegistraci("/trenink?doporuceni=abc.def")).toBe("/trenink?doporuceni=abc.def");
  expect(navratPoRegistraci("/propojit?klient=vysledky")).toBe("/propojit?klient=vysledky");
  expect(navratPoRegistraci("/profil")).toBeNull();
});

test.describe("serverové rozhraní bez klíče vrací 401", () => {
  for (const [metoda, cesta] of [
    ["POST", "/api/vysledky/propojeni/vymena"],
    ["POST", "/api/vysledky/vysledky"],
    ["GET", `/api/vysledky/procvicovani?link_id=${LINK}&od=2026-11-14`],
    ["DELETE", "/api/vysledky/propojeni"],
  ] as const) {
    test(`${metoda} ${cesta.split("?")[0]}`, async ({ request }) => {
      const res = await request.fetch(cesta, { method: metoda, data: { code: "x", link_id: LINK }, headers: { Authorization: "Bearer spatny-klic" } });
      expect(res.status()).toBe(401);
      expect(res.headers()["cache-control"]).toContain("no-store");
    });
  }
  test("založení propojení a nastavení v profilu bez přihlášení → 401", async ({ request }) => {
    expect((await request.post("/api/vysledky/propojeni/zalozit", { data: { souhlas: true } })).status()).toBe(401);
    expect((await request.get("/api/vysledky/propojeni/moje")).status()).toBe(401);
    expect((await request.delete("/api/vysledky/propojeni/moje")).status()).toBe(401);
  });
});

test("obrazovka propojení: neplatný odkaz, host dostane registraci s návratem", async ({ page }) => {
  await page.goto("/propojit?klient=vysledky&state=abc&navrat=https%3A%2F%2Fzly.cz");
  await expect(page.getByText("Odkaz na propojení není platný")).toBeVisible();

  const cesta = `/propojit?klient=vysledky&state=abc123&navrat=${encodeURIComponent(NAVRAT_PRODUKCE)}`;
  await page.goto(cesta);
  await expect(page.getByTestId("propojit-prihlas")).toBeVisible();
  const reg = page.getByRole("link", { name: "Zaregistrovat se" });
  await expect(reg).toHaveAttribute("href", `/registrace?next=${encodeURIComponent(cesta)}`);

  // Registrace si návrat drží: odkaz „Přihlásit se“ ho předá dál
  await reg.click();
  await page.waitForURL(/\/registrace/);
  await expect(page.locator(`a[href="/prihlaseni?next=${encodeURIComponent(cesta)}"]`).first()).toBeAttached();
});
