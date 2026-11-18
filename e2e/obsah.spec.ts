import { test, expect } from "@playwright/test";
import fs from "fs";
import { rozdilyProtiKronice, cerstvost, navrhUkolu, KRONIKA, OBLASTI, shrnutiProKokpit, dalsiSezona, prehledObsahu, type Kronika } from "../src/lib/obsah";

// Obsah a odměny (Karel 18. 11. 2026): kronika novinek musí sedět s kódem, semafor a návrhy úkolů pro kokpit.

test.describe("Obsah a odměny", () => {
  test("kronika zná všechny počty z kódu (při novém obsahu přidej zápis a přepiš stav)", () => {
    const r = rozdilyProtiKronice();
    expect(r, `Kronika (src/data/kronika-obsahu.json) neodpovídá kódu: ${r.map((x) => `${x.klic} kronika ${x.kronika} / kód ${x.kod}`).join(", ")}. Přidej zápis o novince a přepiš "stav".`).toEqual([]);
  });

  test("zápisy kroniky mají platnou oblast a datum", () => {
    const oblasti = new Set(OBLASTI.map((o) => o.id));
    for (const z of KRONIKA.zapisy) {
      expect(oblasti.has(z.oblast), z.popis).toBe(true);
      if (z.datum !== null) expect(z.datum, z.popis).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(z.popis.length).toBeGreaterThan(5);
    }
    for (const o of OBLASTI) expect(KRONIKA.zapisy.some((z) => z.oblast === o.id), o.nazev).toBe(true);
  });

  test("semafor: zelená, oranžová, červená, čeká", () => {
    const k: Kronika = {
      stav: {},
      zapisy: [
        { datum: "2026-11-10", oblast: "priklady9", popis: "nové úlohy" },
        { datum: "2026-10-01", oblast: "priklady5", popis: "nové úlohy" },
        { datum: "2026-11-01", oblast: "videolekce", popis: "lekce" },
        { datum: "2026-11-16", oblast: "odmeny", popis: "1. etapa" },
        { datum: null, oblast: "odmeny", popis: "herní systém" },
      ],
    };
    const c = Object.fromEntries(cerstvost("2026-11-18", k).map((x) => [x.oblast, x]));
    expect(c.priklady9).toMatchObject({ stav: "ok", dni: 8 });
    expect(c.priklady5).toMatchObject({ stav: "zle", dni: 48 });
    expect(c.videolekce).toMatchObject({ stav: "ok", dni: 17 });
    expect(cerstvost("2026-11-27", k).find((x) => x.oblast === "videolekce")?.stav).toBe("pozor");
    expect(c.odmeny.stav).toBe("ceka");
    expect(c.odmeny.posledni?.datum).toBe("2026-11-16");
    expect(c.testy).toMatchObject({ stav: "zle", dni: null });
  });

  test("návrh úkolu je ve formátu kokpitu a shrnutí nemá data o žácích", () => {
    const zle = cerstvost("2026-11-18").filter((x) => x.stav === "zle");
    expect(zle.map((x) => x.oblast)).toEqual(expect.arrayContaining(["vyzvy"]));
    for (const c of zle) {
      const n = navrhUkolu(c);
      expect(n.description).toMatch(/^CO: [^\n]+\nKROKY: 1\) [^\n]+\nHOTOVO KDYŽ: [^\n]+\nČAS: asi \d+ h$/);
      expect(n.estimate_hours).toBeGreaterThan(0);
    }
    const s = shrnutiProKokpit("2026-11-18");
    expect(s.navrhy_ukolu.length).toBe(zle.length);
    expect(JSON.stringify(s)).not.toMatch(/@|email|user/i);
    expect(dalsiSezona("2026-11-18")).toMatchObject({ nazev: "Vánoce", datum: "2026-12-01", dni: 13 });
  });

  test("API pustí jen admina a kokpit se správným klíčem", async ({ request }) => {
    expect((await request.get("/api/admin/obsah")).status()).toBe(401);
    expect((await request.get("/api/ms-dashboard/obsah")).status()).toBe(401);
    expect((await request.get("/api/ms-dashboard/obsah", { headers: { Authorization: "Bearer spatny-klic" } })).status()).toBe(401);
  });
});

test("stránka Obsah a odměny v administraci ukáže semafor, témata i kroniku", async ({ page, context }) => {
  // Falešná relace jen v prohlížeči testu, API se podvrhne skutečným přehledem z kódu; nic se neposílá ven.
  const env = fs.readFileSync(".env.local", "utf8");
  const ref = new URL(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)![1].replace(/["']/g, "")).hostname.split(".")[0];
  const user = { id: "00000000-0000-4000-8000-000000000000", aud: "authenticated", role: "authenticated", email: "admin@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
  const relace = { access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
  await context.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(relace)).toString("base64url"), domain: "localhost", path: "/" }]);
  await context.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
  await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/api/admin/obsah", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(prehledObsahu("2026-11-18")) }));
  await page.goto("/admin/obsah");
  await expect(page.getByTestId("obsah-semafor-vyzvy")).toHaveAttribute("data-stav", "zle");
  await expect(page.getByTestId("obsah-semafor-odmeny")).toHaveAttribute("data-stav", /ok|ceka/);
  await page.getByTestId("obsah-tema-konstrukce").click();
  await expect(page.getByText("Trojúhelníky", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Kronika novinek")).toBeVisible();
  const sirka = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sirka).toBeLessThanOrEqual(0);
  if (process.env.OBSAH_SHOT) await page.screenshot({ path: `.shots/obsah-${test.info().project.name}.png`, fullPage: true });
});
