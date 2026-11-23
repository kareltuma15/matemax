import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import fs from "fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  zalozZadost, odpovedDitete, zadostiDitete, stavRodice, jeOvereno, overenaPropojeni, najdiUcetPodleEmailu,
} from "../src/lib/propojeni-rodice";

// Propojení rodič ↔ dítě se souhlasem dítěte (23. 11. 2026). Rodič žádost jen založí (verified = false),
// dítě ji v MateMaxu povolí nebo odmítne. Neověřené propojení nesmí dát rodiči žádná data ani týdenní report.
// Serverová logika běží proti in-memory databázi (nic se neposílá ven), obrazovky s podvrženým API.

// ─── In-memory náhrada Supabase (jen to, co používá src/lib/propojeni-rodice.ts) ─────────────────

type Radek = Record<string, unknown>;
type Uzivatel = { id: string; email: string };

class Dotaz implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private filtry: [string, unknown][] = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private data: Radek = {};
  private jeden = false;
  constructor(private tabulka: Radek[]) {}
  select() { return this; }
  eq(sloupec: string, hodnota: unknown) { this.filtry.push([sloupec, hodnota]); return this; }
  insert(r: Radek) { this.op = "insert"; this.data = r; return this; }
  update(r: Radek) { this.op = "update"; this.data = r; return this; }
  delete() { this.op = "delete"; return this; }
  maybeSingle() { this.jeden = true; return this; }
  private proved() {
    if (this.op === "insert") { this.tabulka.push({ ...this.data }); return { data: null, error: null }; }
    const shoda = this.tabulka.filter((r) => this.filtry.every(([s, h]) => r[s] === h));
    if (this.op === "update") { for (const r of shoda) Object.assign(r, this.data); return { data: null, error: null }; }
    if (this.op === "delete") {
      for (const r of shoda) this.tabulka.splice(this.tabulka.indexOf(r), 1);
      return { data: null, error: null };
    }
    if (this.jeden) {
      if (shoda.length > 1) return { data: null, error: { message: "multiple rows" } };
      return { data: shoda[0] ? { ...shoda[0] } : null, error: null };
    }
    return { data: shoda.map((r) => ({ ...r })), error: null };
  }
  then<A, B>(ok?: ((v: { data: unknown; error: { message: string } | null }) => A | PromiseLike<A>) | null, chyba?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.proved()).then(ok, chyba);
  }
}

function falesnaDb(uzivatele: Uzivatel[], { rpc = true } = {}) {
  const propojeni: Radek[] = [];
  const volani = { rpc: 0, listUsers: 0 };
  const db = {
    from: (t: string) => { expect(t).toBe("parent_child_link"); return new Dotaz(propojeni); },
    rpc: async (fn: string, args: { p_email: string }) => {
      volani.rpc++;
      expect(fn).toBe("najdi_ucet_podle_emailu");
      if (!rpc) return { data: null, error: { message: "Could not find the function public.najdi_ucet_podle_emailu" } };
      return { data: uzivatele.find((u) => u.email.toLowerCase() === args.p_email.toLowerCase())?.id ?? null, error: null };
    },
    auth: {
      admin: {
        // Výchozí stránka jako GoTrue = 50; kód musí stránkovat sám.
        listUsers: async ({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) => {
          volani.listUsers++;
          const n = Math.min(perPage, 1000);
          return { data: { users: uzivatele.slice((page - 1) * n, page * n) }, error: null };
        },
        getUserById: async (id: string) => ({ data: { user: uzivatele.find((u) => u.id === id) ?? null }, error: null }),
      },
    },
  };
  return { db: db as unknown as SupabaseClient, propojeni, volani };
}

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const RODIC = { id: uid(1), email: "rodic@example.com" };
const CIZI = { id: uid(2), email: "cizi@example.com" };
const DITE = { id: uid(3), email: "Dite@Example.com" };
const ZAKLAD: Uzivatel[] = [RODIC, CIZI, DITE];

// ─── Serverová logika ───────────────────────────────────────────────────────────────────────────

test("založení: jen neověřená žádost s náhodným tokenem, rodič zatím nic nevidí", async () => {
  const { db, propojeni } = falesnaDb(ZAKLAD);
  expect(await zalozZadost(db, RODIC, "  dite@example.COM ")).toEqual({ ok: true, stav: "odeslano" });
  expect(propojeni).toHaveLength(1);
  expect(propojeni[0]).toMatchObject({ parent_email: RODIC.email, child_user_id: DITE.id, verified: false, verified_at: null });
  expect(String(propojeni[0].token)).toMatch(/^[0-9a-f]{48}$/);

  // Druhá žádost nic nezdvojí a token se nemění
  const token = propojeni[0].token;
  expect(await zalozZadost(db, RODIC, DITE.email)).toEqual({ ok: true, stav: "uz_ceka" });
  expect(propojeni).toHaveLength(1);
  expect(propojeni[0].token).toBe(token);

  // Druhý rodič má vlastní žádost s jiným tokenem
  await zalozZadost(db, CIZI, DITE.email);
  expect(propojeni).toHaveLength(2);
  expect(propojeni[1].token).not.toBe(token);

  // Neplatné vstupy
  expect(await zalozZadost(db, RODIC, "neni-email")).toEqual({ ok: false, chyba: "neplatny_email" });
  expect(await zalozZadost(db, RODIC, 42)).toEqual({ ok: false, chyba: "neplatny_email" });
  expect(await zalozZadost(db, RODIC, "nikdo@example.com")).toEqual({ ok: false, chyba: "neexistuje" });
  expect(await zalozZadost(db, RODIC, "RODIC@example.com")).toEqual({ ok: false, chyba: "vlastni_ucet" });
});

test("hledání dítěte: přes RPC, a bez RPC projde všechny stránky (dítě je až 1 234. účet)", async () => {
  const mnoho: Uzivatel[] = Array.from({ length: 1300 }, (_, i) => ({ id: uid(100 + i), email: `zak${i}@example.com` }));
  const hledany = mnoho[1233];

  const sRpc = falesnaDb(mnoho);
  expect(await najdiUcetPodleEmailu(sRpc.db, hledany.email)).toBe(hledany.id);
  expect(sRpc.volani.listUsers).toBe(0);

  const bezRpc = falesnaDb(mnoho, { rpc: false });
  expect(await najdiUcetPodleEmailu(bezRpc.db, hledany.email)).toBe(hledany.id);
  expect(bezRpc.volani.listUsers).toBe(2);
  expect(await najdiUcetPodleEmailu(bezRpc.db, "nikdo@example.com")).toBeNull();
  expect(await zalozZadost(bezRpc.db, RODIC, hledany.email)).toEqual({ ok: true, stav: "odeslano" });
});

test("potvrzení dítětem: povolí jen přihlášené dítě, rodič s vlastním tokenem ne", async () => {
  const { db, propojeni } = falesnaDb(ZAKLAD);
  await zalozZadost(db, RODIC, DITE.email);
  const z = await zadostiDitete(db, DITE.id);
  expect(z.cekajici).toEqual([{ token: propojeni[0].token, rodic: RODIC.email }]);
  expect(z.overene).toEqual([]);

  // Rodič zná token ze svého řádku (RLS mu ho ukáže), ale není to jeho dítě → nic
  expect(await odpovedDitete(db, RODIC.id, propojeni[0].token, "povolit")).toEqual({ ok: false, chyba: "nenalezeno" });
  expect(await odpovedDitete(db, DITE.id, "spatny-token", "povolit")).toEqual({ ok: false, chyba: "neplatne" });
  expect(await odpovedDitete(db, DITE.id, propojeni[0].token, "smazat-vse")).toEqual({ ok: false, chyba: "neplatne" });
  expect(propojeni[0].verified).toBe(false);

  expect(await odpovedDitete(db, DITE.id, propojeni[0].token, "povolit")).toEqual({ ok: true });
  expect(propojeni[0].verified).toBe(true);
  expect(typeof propojeni[0].verified_at).toBe("string");

  expect(await stavRodice(db, RODIC.email)).toEqual({ overeneDite: DITE.id, cekajici: [] });
  expect(await jeOvereno(db, RODIC.email, DITE.id)).toBe(true);
  expect(await overenaPropojeni(db)).toEqual([{ parent_email: RODIC.email, child_user_id: DITE.id }]);
  expect((await zadostiDitete(db, DITE.id)).overene).toEqual([{ token: propojeni[0].token, rodic: RODIC.email }]);

  // Nová žádost ověřené propojení neshodí zpět
  expect(await zalozZadost(db, RODIC, DITE.email)).toEqual({ ok: true, stav: "uz_overeno" });
  expect(propojeni[0].verified).toBe(true);

  // „odmítnout“ už ověřené propojení nesmaže (to je „zrusit“), dítě ho může kdykoli zrušit
  expect(await odpovedDitete(db, DITE.id, propojeni[0].token, "odmitnout")).toEqual({ ok: false, chyba: "nenalezeno" });
  expect(await odpovedDitete(db, DITE.id, propojeni[0].token, "zrusit")).toEqual({ ok: true });
  expect(propojeni).toHaveLength(0);
  expect(await overenaPropojeni(db)).toEqual([]);
});

test("odmítnutí: žádost zmizí, rodič nic neuvidí a může požádat znovu", async () => {
  const { db, propojeni } = falesnaDb(ZAKLAD);
  await zalozZadost(db, RODIC, DITE.email);
  await zalozZadost(db, CIZI, DITE.email);
  const tokenCizi = propojeni.find((r) => r.parent_email === CIZI.email)!.token;

  // „zrusit“ na čekající žádost nefunguje (jen na ověřené)
  expect(await odpovedDitete(db, DITE.id, tokenCizi, "zrusit")).toEqual({ ok: false, chyba: "nenalezeno" });
  expect(await odpovedDitete(db, DITE.id, tokenCizi, "odmitnout")).toEqual({ ok: true });
  expect(propojeni.map((r) => r.parent_email)).toEqual([RODIC.email]);
  expect(await stavRodice(db, CIZI.email)).toEqual({ overeneDite: null, cekajici: [] });
  expect((await zadostiDitete(db, DITE.id)).cekajici.map((z) => z.rodic)).toEqual([RODIC.email]);
  // Odmítnutá žádost už nejde potvrdit
  expect(await odpovedDitete(db, DITE.id, tokenCizi, "povolit")).toEqual({ ok: false, chyba: "nenalezeno" });
});

test("neověřené propojení: žádná data přehledu, žádné zprávy dítěti, žádný týdenní report", async () => {
  const { db, propojeni } = falesnaDb(ZAKLAD);
  await zalozZadost(db, CIZI, DITE.email);
  expect(propojeni[0].verified).toBe(false);

  // Přehled rodiče: jen e-mail, který sám zadal; žádné ID dítěte → trasa nevrátí žádná data
  expect(await stavRodice(db, CIZI.email)).toEqual({ overeneDite: null, cekajici: [DITE.email] });
  expect(await jeOvereno(db, CIZI.email, DITE.id)).toBe(false);
  expect(await overenaPropojeni(db)).toEqual([]);

  // Ani stará data s verified = null / "true" (text) se za ověřená nepočítají
  propojeni.push({ parent_email: "x@example.com", child_user_id: DITE.id, verified: null, token: "a".repeat(32) });
  propojeni.push({ parent_email: "y@example.com", child_user_id: DITE.id, verified: "true", token: "b".repeat(32) });
  expect(await overenaPropojeni(db)).toEqual([]);
  expect((await stavRodice(db, "x@example.com")).overeneDite).toBeNull();
});

test("trasy přehledu, zpráv a týdenního reportu berou propojení jen přes ověřující funkce", () => {
  const zdroj = (p: string) => fs.readFileSync(p, "utf8");
  const cron = zdroj("src/app/api/cron/weekly-parent-report/route.ts");
  expect(cron).toContain("overenaPropojeni(supabaseAdmin)");
  expect(cron).not.toContain('from("parent_child_link")');

  const prehled = zdroj("src/app/api/parent-dashboard/route.ts");
  expect(prehled).toContain("stavRodice(supabaseAdmin, user.email)");
  expect(prehled).not.toContain('from("parent_child_link")');
  // Bez ověřeného dítěte se vrací jen linked:false a čekající e-maily, ještě před čtením jakýchkoli dat dítěte
  const bezDat = prehled.indexOf("if (!stav.overeneDite)");
  expect(bezDat).toBeGreaterThan(0);
  expect(bezDat).toBeLessThan(prehled.indexOf('from("sessions")'));
  expect(bezDat).toBeLessThan(prehled.indexOf("getUserById(childId)"));

  const zpravy = zdroj("src/app/api/parent-message/route.ts");
  expect(zpravy.indexOf("jeOvereno(")).toBeGreaterThan(0);
  expect(zpravy.indexOf("jeOvereno(")).toBeLessThan(zpravy.indexOf('from("parent_messages")'));

  const zadost = zdroj("src/app/api/parent-link/route.ts");
  expect(zadost).not.toContain("listUsers()");
  expect(zadost).not.toContain("verified: true");
});

// ─── Obrazovky ──────────────────────────────────────────────────────────────────────────────────
// Domov se otevře přímo. /rodice/* a /profil hlídá proxy proti skutečnému Supabase, takže stejné komponenty
// test otevře přes /nahled (falešná relace v prohlížeči, API podvržené).

async function falesnaRelace(context: BrowserContext, user: { id: string; email: string; meta?: Record<string, unknown> }) {
  const env = fs.readFileSync(".env.local", "utf8");
  const ref = new URL(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)![1].replace(/["']/g, "")).hostname.split(".")[0];
  const u = { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, app_metadata: {}, user_metadata: user.meta ?? {}, created_at: "2026-10-01T00:00:00Z" };
  const relace = { access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, user: u };
  await context.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(relace)).toString("base64url"), domain: "localhost", path: "/" }]);
  await context.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(u) }));
  await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });
const TOKEN = "c0ffee".repeat(8);

async function bezVodorovnehoPosunu(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

test("rodič: žádost se odešle a ukáže „Čeká na potvrzení dítětem“, ne úspěšné propojení", async ({ page, context }) => {
  await falesnaRelace(context, RODIC);
  const poslano: unknown[] = [];
  await page.route("**/api/parent-link", (r) => { poslano.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill(json({ ok: true, stav: "odeslano" })); });
  await page.goto("/nahled?propojit=1");
  await page.getByLabel("E-mail dítěte (MateMax účet)").fill("dite@example.com");
  await page.getByRole("button", { name: /Poslat žádost o propojení/ }).click();
  const hotovo = page.getByTestId("propojeni-odeslano");
  await expect(hotovo).toHaveAttribute("data-stav", "odeslano", { timeout: 20_000 });
  await expect(hotovo).toContainText("Čeká na potvrzení dítětem");
  await expect(hotovo).toContainText("dite@example.com");
  await expect(hotovo).not.toContainText("Propojení úspěšné");
  expect(poslano).toEqual([{ childEmail: "dite@example.com" }]);
  await bezVodorovnehoPosunu(page);
});

test("rodičovský přehled: čekající žádost ukáže stav a žádná data dítěte", async ({ page, context }) => {
  await falesnaRelace(context, RODIC);
  let zruseno = false;
  await page.route("**/api/parent-unlink", (r) => { zruseno = true; return r.fulfill(json({ ok: true })); });
  await page.goto("/nahled?rodic=ceka");
  const ceka = page.getByTestId("rodic-ceka");
  await expect(ceka).toContainText("Čeká na potvrzení dítětem", { timeout: 20_000 });
  await expect(ceka).toContainText("dite@example.com");
  await expect(ceka).toContainText("Rodičovský portál");
  await expect(page.getByText("XP celkem")).toHaveCount(0);
  await bezVodorovnehoPosunu(page);
  await ceka.getByRole("button", { name: "Zrušit žádost" }).click();
  await expect.poll(() => zruseno).toBe(true);
  await expect(page.getByText("Žádné propojené dítě")).toBeVisible();
});

async function domovDitete(page: Page, context: BrowserContext) {
  await falesnaRelace(context, { ...DITE, meta: { first_name: "Ema", trida: 9 } });
  await page.addInitScript(() => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-hexik-uvod", "1"); localStorage.setItem("matemax-diag-done", "1"); });
  const odpovedi: { token: string; akce: string }[] = [];
  await page.route("**/api/parent-link/zadosti", (r) => {
    if (r.request().method() === "POST") {
      odpovedi.push(JSON.parse(r.request().postData() ?? "{}"));
      return r.fulfill(json({ ok: true }));
    }
    return r.fulfill(json({ cekajici: [{ token: TOKEN, rodic: "rodic@example.com" }], overene: [] }));
  });
  await page.goto("/");
  const karta = page.getByTestId("zadosti-rodicu-domov");
  await expect(karta).toContainText("Rodič se chce propojit", { timeout: 20_000 });
  await expect(karta).toContainText("rodic@example.com");
  return { karta, odpovedi };
}

test("dítě na Domově žádost povolí", async ({ page, context }) => {
  const { karta, odpovedi } = await domovDitete(page, context);
  await bezVodorovnehoPosunu(page);
  await karta.getByRole("button", { name: "Povolit" }).click();
  await expect(page.getByTestId("zadosti-hlaska")).toContainText("Propojeno. rodic@example.com teď vidí tvůj přehled");
  expect(odpovedi).toEqual([{ token: TOKEN, akce: "povolit" }]);
  await expect(karta.getByRole("button", { name: "Povolit" })).toHaveCount(0);
});

test("dítě na Domově žádost odmítne", async ({ page, context }) => {
  const { karta, odpovedi } = await domovDitete(page, context);
  await karta.getByRole("button", { name: "Odmítnout" }).click();
  await expect(page.getByTestId("zadosti-hlaska")).toContainText("Odmítnuto. rodic@example.com nic neuvidí.");
  expect(odpovedi).toEqual([{ token: TOKEN, akce: "odmitnout" }]);
  await expect(page.getByTestId("zadost-rodice")).toHaveCount(0);
});

test("dítě bez žádosti nevidí na Domově nic navíc", async ({ page, context }) => {
  await falesnaRelace(context, { ...DITE, meta: { first_name: "Ema", trida: 9 } });
  await page.addInitScript(() => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-hexik-uvod", "1"); localStorage.setItem("matemax-diag-done", "1"); });
  let nacteno = false;
  await page.route("**/api/parent-link/zadosti", (r) => { nacteno = true; return r.fulfill(json({ cekajici: [], overene: [] })); });
  await page.goto("/");
  await expect(page.getByTestId("domov")).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => nacteno).toBe(true);
  await expect(page.getByTestId("zadosti-rodicu-domov")).toHaveCount(0);
});

test("dítě v Profilu vidí propojeného rodiče a může propojení zrušit", async ({ page, context }) => {
  await falesnaRelace(context, { ...DITE, meta: { first_name: "Ema", trida: 9 } });
  await page.addInitScript(() => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-diag-done", "1"); });
  const odpovedi: unknown[] = [];
  await page.route("**/api/parent-link/zadosti", (r) => {
    if (r.request().method() === "POST") { odpovedi.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill(json({ ok: true })); }
    return r.fulfill(json({ cekajici: [], overene: [{ token: TOKEN, rodic: "rodic@example.com" }] }));
  });
  await page.goto("/nahled?zadosti=profil");
  const rodic = page.getByTestId("propojeny-rodic");
  await expect(rodic).toContainText("rodic@example.com vidí tvůj přehled", { timeout: 20_000 });
  await rodic.getByRole("button", { name: "Zrušit" }).click();
  await rodic.getByRole("button", { name: "Ano, zrušit" }).click();
  await expect(page.getByTestId("zadosti-hlaska")).toContainText("už tvůj přehled nevidí");
  expect(odpovedi).toEqual([{ token: TOKEN, akce: "zrusit" }]);
  await expect(page.getByTestId("propojeny-rodic")).toHaveCount(0);
});
