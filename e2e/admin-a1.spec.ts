import { test, expect } from "@playwright/test";
import { sablonaCesty, povoleneParametry, zdrojZDomeny, cistaOdpoved, STARE_NAZVY, UDALOSTI_KLIENTA, NAZVY_PRVKU } from "../src/lib/mereni-plan";
import { vychoziPrezdivka, chybaPrezdivky, prezdivkaUctu } from "../src/lib/prezdivka";
import fs from "fs";

/**
 * Admin 2.1, fáze A1 (sběr dat): plán měření, log odpovědí, souhlasy v registraci, žebříček s přezdívkou,
 * admin bez indexace. Hlídá i to, že se do měření nedostanou tokeny z adres, psaný text ani jména.
 */

test.describe("plán měření", () => {
  test("z adresy zůstane jen šablona trasy a povolené parametry, tokeny nikdy", () => {
    expect(sablonaCesty("/admin/testy/3f2b1c9a-1111-4222-8333-444455556666/submissions")).toBe("/admin/testy/:id/submissions");
    expect(sablonaCesty("/registrace?next=%2Fpropojit%3Fklient%3Dabc&state=xyz")).toBe("/registrace");
    expect(sablonaCesty("/rodice/potvrdit#token")).toBe("/rodice/potvrdit");
    const q = povoleneParametry("?tema=zlomky&dovednost=scitani&state=TAJNE&code=123&next=/x&token=abc");
    expect(q).toEqual({ tema: "zlomky", dovednost: "scitani" });
  });

  test("zdroje: varianty Facebooku dohromady, platba a vlastní web nejsou zdroj", () => {
    for (const d of ["facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com", "www.facebook.com", "com.facebook.katana"]) expect(zdrojZDomeny(d).ref, d).toBe("facebook.com");
    expect(zdrojZDomeny("checkout.stripe.com")).toEqual({ navratZPlatby: true });
    expect(zdrojZDomeny("matemax.matematika-snadno.cz")).toEqual({});
    expect(zdrojZDomeny("www.matematika-snadno.cz").ref).toBe("matematika-snadno.cz");
  });

  test("názvy událostí: předmět_akce v minulém čase a každý starý název má nový", () => {
    for (const n of [...UDALOSTI_KLIENTA, ...Object.values(STARE_NAZVY)]) expect(n, n).toMatch(/^[a-z]+(_[a-z]+)+$/);
    expect(STARE_NAZVY.navsteva).toBe("page_viewed");
    expect(STARE_NAZVY.zive).toBe("app_heartbeat");
    // Každý data-track v kódu má lidský název v plánu měření
    const kod = ["src/app/(auth)/registrace/form.tsx", "src/components/uvod/UvodHost.tsx"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
    const tracky = [...kod.matchAll(/data-track="([^"]+)"/g)].map((m) => m[1]);
    expect(tracky.length).toBeGreaterThan(3);
    for (const t of tracky) expect(NAZVY_PRVKU[t], t).toBeTruthy();
  });

  test("migrace přejmenování obsahuje všechny staré názvy", () => {
    const sql = fs.readFileSync("supabase/migrations/20261126_admin_a1_udalosti.sql", "utf8");
    for (const [stary, novy] of Object.entries(STARE_NAZVY)) expect(sql, stary).toContain(`('${stary}', '${novy}')`);
  });
});

test.describe("log odpovědí", () => {
  test("ukládá jen výsledek (číslo, zlomek, volbu), psaný text ne", () => {
    expect(cistaOdpoved("24")).toBe("24");
    expect(cistaOdpoved(" 3/4 ")).toBe("3/4");
    expect(cistaOdpoved("1 200 Kč")).toBe("1 200 Kč");
    expect(cistaOdpoved("B")).toBe("B");
    expect(cistaOdpoved("x = -2,5")).toBe("x = -2,5");
    expect(cistaOdpoved("nevím jak to spočítat")).toBeNull();
    expect(cistaOdpoved("jmenuju se Tomáš")).toBeNull();
    expect(cistaOdpoved("a".repeat(41))).toBeNull();
    expect(cistaOdpoved("")).toBeNull();
  });

  test("všechny karty úloh zapisují do logu a stránky nastavují režim", () => {
    for (const k of ["PracticeCard", "MoznostiCard", "VicOdpovediCard", "ComparisonCard", "ConstructionCard", "ConstructionMarkCard"]) {
      expect(fs.readFileSync(`src/components/${k}.tsx`, "utf8"), k).toContain("useZaznamOdpovedi(example, onResultRodic, onSkipRodic)");
    }
    for (const s of ["src/app/(app)/trenink/page.tsx", "src/app/(app)/diagnostika/page.tsx", "src/components/Diagnostika5.tsx", "src/app/(app)/cermat-test/page.tsx", "src/app/(app)/rychly-mod/page.tsx", "src/app/(app)/vyzva/page.tsx"]) {
      expect(fs.readFileSync(s, "utf8"), s).toContain("nastavRezim(");
    }
  });
});

test.describe("žebříček: přezdívka místo jména", () => {
  test("výchozí přezdívka je stálá a neobsahuje nic z účtu", () => {
    const id = "3f2b1c9a-1111-4222-8333-444455556666";
    expect(vychoziPrezdivka(id)).toBe(vychoziPrezdivka(id));
    expect(vychoziPrezdivka(id)).toMatch(/^\p{L}+ \p{L}+ [0-9A-F]{2}$/u);
    expect(prezdivkaUctu(id, { full_name: "Tomáš Novák", first_name: "Tomáš" })).toBe(vychoziPrezdivka(id));
  });

  test("vlastní přezdívka nesmí obsahovat jméno, příjmení ani e-mail", () => {
    expect(chybaPrezdivky("Tomáš 2010", ["Tomáš", "Novák"])).toBeTruthy();
    expect(chybaPrezdivky("NovákMaster", ["Tomáš", "Novák"])).toBeTruthy();
    expect(chybaPrezdivky("tom@seznam.cz")).toBeTruthy();
    expect(chybaPrezdivky("ab")).toBeTruthy();
    expect(chybaPrezdivky("Matikář 9")).toBeNull();
    expect(prezdivkaUctu("3f2b1c9a-1111-4222-8333-444455556666", { prezdivka: "Matikář 9", first_name: "Tomáš" })).toBe("Matikář 9");
  });

  test("rozhraní žebříčku neposílá ID účtů a zapisuje jen server", () => {
    const lb = fs.readFileSync("src/app/api/weekly-challenge/leaderboard/route.ts", "utf8");
    expect(lb).not.toMatch(/user_id: row\.user_id/);
    expect(fs.readFileSync("src/lib/weekly-challenge.ts", "utf8")).not.toContain("user_id");
    const sql = fs.readFileSync("supabase/migrations/20261126_admin_a1.sql", "utf8");
    expect(sql).toContain('DROP POLICY IF EXISTS "weekly_lb_select_all"');
  });
});

test.describe("registrace: souhlasy a odkud ses dozvěděl", () => {
  test("bez souhlasu s podmínkami se registrace neodešle a chyba je u políčka", async ({ page }) => {
    let signUp = 0;
    await page.route("**/auth/v1/signup**", async (route) => { signUp++; await route.abort(); });
    await page.goto("/registrace");
    await page.getByTestId("trida-9").click();
    await page.getByPlaceholder("tvuj@email.cz").fill("nekdo@example.invalid");
    await page.getByPlaceholder("alespoň 8 znaků").fill("dlouheheslo123");
    await expect(page.getByTestId("reg-odkud")).toBeVisible();
    await expect(page.getByTestId("reg-novinky")).not.toBeChecked();
    await page.getByRole("button", { name: /Vytvořit účet/ }).click();
    await expect(page.getByText("Potvrď souhlas s podmínkami a zásadami ochrany údajů.")).toBeVisible();
    expect(signUp).toBe(0);
    await expect(page.getByRole("link", { name: "obchodními podmínkami" })).toHaveAttribute("href", /obchodni-podminky/);
    await expect(page.getByRole("link", { name: "zásadami ochrany osobních údajů" })).toHaveAttribute("href", /ochrana-osobnich-udaju/);
  });

  test("bez třídy se ukáže chyba přímo u výběru třídy", async ({ page }) => {
    await page.goto("/registrace");
    await page.getByTestId("reg-podminky").check();
    await page.getByPlaceholder("tvuj@email.cz").fill("nekdo@example.invalid");
    await page.getByPlaceholder("alespoň 8 znaků").fill("dlouheheslo123");
    await page.getByRole("button", { name: /Vytvořit účet/ }).click();
    await expect(page.getByTestId("chyba-trida")).toBeVisible();
  });
});

test.describe("měření v prohlížeči", () => {
  test("klik má lidský název, žádný text tlačítka; stránka bez tokenů v adrese", async ({ page }) => {
    const udalosti: Record<string, unknown>[] = [];
    await page.route("**/api/t", async (route) => {
      try { udalosti.push(JSON.parse(route.request().postData() ?? "{}")); } catch { /* ignoruj */ }
      await route.fulfill({ status: 204 });
    });
    await page.goto("/prihlaseni?next=%2Fprofil&state=TAJNE&tema=zlomky");
    await expect.poll(() => udalosti.find((u) => u.e === "page_viewed")).toBeTruthy();
    const pv = udalosti.find((u) => u.e === "page_viewed")!;
    expect(pv.p).toBe("/prihlaseni");
    expect(pv.tema).toBe("zlomky");
    expect(JSON.stringify(udalosti)).not.toContain("TAJNE");
    await page.goto("/registrace");
    await page.getByTestId("trida-5").click();
    await expect.poll(() => udalosti.find((u) => u.e === "element_clicked" && u.c === "registrace-trida-5" || (u.e === "element_clicked" && String(u.c).includes("5. třídu")))).toBeTruthy();
    for (const u of udalosti.filter((x) => x.e === "element_clicked")) {
      expect(u.c, "klik bez názvu").toBeTruthy();
      expect(u.c).not.toBe("tlačítko");
      expect(u).not.toHaveProperty("text");
    }
  });

  test("odpověď v ukázkovém příkladu na úvodu je jedna událost, ne klik", async ({ page }) => {
    const udalosti: Record<string, unknown>[] = [];
    await page.route("**/api/t", async (route) => {
      try { udalosti.push(JSON.parse(route.request().postData() ?? "{}")); } catch { /* ignoruj */ }
      await route.fulfill({ status: 204 });
    });
    await page.goto("/");
    const sekce = page.locator('[data-sekce="zkus-priklad"]');
    await sekce.scrollIntoViewIfNeeded();
    await sekce.locator("button.u-moz").first().click();
    await expect.poll(() => udalosti.find((u) => u.e === "sample_answered")).toBeTruthy();
    const s = udalosti.find((u) => u.e === "sample_answered")!;
    expect(typeof s.o).toBe("string");
    expect([0, 1]).toContain(s.ok);
    expect(udalosti.filter((u) => u.e === "element_clicked" && /^\d+$/.test(String(u.c)))).toHaveLength(0);
  });
});

test("admin se neindexuje a necachuje veřejně", async ({ request }) => {
  const res = await request.get("/admin", { maxRedirects: 0 });
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  // Vývojový server dává stránkám vždy no-cache, na produkci platí no-store z konfigurace
  expect(res.headers()["cache-control"]).toMatch(/no-store|no-cache/);
  const api = await request.get("/api/admin/panel");
  expect(api.headers()["x-robots-tag"]).toContain("noindex");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
});
