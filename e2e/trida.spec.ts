import { test, expect } from "@playwright/test";
import fs from "fs";
import { examples, examples5, allExamples } from "../src/data/examples";
import { TEMATA_ORDER, TEMATA_ORDER_5, TEMA_LABELS } from "../src/types";
import { tridaPoPrihlaseni } from "../src/lib/trida-volba";
import { isTopicLocked, FREE_TOPICS_5, PREMIUM_TOPICS_5 } from "../src/lib/subscription";

// 5. třída: vlastní témata a úlohy, které se nikdy nesmí promíchat s 9. třídou.
test("data: úlohy 5. a 9. třídy se nemíchají a každé téma 5. třídy má popisek", () => {
  const t5 = new Set<string>(TEMATA_ORDER_5);
  expect(examples.filter((e) => t5.has(e.tema)), "9. třída nesmí obsahovat témata 5. třídy").toHaveLength(0);
  for (const e of examples5) {
    expect(e.trida, e.id).toBe(5);
    expect(t5.has(e.tema), `${e.id} má téma mimo okruhy 5. třídy`).toBe(true);
  }
  expect(TEMATA_ORDER.filter((t) => t5.has(t))).toHaveLength(0);
  for (const t of TEMATA_ORDER_5) expect(TEMA_LABELS[t], t).toBeTruthy();
  expect(new Set(allExamples.map((e) => e.id)).size, "id úloh musí být jedinečné napříč třídami").toBe(allExamples.length);
});

test("zámky: u 5. třídy jsou první tři okruhy zdarma, ostatní v Premium", () => {
  expect([...FREE_TOPICS_5]).toEqual(TEMATA_ORDER_5.slice(0, 3));
  for (const t of FREE_TOPICS_5) expect(isTopicLocked(t, false), t).toBe(false);
  for (const t of PREMIUM_TOPICS_5) {
    expect(isTopicLocked(t, false), t).toBe(true);
    expect(isTopicLocked(t, true), t).toBe(false);
  }
  // 9. třída beze změny: zlomky zdarma, geometrie za Premium
  expect(isTopicLocked("zlomky", false)).toBe(false);
  expect(isTopicLocked("geometrie", false)).toBe(true);
});

test("registrace: třídu je nutné vybrat a volba se zapamatuje", async ({ page }) => {
  await page.goto("/registrace");
  const pet = page.getByTestId("trida-5"), devet = page.getByTestId("trida-9");
  await expect(pet).toHaveAttribute("aria-pressed", "false");
  await expect(devet).toHaveAttribute("aria-pressed", "false");
  await page.getByPlaceholder("tvuj@email.cz").fill("nekdo@example.invalid");
  await page.getByPlaceholder("alespoň 8 znaků").fill("dlouheheslo123");
  await page.getByRole("button", { name: /Vytvořit účet/ }).click();
  await expect(page.getByText("Vyber, jestli jsi v 5. nebo 9. třídě.")).toBeVisible();   // bez třídy se neodešle
  await pet.click();
  await expect(pet).toHaveAttribute("aria-pressed", "true");
  await expect(devet).toHaveAttribute("aria-pressed", "false");
  await devet.click();
  await expect(devet).toHaveAttribute("aria-pressed", "true");
  await expect(pet).toHaveAttribute("aria-pressed", "false");
});

test.describe("stránky jen pro 9. třídu", () => {
  test("žák 5. třídy vidí zprávu „připravujeme“", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
    for (const cesta of ["/cermat-test"]) {
      await page.goto(cesta);
      await expect(page.getByTestId("pro-5-pripravujeme"), cesta).toBeVisible();
      await expect(page.getByRole("link", { name: /Jít procvičovat/ })).toBeVisible();
    }
  });

  test("žák 9. třídy (i bez volby) vidí stránky beze změny", async ({ page }) => {
    await page.goto("/diagnostika");
    await expect(page.getByTestId("pro-5-pripravujeme")).toHaveCount(0);
    await expect(page.getByText(/Krok 1 z 8|Vstupní diagnostický test/).first()).toBeVisible();
    await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
    await page.goto("/cermat-test");
    await expect(page.getByTestId("pro-5-pripravujeme")).toHaveCount(0);
  });
});

test.describe("oddělení tříd: žák vidí jen věci pro svou třídu", () => {
  test("5. třída: patička a hostovská stránka tréninku bez 9. třídy", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
    await page.goto("/trenink");
    await expect(page.getByTestId("trenink-host-5")).toBeVisible();
    await expect(page.locator("footer")).toContainText("Matematika pro 5. třídu");
    const text = await page.evaluate(() => document.body.innerText);
    for (const slovo of ["Výrazy", "Rovnice", "Geometrie", "Úhly", "Grafy a logika", "9. třídu"]) expect(text, slovo).not.toContain(slovo);
  });

  test("9. třída: patička a témata beze změny, nic z 5. třídy", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
    await page.goto("/trenink");
    await expect(page.locator("footer")).toContainText("Matematika pro 9. třídu");
    await expect(page.getByTestId("trenink-host-5")).toHaveCount(0);
    const text = await page.evaluate(() => document.body.innerText);
    for (const slovo of ["Počítání s čísly", "Jednotky, čas", "Obvod a obsah", "Tělesa a souměrnost", "5. třídu"]) expect(text, slovo).not.toContain(slovo);
  });

  test("testy nanečisto jsou jen pro 9. třídu", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
    await page.goto("/testy-nanecisto");
    await expect(page.getByTestId("pro-5-pripravujeme")).toBeVisible();
  });
});

test.describe("třída po přihlášení (nepřeteče z jiného účtu na stejném zařízení)", () => {
  const ted = Date.parse("2026-11-11T12:00:00Z");
  test("třída z účtu vždy vyhraje", () => {
    expect(tridaPoPrihlaseni(5, 9, "2025-01-01T00:00:00Z", ted)).toEqual({ doProhlizece: 5 });
    expect(tridaPoPrihlaseni("9", 5, "2025-01-01T00:00:00Z", ted)).toEqual({ doProhlizece: 9 });
  });
  test("starší účet bez třídy je 9. třída, i když prohlížeč pamatuje 5. třídu po jiném účtu", () => {
    expect(tridaPoPrihlaseni(undefined, 5, "2026-10-01T00:00:00Z", ted)).toEqual({ doProhlizece: 9 });
  });
  test("čerstvá registrace přes Google si třídu převezme z prohlížeče a uloží k účtu", () => {
    expect(tridaPoPrihlaseni(undefined, 5, "2026-11-11T11:00:00Z", ted)).toEqual({ kUctu: 5 });
  });
});

test("domov přihlášeného páťáka má horní lištu, spodní navigaci a nic nepřetéká do stran", async ({ page, context }) => {
  // Falešná relace jen v prohlížeči testu; ověření uživatele i data ze Supabase se podvrhnou, nic se neposílá ven.
  const env = fs.readFileSync(".env.local", "utf8");
  const ref = new URL(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)![1].replace(/["']/g, "")).hostname.split(".")[0];
  const user = { id: "00000000-0000-4000-8000-000000000000", aud: "authenticated", role: "authenticated", email: "test@example.com",
    app_metadata: {}, user_metadata: { first_name: "Karel", trida: 5 }, created_at: "2026-10-01T00:00:00Z" };
  const relace = { access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
  await context.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(relace)).toString("base64url"), domain: "localhost", path: "/" }]);
  await context.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
  await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
  await page.goto("/");
  await expect(page.getByTestId("dashboard-5")).toBeVisible();
  // Na mobilu je profil ve spodní navigaci, na počítači i v horní liště; stačí, že je kam kliknout.
  await expect(page.locator('a[href="/profil"]:visible').first()).toBeVisible();
  await expect(page.locator('a[href="/trenink"]:visible').first()).toBeVisible();
  const sirka = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sirka).toBeLessThanOrEqual(0);
});
