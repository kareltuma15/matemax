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
  poDnech: Array.from({ length: 30 }, (_, i) => ({ den: den(29 - i), navstevniku: 10 + ((i * 7) % 23) + i, stranek: 40 + i * 3, ucty: i % 4 })),
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
};

test("admin návštěvnost: živý přehled, graf po hodinách a po dnech s popisky", async ({ page, context }, info) => {
  await falesnaRelace(context);
  let zivych = 0;
  await context.route("**/api/admin/navstevnost**", (r) => {
    const zive = new URL(r.request().url()).searchParams.get("zive") === "1";
    if (zive) zivych++;
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(zive ? ZIVE : DATA) });
  });
  await page.goto("/admin/navstevnost");
  await expect(page.getByTestId("zive")).toContainText("Živě", { timeout: 20_000 });
  await expect(page.getByTestId("zive-0")).toContainText("3");
  await expect(page.getByTestId("zive-3")).toContainText("+8");
  await expect(page.getByTestId("zive-deni")).toContainText("Začít zdarma");
  // Graf po dnech má osu a popisky dnů, po ťuknutí detail dne
  const dny = page.getByTestId("graf-dny");
  await expect(dny).toContainText(`${Number(den(29).slice(8))}. ${Number(den(29).slice(5, 7))}.`);
  await dny.getByRole("button").last().click();
  await expect(page.getByTestId("graf-dny-detail")).toContainText("návštěvníků");
  await page.getByTestId("graf-hodiny").getByRole("button").nth(10).click();
  await expect(page.getByTestId("graf-hodiny-detail")).toContainText("10:00–10:59 · dnes 8, včera 6");
  await page.screenshot({ path: `.shots/admin-navstevnost-${info.project.name}.png`, fullPage: true });
  // Vypnutí obnovy
  await page.getByTestId("zive-prepinac").click();
  await expect(page.getByTestId("zive-prepinac")).toHaveText("Zapnout obnovu");
  expect(zivych).toBeGreaterThan(0);
});
