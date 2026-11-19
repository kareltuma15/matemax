import { test, expect } from "@playwright/test";
import { normalizujKod, platnyKod, VYSLEDKY_QR } from "../src/lib/vysledky";

// Osobní kód z letáčku testu nanečisto (dohoda s Vyhodnocením 19. 11. 2026).

test("kód: malá písmena, mezery a pomlčky se převedou; povolených je jen 12 znaků bez zaměnitelných", () => {
  expect(normalizujKod("k7mq 4xt9-pr2w")).toBe("K7MQ4XT9PR2W");
  expect(platnyKod("K7MQ4XT9PR2W")).toBe(true);
  expect(platnyKod("K7MQ4XT9PR2")).toBe(false); // 11 znaků
  expect(platnyKod("K7MQ4XT9PR2O")).toBe(false); // O není v abecedě
  expect(platnyKod("K7MQ4XT9PR21")).toBe(false); // 1 není v abecedě
  expect(VYSLEDKY_QR).toBe("https://vysledky.matematika-snadno.cz/q/");
});

test("přihlášení: Mám kód z testu přesměruje na Vyhodnocení s kódem velkými písmeny", async ({ page }) => {
  await page.route("https://vysledky.matematika-snadno.cz/q/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<p>Vyhodnocení</p>" }));
  await page.goto("/prihlaseni");
  await page.getByTestId("kod-z-testu").click();
  await page.getByTestId("kod-z-testu-pole").fill("k7mq-4xt");
  await page.getByTestId("kod-z-testu-odeslat").click();
  await expect(page.getByTestId("kod-z-testu-chyba")).toBeVisible();
  await page.getByTestId("kod-z-testu-pole").fill("k7mq 4xt9-pr2w");
  await page.getByTestId("kod-z-testu-odeslat").click();
  await page.waitForURL("https://vysledky.matematika-snadno.cz/q/K7MQ4XT9PR2W");
});

test("registrace má tlačítko Mám kód z testu", async ({ page }) => {
  await page.goto("/registrace");
  await expect(page.getByTestId("kod-z-testu")).toContainText("Mám kód z testu");
});

test("neplatný kód: úvodní stránka ukáže hlášku s polem na kód a uklidí adresu", async ({ page }) => {
  await page.goto("/?z=qr&kod=neplatny");
  const hlaska = page.getByTestId("kod-neplatny");
  await expect(hlaska).toContainText("Tenhle kód neplatí. Zkontroluj ho, nebo se zeptej rodičů.");
  await expect(hlaska.getByTestId("kod-z-testu-pole")).toBeVisible();
  await expect.poll(() => new URL(page.url()).search).toBe("");
});
