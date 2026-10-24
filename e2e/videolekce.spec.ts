import { test, expect } from "@playwright/test";
import { VIDEOLEKCE, najdiVideolekci } from "../src/data/videolekce";

// Po chybě se nabízí videolekce k tématu. Seznam lekcí je jedna tabulka (src/data/videolekce.ts).
test("videolekce: přesná lekce podle podtématu, jinak výchozí, jinak nic", () => {
  expect(najdiVideolekci("zlomky", "scitani_odcitani")).toMatchObject({ presna: true, lekce: { id: "zlomky-scitani-odcitani" } });
  expect(najdiVideolekci("zlomky", "zkracovani")).toMatchObject({ presna: true, lekce: { id: "zlomky-zaklady" } });
  // násobení zlomků zatím lekci nemá → základy tématu
  expect(najdiVideolekci("zlomky", "nasobeni")).toMatchObject({ presna: false, lekce: { id: "zlomky-zaklady" } });
  expect(najdiVideolekci("zlomky", null)).toMatchObject({ presna: false });
  // téma bez veřejné lekce nic nenabídne
  expect(najdiVideolekci("geometrie", "pythagorova_veta")).toBeNull();
});

test("videolekce: každá lekce má jedinečné id a veřejný odkaz na YouTube", () => {
  expect(new Set(VIDEOLEKCE.map((v) => v.id)).size).toBe(VIDEOLEKCE.length);
  for (const v of VIDEOLEKCE) {
    expect(v.url, v.id).toMatch(/^https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{6,}/);
    expect(v.nazev.length, v.id).toBeGreaterThan(3);
  }
  // nejvýš jedna výchozí lekce na téma
  const vychozi = VIDEOLEKCE.filter((v) => v.vychozi).map((v) => v.tema);
  expect(new Set(vychozi).size).toBe(vychozi.length);
});

test("videolekce: po špatné odpovědi ve zlomcích se nabídne lekce na YouTube", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/trenink?tema=zlomky");
  const input = page.locator("input[type=text]").first();
  await input.or(page.getByRole("button", { name: /Přeskočit úlohu/ }).first()).waitFor({ timeout: 20_000 }); // karta se načetla
  // první úloha může být s výběrem odpovědi; přeskakujeme, dokud nepřijde úloha s psaním
  for (let i = 0; i < 25 && (await input.count()) === 0; i++) {
    const skip = page.getByRole("button", { name: /Přeskočit úlohu/ });
    if ((await skip.count()) === 0) break;
    await skip.click();
    await page.waitForTimeout(150);
  }
  test.skip((await input.count()) === 0, "žádná úloha s psaním po přeskakování");

  await expect(page.getByTestId("videolekce-odkaz")).toHaveCount(0);        // před odpovědí ne
  await input.fill("-987654");
  await page.keyboard.press("Enter");
  const odkaz = page.getByTestId("videolekce-odkaz");
  await expect(odkaz).toBeVisible();
  await expect(odkaz).toHaveAttribute("href", /youtu/);
  await expect(odkaz).toHaveAttribute("target", "_blank");
  await expect(odkaz).toHaveAttribute("rel", /noopener/);
});
