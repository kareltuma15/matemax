import { test, expect, type BrowserContext } from "@playwright/test";

// Řídicí panel adminu (Karel 19. 11. 2026): co dnes potřebuje pozornost, byznys, učení a detail žáka.
// API se nahrazuje ukázkovými daty (přihlášení admina v testu není).

async function falesnaRelace(context: BrowserContext) {
  const fs = await import("fs");
  const env = fs.readFileSync(".env.local", "utf8");
  const ref = new URL(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)![1].replace(/["']/g, "")).hostname.split(".")[0];
  const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "admin@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
  const relace = { access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
  await context.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(relace)).toString("base64url"), domain: "localhost", path: "/" }]);
  await context.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
  await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

const PANEL = {
  dnes: { noveUcty: 3, noveTyden: 14, noveMinulyTyden: 10, trenovalo: 11, zaku: 37, online: ["Tomáš", "Ema"], premium: { plati: 2, rucne: 1, zkousi: 1 }, zpetnaVazba: 2 },
  pozornost: [
    { druh: "premium", titulek: "Premium končí do 7 dní (1)", popis: "Prodluž v detailu žáka, nebo nech vypršet.", ucty: [{ id: "e", jmeno: "Ema" }] },
    { druh: "odpada", titulek: "Přestali chodit (1)", popis: "Dřív trénovali aspoň 3 dny, posledních 5 dní nic.", ucty: [{ id: "j", jmeno: "Jakub" }] },
    { druh: "novinky", titulek: "10 dní bez nové novinky", popis: "Limit 14 dní.", ucty: [] },
  ],
  byznys: { plati: 2, rucne: 1, zkousi: 1, konciDo7: 1, premiumZobrazeno: 18, platbaStart: 3, podilPremium: 11 },
  uceni: { odhad9: 24, odhad5: 29, prikladuTyden: 1840, temata: [{ k: "slovni_ulohy", ok: 51, n: 100 }, { k: "zlomky", ok: 78, n: 100 }] },
};
const EMA = {
  id: "e", email: "ema@example.com", name: "Ema", plan: "trial", trialUntil: "2026-11-22T00:00:00Z", trida: 5, source: "manual", lastLogin: null, answered: 188, correct: 150,
  createdAt: "2026-11-10T10:00:00Z", lastSession: "2026-11-19", sessionCount: 9, streak: 5, level: "zacatecnik", totalXp: 900, diagDone: true, testovaci: false,
  propojeni: { od: "2026-11-17T10:00:00Z", posledniTest: null }, cas: { tyden: 3120, celkem: 7500 }, online: { cesta: "/sbirka", od: new Date().toISOString() }, posledniAktivita: new Date().toISOString(),
};
const DETAIL = { diagnostics: [{ tema: "zlomky", correct: 2, total: 5 }], sessions: [{ date: "2026-11-19", xp: 50, correct: 8, total: 10 }], badges: 0, cards: 0, events: [], onboarding: null, parentLinks: 0, xp: null, vysledky: { propojeno: "2026-11-17T10:00:00Z", testy: [], plan: null } };

test("řídicí panel: dnešek, potřebuje pozornost, byznys, učení a detail žáka s prodloužením Premium", async ({ page, context }) => {
  await falesnaRelace(context);
  const premium: unknown[] = [];
  await context.route("**/api/admin/panel**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PANEL) }));
  await context.route("**/api/admin/users**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ users: [EMA] }) }));
  await context.route("**/api/admin/user-detail**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(DETAIL) }));
  await context.route("**/api/admin/premium**", (r) => { premium.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: "trial" }) }); });
  await page.goto("/admin");
  await expect(page.getByTestId("panel-dnes")).toContainText("2 platí · 1 ručně · 1 zkouší", { timeout: 20_000 });
  await expect(page.getByTestId("pozornost-premium")).toContainText("Premium končí do 7 dní (1)");
  await expect(page.getByTestId("pozornost-novinky")).toContainText("Obsah");
  await expect(page.getByTestId("panel-byznys")).toContainText("11 %");
  await expect(page.getByTestId("panel-uceni")).toContainText("24 / 50");
  // Detail žáka z položky seznamu
  await page.getByTestId("pozornost-premium").getByTestId("pozornost-ucet").click();
  const detail = page.getByTestId("detail-zaka");
  await expect(detail).toContainText("Ema");
  await expect(detail).toContainText("✓ diagnostika");
  await expect(detail).toContainText("Propojil MateMax s Vyhodnocením testů");
  await page.getByTestId("detail-premium").click();
  await detail.getByLabel("Premium do (prázdné = bez omezení)").fill("2026-12-31");
  await detail.getByRole("button", { name: "Prodloužit", exact: true }).click();
  await expect.poll(() => premium.length).toBe(1);
  expect(premium[0]).toMatchObject({ userId: "e", action: "grant", until: "2026-12-31" });
});
