import { test, expect } from "@playwright/test";
import { checkAnswer } from "../src/lib/normalize";

// Matematická lišta pod polem odpovědi (jen dotyková zařízení): vkládá znaky na pozici kurzoru a drží klávesnici otevřenou.
test("mínus z jiných klávesnic (−, –) se čte jako obyčejné mínus", () => {
  expect(checkAnswer("−3", "-3")).toBe(true);
  expect(checkAnswer("–3", "-3")).toBe(true);
  expect(checkAnswer("x = −1/2", "-1/2")).toBe(true);
  expect(checkAnswer("-3", "−3")).toBe(true);
  expect(checkAnswer("3", "-3")).toBe(false);
});

// Časový údaj hodiny:minuty (úlohy 5. třídy): porovnává se čas, ne text.
test("čas: 20:35 uznáme i jako 20.35, 20 35 nebo 8:14 jako 08:14, jiný čas ne", () => {
  expect(checkAnswer("20:35", "20:35")).toBe(true);
  expect(checkAnswer("20.35", "20:35")).toBe(true);
  expect(checkAnswer("20 35", "20:35")).toBe(true);
  expect(checkAnswer("08:14", "8:14")).toBe(true);
  expect(checkAnswer("8:14", "08:14")).toBe(true);
  expect(checkAnswer("20:36", "20:35")).toBe(false);
  expect(checkAnswer("2035", "20:35")).toBe(false);
  expect(checkAnswer("20:75", "20:35")).toBe(false);
  expect(checkAnswer("8:14", "20:14")).toBe(false);   // jiná hodina
  // poměry a běžné odpovědi zůstávají beze změny
  expect(checkAnswer("3:5", "3:5")).toBe(true);
  expect(checkAnswer("3 : 5", "3:5")).toBe(true);
});

test.describe("matematická lišta na telefonu", () => {
  test.skip(({ isMobile }) => !isMobile, "lišta se zobrazuje jen na dotykových zařízeních");

  test("vloží znaky na kurzor, smaže a nechá klávesnici otevřenou", async ({ page }) => {
    await page.goto("/trenink?tema=zlomky");
    const input = page.locator("input[type=text]").first();
    await input.waitFor({ timeout: 15_000 }).catch(() => {});
    test.skip((await input.count()) === 0, "první příklad je s výběrem odpovědi, ne s psaním");

    await expect(page.locator('[data-testid^="mathkey-"]')).toHaveCount(10);

    await input.fill("12");
    await page.getByTestId("mathkey-slash").click();
    await page.getByTestId("mathkey-minus").click();
    await expect(input).toHaveValue("12/-");

    await page.getByTestId("mathkey-backspace").click();
    await expect(input).toHaveValue("12/");

    await input.evaluate((el: HTMLInputElement) => { el.focus(); el.setSelectionRange(1, 1); });
    await page.getByTestId("mathkey-comma").click();
    await expect(input).toHaveValue("1,2/");

    // klávesnice zůstává otevřená — pole drží fokus
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("INPUT");
  });
});

test.describe("na počítači lišta není vidět", () => {
  test.skip(({ isMobile }) => isMobile, "lišta je jen pro dotyk");

  test("tlačítka lišty jsou skrytá", async ({ page }) => {
    await page.goto("/trenink?tema=zlomky");
    const input = page.locator("input[type=text]").first();
    await input.waitFor({ timeout: 15_000 }).catch(() => {});
    test.skip((await input.count()) === 0, "první příklad je s výběrem odpovědi, ne s psaním");
    await expect(page.getByTestId("mathkey-slash")).toBeHidden();
  });
});
