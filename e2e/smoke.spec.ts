import { test, expect } from "@playwright/test";

// Veřejné stránky — musí se načíst bez chyby a bez uncaught výjimky v prohlížeči.
const PUBLIC_ROUTES = ["/", "/cenik", "/jak-to-funguje", "/prihlaseni", "/registrace"];

for (const route of PUBLIC_ROUTES) {
  test(`veřejná stránka ${route} se načte bez chyb`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    const res = await page.goto(route);
    expect(res?.status(), `HTTP status ${route}`).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
    expect(pageErrors, "uncaught chyby v prohlížeči").toEqual([]);
  });
}

// Ochrana tras: nepřihlášený nesmí do chráněných částí (hlídá src/proxy.ts).
test.describe("chráněné trasy přesměrují nepřihlášeného", () => {
  test("/profil → /prihlaseni", async ({ page }) => {
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/prihlaseni/);
  });

  test("/vitej → /prihlaseni", async ({ page }) => {
    await page.goto("/vitej");
    await expect(page).toHaveURL(/\/prihlaseni/);
  });

  test("/rodice/dashboard → /rodice/prihlaseni", async ({ page }) => {
    await page.goto("/rodice/dashboard");
    await expect(page).toHaveURL(/\/rodice\/prihlaseni/);
  });
});

// Admin není kryté proxy — stránka se přesměruje na klientu a data chrání API (Bearer token).
test.describe("admin není dostupný bez přihlášení", () => {
  test("/admin → /prihlaseni", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/prihlaseni/);
  });

  for (const endpoint of ["/api/admin/users", "/api/admin/stats", "/api/admin/testy"]) {
    test(`${endpoint} bez tokenu vrací 401`, async ({ request }) => {
      const res = await request.get(endpoint);
      expect(res.status()).toBe(401);
    });
  }
});

test("bezpečnostní hlavičky jsou nastavené", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
