import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// Propojení rodiče s dítětem (mockup schválil Karel 23. 11. 2026): propojení platí jen se souhlasem,
// společný e-mail v profilu, karta souhlasu na Domově, odpověď rodiči neprozradí, jestli účet existuje.

async function falesnaRelace(context: BrowserContext, email = "zak@example.com") {
  const fs = await import("fs");
  const env = fs.readFileSync(".env.local", "utf8");
  const ref = new URL(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)![1].replace(/["']/g, "")).hostname.split(".")[0];
  const user = { id: "00000000-0000-4000-8000-000000000000", aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: { first_name: "Tomáš", trida: 9 }, created_at: "2026-10-01T00:00:00Z" };
  const relace = { access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
  await context.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(relace)).toString("base64url"), domain: "localhost", path: "/" }]);
  await context.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
  await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

/** Falešné API rodičů dítěte: drží stav v paměti testu a zapisuje, co appka poslala. */
async function falesneRodice(page: Page, rodice: { id: string; email: string; stav: string; stejny: boolean }[]) {
  const odeslano: unknown[] = [];
  await page.route("**/api/parent-link/dite", async (r) => {
    if (r.request().method() === "POST") {
      const telo = r.request().postDataJSON() as { akce: string; id?: string; email?: string };
      odeslano.push(telo);
      if (telo.akce === "povolit") rodice = rodice.map((x) => (x.id === telo.id ? { ...x, stav: "aktivni" } : x));
      if (telo.akce === "zrusit") rodice = rodice.filter((x) => x.id !== telo.id);
      if (telo.akce === "stejny") rodice = [...rodice, { id: "s1", email: "zak@example.com", stav: "aktivni", stejny: true }];
      if (telo.akce === "pozvat") rodice = [...rodice, { id: "p1", email: telo.email!, stav: "ceka_na_rodice", stejny: false }];
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ email: "zak@example.com", rodice }) });
  });
  return odeslano;
}

test("API: bez přihlášení se nikdo nepropojí a neplatný odkaz rodiče neprojde", async ({ request }) => {
  expect((await request.post("/api/parent-link", { data: { childEmail: "cizi@example.com" } })).status()).toBe(401);
  expect((await request.get("/api/parent-link/dite")).status()).toBe(401);
  expect((await request.post("/api/parent-link/dite", { data: { akce: "stejny" } })).status()).toBe(401);
  expect((await request.post("/api/parent-link/potvrdit", { data: { t: "neplatny" } })).status()).toBe(400);
});

test("Domov: rodič žádá, dítě povolí, karta zmizí", async ({ page, context }) => {
  await falesnaRelace(context);
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  const odeslano = await falesneRodice(page, [{ id: "r1", email: "petra@example.com", stav: "ceka_na_tebe", stejny: false }]);
  await page.goto("/");
  const karta = page.getByTestId("souhlas-rodice");
  await expect(karta).toContainText("petra@example.com", { timeout: 20_000 });
  await expect(karta).not.toContainText("Kč");
  await page.getByTestId("souhlas-rodice-povolit").click();
  await expect(karta).toHaveCount(0);
  expect(odeslano).toContainEqual({ akce: "povolit", id: "r1" });
});

// /profil hlídá přihlášení na serveru (proxy), falešná relace v prohlížeči tam nestačí. Kartu lze otestovat
// na dočasné stránce, která vykreslí jen <ReportRodicum />: PROFIL_URL=/tmp-report-rodicum (ověřeno 24. 11.).
const PROFIL = process.env.PROFIL_URL;

test("Profil: společný e-mail zapne report, jiný e-mail čeká na potvrzení rodiče", async ({ page, context }) => {
  test.skip(!PROFIL, "profil chráněný serverem, viz PROFIL_URL");
  await falesnaRelace(context);
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  const odeslano = await falesneRodice(page, []);
  await page.goto(PROFIL!);
  const karta = page.getByTestId("report-rodicum");
  await expect(karta).toContainText("Na tento e-mail", { timeout: 20_000 });
  await expect(karta).not.toContainText(/Kč|Premium/);
  await page.getByTestId("report-rodicum-zapnout").click();
  await expect(page.getByTestId("report-rodicum-aktivni")).toContainText("zak@example.com");

  await page.getByTestId("report-rodicum-pridat").click();
  await page.getByTestId("report-rodicum-jiny").click();
  await page.getByTestId("report-rodicum-input").fill("mama@example.com");
  await page.getByTestId("report-rodicum-zapnout").click();
  await expect(page.getByTestId("report-rodicum-ceka")).toContainText("mama@example.com");
  expect(odeslano).toEqual([{ akce: "stejny" }, { akce: "pozvat", email: "mama@example.com" }]);
});

test("Rodič: potvrzení odběru až tlačítkem, ne otevřením odkazu", async ({ page }) => {
  let volano = 0;
  await page.route("**/api/parent-link/potvrdit", (r) => { volano++; return r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
  await page.goto("/rodice/potvrdit?t=" + "a".repeat(32));
  await expect(page.getByTestId("rodice-potvrdit-tlacitko")).toBeVisible();
  expect(volano).toBe(0);
  await page.getByTestId("rodice-potvrdit-tlacitko").click();
  await expect(page.getByTestId("rodice-potvrdit-hotovo")).toContainText("Odběr je potvrzený");
  expect(volano).toBe(1);
});

test("Rodič: registrace s e-mailem dítěte poradí report v profilu dítěte", async ({ page }) => {
  await page.route("**/auth/v1/signup**", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "", email: "zak@example.com", identities: [], user_metadata: {}, app_metadata: {}, created_at: "2026-10-01T00:00:00Z" }),
  }));
  await page.goto("/rodice/prihlaseni?rezim=registrace");
  await page.locator("input[type=email]").fill("zak@example.com");
  await page.locator("input[type=password]").fill("heslo12345");
  await page.locator("button[type=submit]").click();
  await expect(page.getByTestId("rodice-email-obsazeny")).toContainText("Na tento e-mail");
});

for (const sirka of [320, 375]) {
  test(`mobil ${sirka} px: karta souhlasu a profil bez přetečení`, async ({ page, context }) => {
    await page.setViewportSize({ width: sirka, height: 760 });
    await falesnaRelace(context);
    await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
    await falesneRodice(page, [
      { id: "r1", email: "velmi.dlouhy.email.rodice@priklad-skoly.example.com", stav: "ceka_na_tebe", stejny: false },
      { id: "r2", email: "druhy.rodic.s.dlouhym.emailem@example.com", stav: "ceka_na_rodice", stejny: false },
    ]);
    await page.goto("/");
    await expect(page.getByTestId("souhlas-rodice")).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(sirka);
    if (!PROFIL) return;
    await page.goto(PROFIL);
    await expect(page.getByTestId("report-rodicum-ceka")).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(sirka);
  });
}
