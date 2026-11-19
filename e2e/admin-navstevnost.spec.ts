import { test, expect, type BrowserContext } from "@playwright/test";

// Admin → Návštěvnost (Karel 19. 11. 2026): živý přehled s obnovou, grafy s osami a popisky.
// API se tu nahrazuje ukázkovými daty (přihlášení admina v testu není).

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

const den = (n: number) => { const d = new Date(Date.now() - n * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const DATA = {
  dni: 30, mereniOd: "2026-11-10T08:00:00Z",
  souhrn: { navstevniku: 812, stranek: 3104, novychUctu: 41 },
  poDnech: Array.from({ length: 30 }, (_, i) => ({ den: den(29 - i), navstevniku: 10 + ((i * 7) % 23) + i, prihlaseni: 3 + (i % 5), bezUctu: 7 + ((i * 7) % 23) + i - (i % 5), stranek: 40 + i * 3, ucty: i % 4 })),
  zdroje: [{ k: "přímo / neznámo", n: 300 }, { k: "utm: instagram", n: 120 }], stranky: [{ k: "/", n: 500 }, { k: "/trenink", n: 210 }],
  kliky: [{ k: "/registrace", n: 80 }], zarizeni: [{ k: "mobil", n: 600 }, { k: "pocitac", n: 212 }],
  trychtyr: [{ krok: "Návštěvníci MateMaxu", n: 812 }, { krok: "Otevřeli úvodní stránku", n: 640 }, { krok: "Nové účty", n: 41 }],
  trenink: [], odmeny: null,
  uvod: { zobrazeni: 0, navstevniku: 0, odesliHned: 0, bezKliku: 0, medianSekund: null, scroll: [], posledniSekce: [], kliky: [], pokracovali: 0, formular: [], chyby: [] },
};
const ZIVE = {
  cas: new Date().toISOString(), pet: 3, tricet: 11, dnes: { navstevniku: 57, stranek: 190 }, vceraDoTed: 49, vceraCelkem: 88, hodinaTed: 14,
  poHodinach: Array.from({ length: 24 }, (_, h) => ({ h, dnes: h <= 14 ? Math.max(0, 8 - Math.abs(h - 10)) : 0, vcera: Math.max(0, 7 - Math.abs(h - 11)) })),
  strankyTed: [{ k: "/", n: 6 }, { k: "/trenink", n: 3 }],
  posledni: [{ cas: new Date(Date.now() - 20000).toISOString(), co: "otevřel stránku", kde: "/trenink", zarizeni: "mobil" }, { cas: new Date(Date.now() - 90000).toISOString(), co: "klikl", kde: "Začít zdarma", zarizeni: "pocitac" }],
  ziveUcty: [{ jmeno: "Tomáš", trida: 9, cesta: "/trenink", zarizeni: "mobil", minutDnes: 14 }],
  bezUctuOnline: 2, bezUctuStranky: [{ k: "/", n: 2 }], dnesMinut: 252, dnesTrenovalo: 11,
};
const DETAIL = { den: den(0), lidi: 2, stranek: 11, navstevnici: [
  { ucet: { jmeno: "Tomáš", trida: 9, propojeny: true }, stranek: 9, kliku: 4, trasa: ["/", "/trenink", "/sbirka"], dalsich: 0, sekund: 2520, zarizeni: "mobil", zdroj: null, od: new Date().toISOString() },
  { ucet: null, stranek: 2, kliku: 0, trasa: ["/", "/cenik"], dalsich: 0, sekund: 40, zarizeni: "pocitac", zdroj: "utm: instagram", od: new Date().toISOString() },
] };
const zakl = { trialUntil: null, source: null, lastLogin: null, correct: 0, lastSession: null, sessionCount: 0, streak: 0, level: "zacatecnik", totalXp: 0, createdAt: "2026-11-03T10:00:00Z" };
const UCTY = { users: [
  { ...zakl, id: "a", email: "tomas@example.com", name: "Tomáš", plan: "paid", trida: 9, answered: 412, diagDone: true, testovaci: false, propojeni: { od: "2026-11-17T10:00:00Z", posledniTest: "2026-12-12" }, cas: { tyden: 6120, celkem: 22200 }, online: { cesta: "/trenink", od: new Date().toISOString() }, posledniAktivita: new Date().toISOString() },
  { ...zakl, id: "b", email: "jakub@example.com", name: "Jakub", plan: "free", trida: 9, answered: 41, diagDone: false, testovaci: false, propojeni: null, cas: { tyden: 1080, celkem: 1080 }, online: null, posledniAktivita: new Date(Date.now() - 7200000).toISOString() },
  { ...zakl, id: "c", email: "karel.test@example.com", name: null, plan: "free", trida: 9, answered: 0, diagDone: false, testovaci: true, propojeni: null, cas: { tyden: 0, celkem: 0 }, online: null, posledniAktivita: null },
] };

test("admin návštěvnost: živý přehled, graf po hodinách a po dnech s popisky", async ({ page, context }, info) => {
  await falesnaRelace(context);
  let zivych = 0;
  await context.route("**/api/admin/navstevnost**", (r) => {
    const u = new URL(r.request().url());
    const zive = u.searchParams.get("zive") === "1";
    if (zive) zivych++;
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(zive ? ZIVE : u.searchParams.get("den") ? DETAIL : DATA) });
  });
  await context.route("**/api/admin/users**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(UCTY) }));
  await context.route("**/api/admin/testovaci**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
  await page.goto("/admin/navstevnost");
  await expect(page.getByTestId("zive")).toContainText("Živě", { timeout: 20_000 });
  await expect(page.getByTestId("zive-0")).toContainText("1");
  await expect(page.getByTestId("zive-kdo")).toContainText("Tomáš");
  await expect(page.getByTestId("zive-kdo")).toContainText("2 návštěvníci bez účtu");
  // Účty: testovací skryté, diagnostika u jména, propojení a online
  await expect(page.getByTestId("ucet-radek")).toHaveCount(2);
  await expect(page.getByTestId("ucet-radek").first()).toContainText("✓ diagnostika");
  await expect(page.getByTestId("ucet-radek").first()).toContainText("✓ Vyhodnocení · test 12. 12.");
  await expect(page.getByTestId("ucet-radek").first()).toContainText("online, Trénink");
  await expect(page.getByTestId("ucet-radek").nth(1)).toContainText("bez diagnostiky");
  await page.getByTestId("ucty-filtr-testovaci").click();
  await expect(page.getByTestId("ucet-radek")).toHaveCount(1);
  await page.getByTestId("ucty-filtr-skutecne").click();
  await page.getByTestId("ucet-menu").nth(1).click();
  await page.getByTestId("ucet-testovaci").click();
  await expect(page.getByTestId("ucet-radek")).toHaveCount(1);
  await expect(page.getByTestId("zive-3")).toContainText("+8");
  await expect(page.getByTestId("zive-deni")).toContainText("Začít zdarma");
  // Graf po dnech má osu a popisky dnů, po ťuknutí detail dne
  const dny = page.getByTestId("graf-dny");
  await expect(dny).toContainText(`${Number(den(29).slice(8))}. ${Number(den(29).slice(5, 7))}.`);
  await dny.getByRole("button").last().click();
  await expect(page.getByTestId("graf-dny-detail")).toContainText("přihlášených");
  await expect(page.getByTestId("detail-navstevnik")).toHaveCount(2);
  await expect(page.getByTestId("detail-dne")).toContainText("Tomáš · 9. tř.");
  await expect(page.getByTestId("detail-dne")).toContainText("Úvod / Domov → Ceník");
  await page.getByTestId("graf-hodiny").getByRole("button").nth(10).click();
  await expect(page.getByTestId("graf-hodiny-detail")).toContainText("10:00–10:59 · dnes 8, včera 6");
  await page.screenshot({ path: `.shots/admin-navstevnost-${info.project.name}.png`, fullPage: true });
  // Vypnutí obnovy
  await page.getByTestId("zive-prepinac").click();
  await expect(page.getByTestId("zive-prepinac")).toHaveText("Zapnout obnovu");
  expect(zivych).toBeGreaterThan(0);
});
