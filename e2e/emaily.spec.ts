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
  test("adventní e-mail: 1. 12. jednou, jen kdo trénoval v posledních 30 dnech, přednost před stropem", () => {
    const den = { dnes: "2026-12-01", ted: "2026-12-01T15:00:00Z" };
    expect(v({ ...den, treninky: ["2026-11-25"] })).toBe("advent");
    expect(v({ ...den, treninky: ["2026-12-01"] })).toBe("advent");
    expect(v({ ...den, treninky: ["2026-10-20"] })).toBeNull(); // déle než 30 dní: ne
    expect(v({ ...den, treninky: [], registrace: "2026-11-28" })).toBe("nezacal"); // bez tréninku: běžná pravidla
    expect(v({ ...den, treninky: ["2026-11-25"], stav: { odeslano: { advent: "2026-12-01T15:00:00Z" } } })).toBe("styska");
    expect(v({ ...den, treninky: ["2026-11-25"], stav: { historie: ["2026-11-26T15:00:00Z", "2026-11-28T15:00:00Z"] } })).toBe("advent");
    expect(v({ ...den, treninky: ["2026-11-25"], stav: { odhlaseno: true } })).toBeNull();
    expect(v({ ...den, treninky: ["2026-11-25"], stav: { historie: ["2026-12-01T09:00:00Z"] } })).toBeNull();
    expect(v({ dnes: "2026-12-02", ted: "2026-12-02T15:00:00Z", treninky: ["2026-12-01"] })).toBeNull();
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
  for (const id of ["uvitani", "nezacal", "plan", "styska", "spi", "advent"] as EmailZaka[]) {
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
  for (const img of ["uvitani", "nezacal", "plan", "styska", "spi", "advent", "rodic", "premium", "platba", "test", "vysledek", "heslo"]) {
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

test.describe("krok 2: rodiče, platby, testy", () => {
  test("pozvánka, Premium a platba ve společné šabloně bez odhlášení a proměnných", async () => {
    const { pozvankaRodice, premiumAktivni, platbaSeNepovedla } = await import("../src/lib/emaily/rodice");
    for (const o of [pozvankaRodice("Ema <b>", "https://matemax.matematika-snadno.cz/rodice/potvrdit?t=abc"), premiumAktivni(), platbaSeNepovedla("99 Kč", null)]) {
      const html = sestavHtml(o);
      expect(html).not.toMatch(/\{\{|undefined|NaN|vercel\.app|<b>Ema <b>/);
      expect(html).not.toContain("Odhlásit jedním klikem");
      expect(html).toContain("Všemyslice");
      expect(html).toContain("Karel Tůma · Matematika Snadno");
    }
    expect(sestavHtml(platbaSeNepovedla(null, null))).not.toContain("()");
  });
  test("týdenní report: odhlášení jedním klikem a adresa v patičce", async () => {
    const { buildReportHtml } = await import("../src/lib/report-rodice");
    const html = buildReportHtml({
      childName: "Tomáš", weekDate: "30. listopadu 2026", weekTotal: 10, lastWeekTotal: 5, streak: 2, accuracy: 70,
      odhad: { trida: 9, celkem: 20, max: 50, bezDat: false, cil: null, temata: [], nejvicBodu: null, tydny: [], zmena: null },
      odhlasitHref: "https://matemax.matematika-snadno.cz/rodice/odhlasit?l=x&t=y",
    });
    expect(html).toContain("Odhlásit jedním klikem");
    expect(html).toContain("/rodice/odhlasit?l=x&amp;t=y");
    expect(html).toContain("Všemyslice");
  });
  test("e-maily k testu nanečisto: nový vzhled a správný kontakt", async () => {
    const { buildEnrollmentConfirmation, buildSubmissionReceived } = await import("../src/lib/online-test-emails");
    const t = { jmeno: "Tom", title: "Test 12. 12.", scheduledAt: "2026-12-12T09:00:00Z", sessionId: "x" };
    for (const e of [buildEnrollmentConfirmation(t), buildSubmissionReceived({ ...t, photoCount: 2 })]) {
      expect(e.html).toContain("karel.tuma@matematika-snadno.cz");
      expect(e.html).not.toContain("karel@matematika-snadno.cz");
      expect(e.html).toContain("#F5A623");
      expect(e.html).toContain("Všemyslice");
    }
  });
  test("odhlášení reportu: neplatný podpis neprojde, stránka odhlásí tlačítkem", async ({ page, request }) => {
    expect((await request.post("/api/rodice/odhlasit?l=00000000-0000-4000-8000-000000000000&t=spatne")).status()).toBe(400);
    let volano: unknown = null;
    await page.route("**/api/rodice/odhlasit**", (r) => { volano = r.request().postDataJSON(); return r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"odhlaseno":true}' }); });
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/rodice/odhlasit?l=abc&t=def");
    await expect(page.getByTestId("rodice-odhlasit-tlacitko")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(volano).toBeNull();
    await page.getByTestId("rodice-odhlasit-tlacitko").click();
    await expect(page.getByTestId("rodice-odhlaseno")).toBeVisible();
    expect(volano).toEqual({ odhlaseno: true });
  });
});

test.describe("analytika e-mailů", () => {
  test("API: bez admina nic, webhook Resendu bez podpisu neprojde", async ({ request }) => {
    expect((await request.get("/api/admin/emaily/analytika?dni=30")).status()).toBe(401);
    expect((await request.post("/api/resend/webhook", { data: { type: "email.delivered", data: {} } })).status()).toBe(401);
  });

  test("admin → E-maily ukáže dlaždice, tabulku, graf a doručitelnost", async ({ page, context }) => {
    const fs = await import("fs");
    const env = fs.readFileSync(".env.local", "utf8");
    const ref = new URL(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)![1].replace(/["']/g, "")).hostname.split(".")[0];
    const user = { id: "00000000-0000-4000-8000-000000000000", aud: "authenticated", role: "authenticated", email: "admin@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
    const relace = { access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
    await context.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(relace)).toString("base64url"), domain: "localhost", path: "/" }]);
    await context.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
    await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/api/admin/emaily", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dnes: "2026-11-25", nahledy: [], ostatni: [], dnesBy: [], chybaBehu: null, odeslane: [] }) }));
    const dny = Array.from({ length: 30 }, (_, i) => ({ den: `2026-11-${String(i + 1).padStart(2, "0")}`, zak: i % 3, servis: 1, rodic: i % 7 === 0 ? 4 : 0 }));
    const analytika = {
      dni: 30,
      souhrn: { odeslano: 184, odeslanoPred: 122, zakum: 141, rodicum: 43, prokliky: 57, proklikyPred: 40, navrat: 0.38, navratPred: 0.32, odhlaseno: 3, odhlasenoZak: 2, odhlasenoReport: 1, prijemcu: 160 },
      postreh: "Nejvíc vrací do appky „Stýská se mi“: 46 % žáků do 2 dnů trénovalo.",
      radky: [
        { id: "styska", nazev: "Stýská se mi (3 dny)", druh: "zak", odeslano: 26, prokliky: 9, cilText: "46 %", cilPodil: 0.46, odhlaseno: 0 },
        { id: "report", nazev: "Týdenní report", druh: "rodic", odeslano: 32, prokliky: 9, cilText: "dítě trénovalo: 59 %", cilPodil: 0.59, odhlaseno: 1 },
      ],
      poDnech: dny,
      trychtyr: { odeslano: 93, proklik: 25, trenink: 35 },
      dorucitelnost: { zapnuto: false, doruceno: 0, nedoruceno: 0, spam: 0, otevreno: 0 },
    };
    let dotazy = 0;
    await page.route("**/api/admin/emaily/analytika**", (r) => { dotazy++; return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(analytika) }); });
    await page.goto("/admin/emaily");
    const sekce = page.getByTestId("admin-emaily-analytika");
    await expect(sekce).toContainText("184", { timeout: 20_000 });
    await expect(sekce).toContainText("38 %");
    await expect(sekce).toContainText("dítě trénovalo: 59 %");
    await expect(page.getByTestId("admin-emaily-postreh")).toContainText("Stýská se mi");
    await expect(page.getByTestId("admin-emaily-dorucitelnost")).toContainText("čeká na nastavení");
    await expect(sekce.locator("svg rect")).not.toHaveCount(0);
    await sekce.getByRole("button", { name: "7 dní" }).click();
    await expect.poll(() => dotazy).toBeGreaterThan(1);
  });
});

test.describe("krok 3: šablony pro Supabase", () => {
  test("potvrzení a heslo: verze pro dítě i rodiče, odkaz ze Supabase, bez odhlášení", async () => {
    const { sablonySupabase } = await import("../src/lib/emaily/supabase-sablony");
    const s = sablonySupabase();
    for (const { html, predmet } of [s.potvrzeni, s.heslo]) {
      expect(predmet.length).toBeGreaterThan(5);
      expect(html.startsWith("{{ if .Data.trida }}")).toBe(true);
      expect(html.endsWith("{{ end }}")).toBe(true);
      expect(html.match(/\{\{ else \}\}/g)).toHaveLength(1);
      expect(html.match(/href="\{\{ \.ConfirmationURL \}\}"/g)).toHaveLength(2);
      expect(html).not.toMatch(/undefined|NaN|vercel\.app|Odhlásit jedním klikem/);
      expect(html).toContain("Všemyslice");
      // jiné {{ … }} než povolené Supabase nezná
      const vyrazy = html.match(/\{\{[^}]*\}\}/g) ?? [];
      for (const v of vyrazy) expect(["{{ if .Data.trida }}", "{{ else }}", "{{ end }}", "{{ .ConfirmationURL }}"]).toContain(v);
    }
    expect(s.potvrzeni.html).toContain("Ahoj! Jsem Hexík");
    expect(s.potvrzeni.html).toContain("Dobrý den, děkujeme");
  });
});
