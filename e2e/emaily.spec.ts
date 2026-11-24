import { test, expect } from "@playwright/test";
import { coPoslat, serie, type VstupRozhodnuti } from "../src/lib/emaily/rozhodnuti";
import { obsahEmailu, ukazkovaData, dniDoPrijimacek, type EmailZaka } from "../src/lib/emaily/katalog";
import { sestavHtml, sestavText } from "../src/lib/emaily/sablona";

// E-maily žákům přes Resend (Karel 24. 11. 2026, schválený mockup docs/emaily-2026-11): pravidla, kdo co dostane,
// a obsah šablon (žádné {{proměnné}}, stará adresa ani nabídka placených věcí dětem).

const ZAKLAD: VstupRozhodnuti = {
  registrace: "2026-11-20", emailPotvrzen: true, testovaci: false, diagnostika: null, treninky: [],
  stav: {}, dnes: "2026-11-24", ted: "2026-11-24T15:00:00Z",
};
const v = (x: Partial<VstupRozhodnuti>) => coPoslat({ ...ZAKLAD, ...x });

test.describe("kdo dostane jaký e-mail", () => {
  test("3 dny po registraci bez diagnostiky i tréninku → Ještě jsi nezačal(a), jen jednou", () => {
    expect(v({ registrace: "2026-11-21" })).toBe("nezacal");
    expect(v({ registrace: "2026-11-23" })).toBeNull(); // teprve den
    expect(v({ registrace: "2026-11-21", stav: { odeslano: { nezacal: "2026-11-23T15:00:00Z" } } })).toBeNull();
  });
  test("den po diagnostice bez tréninku → Plán", () => {
    expect(v({ diagnostika: "2026-11-23" })).toBe("plan");
    expect(v({ diagnostika: "2026-11-24" })).toBeNull(); // diagnostika dnes, plán až zítra
    expect(v({ diagnostika: "2026-11-23", stav: { odeslano: { plan: "2026-11-20T15:00:00Z" } } })).toBeNull();
  });
  test("3 dny pauza → Stýská se mi, 7 dní → Hexík usnul, pak ticho", () => {
    expect(v({ treninky: ["2026-11-20", "2026-11-21"] })).toBe("styska");
    expect(v({ treninky: ["2026-11-17"] })).toBe("spi");
    expect(v({ treninky: ["2026-11-17"], stav: { odeslano: { spi: "2026-11-24T10:00:00Z" } } })).toBeNull();
    expect(v({ treninky: ["2026-11-01"] })).toBeNull(); // 23 dní: po poslední připomínce už nic
    // Stýská se mi jen jednou za pauzu, nová pauza po dalším tréninku zase smí
    expect(v({ treninky: ["2026-11-21"], stav: { odeslano: { styska: "2026-11-23T15:00:00Z" } } })).toBeNull();
    expect(v({ treninky: ["2026-11-21"], stav: { odeslano: { styska: "2026-11-10T15:00:00Z" } } })).toBe("styska");
  });
  test("kdo dnes nebo včera trénoval, nedostane nic", () => {
    expect(v({ treninky: ["2026-11-24"] })).toBeNull();
    expect(v({ treninky: ["2026-11-23"] })).toBeNull();
  });
  test("odhlášení, testovací účet, nepotvrzený e-mail a loňská sezóna nic nedostanou", () => {
    const zaklad = { registrace: "2026-11-21" };
    expect(v({ ...zaklad, stav: { odhlaseno: true } })).toBeNull();
    expect(v({ ...zaklad, testovaci: true })).toBeNull();
    expect(v({ ...zaklad, emailPotvrzen: false })).toBeNull();
    expect(v({ registrace: "2026-05-10", treninky: ["2026-11-17"] })).toBeNull();
  });
  test("strop: nejvýš 2 připomínky za 7 dní a nikdy 2 za jeden den", () => {
    const zaklad = { treninky: ["2026-11-20"] };
    expect(v({ ...zaklad, stav: { historie: ["2026-11-19T15:00:00Z", "2026-11-21T15:00:00Z"] } })).toBeNull();
    expect(v({ ...zaklad, stav: { historie: ["2026-11-24T08:00:00Z"] } })).toBeNull();
    expect(v({ ...zaklad, stav: { historie: ["2026-11-10T15:00:00Z", "2026-11-21T15:00:00Z"] } })).toBe("styska");
  });
  test("série a dny do přijímaček", () => {
    expect(serie(["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-15"])).toBe(3);
    expect(serie([])).toBe(0);
    expect(dniDoPrijimacek(9, "2026-11-24")).toBe(139);
    expect(dniDoPrijimacek(5, "2026-11-24")).toBe(141);
  });
});

test.describe("obsah e-mailů", () => {
  const ODKAZY = { nastaveni: "https://matemax.matematika-snadno.cz/emaily?u=x&t=y", odhlasit: "https://matemax.matematika-snadno.cz/emaily?u=x&t=y&odhlasit=1" };
  for (const id of ["uvitani", "nezacal", "plan", "styska", "spi"] as EmailZaka[]) {
    for (const trida of [5, 9] as const) {
      test(`${id} · ${trida}. třída`, () => {
        const obsah = obsahEmailu(id, ukazkovaData(trida, "2026-11-24"));
        const html = sestavHtml(obsah, ODKAZY);
        const text = sestavText(obsah, ODKAZY);
        for (const s of [html, text, obsah.predmet]) {
          expect(s).not.toMatch(/\{\{|\{[a-z_.]+\}|undefined|NaN|null|vercel\.app/);
          expect(s).not.toMatch(/Kč|Premium|sešit|kup/i);
        }
        expect(html).toContain("Odhlásit jedním klikem");
        expect(html).toContain(ODKAZY.odhlasit.replace(/&/g, "&amp;"));
        expect(html).toContain("Všemyslice");
        expect(html).toMatch(/href="https:\/\/matemax\.matematika-snadno\.cz\/[^"]*utm_source=email/);
        if (obsah.img) expect(html).toContain(`/emaily/${obsah.img}.png`);
      });
    }
  }
  test("dynamické hodnoty se escapují", () => {
    const d = ukazkovaData(9, "2026-11-24");
    d.odhad!.tema = { klic: "x", label: "<script>alert(1)</script>" };
    const html = sestavHtml(obsahEmailu("plan", d), ODKAZY);
    expect(html).not.toContain("<script>");
  });
});

test("obrázky Hexíka pro e-maily jsou veřejně dostupné", async ({ request }) => {
  for (const img of ["uvitani", "nezacal", "plan", "styska", "spi"]) {
    const r = await request.get(`/emaily/${img}.png`);
    expect(r.status(), img).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
});

test("odhlášení: neplatný podpis neprojde, stránka odhlásí tlačítkem", async ({ page, request }) => {
  expect((await request.post("/api/emaily/odhlasit?u=00000000-0000-4000-8000-000000000000&t=spatne")).status()).toBe(400);
  expect((await request.post("/api/cron/emaily-zakum")).status()).toBe(401);
  let volano: unknown = null;
  await page.route("**/api/emaily/odhlasit**", (r) => { volano = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"odhlaseno":true}' }); });
  await page.goto("/emaily?u=abc&t=def&odhlasit=1");
  await expect(page.getByTestId("emaily-nastaveni")).toBeVisible();
  expect(volano).toBeNull(); // samotné otevření odkazu nic neodhlásí
  await page.getByTestId("emaily-odhlasit").click();
  await expect(page.getByTestId("emaily-odhlaseno")).toBeVisible();
  expect(volano).toEqual({ odhlaseno: true });
});

for (const sirka of [320, 375]) {
  test(`stránka e-mailů na mobilu ${sirka} px bez přetečení`, async ({ page }) => {
    await page.setViewportSize({ width: sirka, height: 700 });
    await page.goto("/emaily?u=abc&t=def");
    await expect(page.getByTestId("emaily-odhlasit")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(sirka);
  });
}
