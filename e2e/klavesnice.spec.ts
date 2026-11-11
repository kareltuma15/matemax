import { test, expect } from "@playwright/test";
import { checkAnswer } from "../src/lib/normalize";
import { klavesnice } from "../src/lib/klavesnice";

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

// Klávesy navíc u příkladu: číselná klávesnice telefonu a speciální klávesa jen tam, kde ji úloha potřebuje.
const jmena = (odpoved: string, tema: string) => klavesnice(odpoved, tema).klavesy.map((k) => k.name);

test("klávesnice: obyčejné číslo = číselná klávesnice bez kláves navíc", () => {
  for (const [odpoved, tema] of [["2350", "p5_jednotky"], ["2 350 m", "p5_jednotky"], ["12,5 cm²", "geometrie"], ["48 %", "slovni_ulohy"], ["1200 Kč", "slovni_ulohy"], ["65°", "uhly"]]) {
    expect(klavesnice(odpoved, tema), odpoved).toEqual({ inputMode: "decimal", klavesy: [] });
  }
});

test("klávesnice: zlomková čára a mínus jen tam, kde jsou potřeba, a v témátech zlomků vždycky", () => {
  expect(jmena("5/6", "slovni_ulohy")).toEqual(["slash"]);
  expect(jmena("-8", "grafy_logika")).toEqual(["minus"]);
  expect(jmena("x = -2", "slovni_ulohy")).toEqual(["minus"]);
  // ve zlomcích obě klávesy i u celočíselného výsledku, ať sada kláves neprozradí tvar výsledku
  expect(jmena("4", "zlomky")).toEqual(["slash", "minus"]);
  expect(jmena("3/4", "p5_zlomky")).toEqual(["slash"]);
  expect(jmena("2 1/3", "zlomky")).toEqual(["slash", "minus"]);
});

test("klávesnice: čas a poměr dostanou dvojtečku, úhel s minutami stupně a minuty", () => {
  expect(klavesnice("20:35", "p5_jednotky")).toEqual({ inputMode: "decimal", klavesy: [expect.objectContaining({ name: "colon" })] });
  expect(jmena("3 : 4", "slovni_ulohy")).toEqual(["colon"]);
  expect(jmena("22°30′", "uhly")).toEqual(["degree", "minute"]);
});

test("klávesnice: výrazy a slovní odpovědi mají celou klávesnici a navíc jen chybějící znaky", () => {
  expect(klavesnice("3a² − 8a + 2", "vyrazy")).toEqual({ inputMode: "text", klavesy: [expect.objectContaining({ name: "square" })] });
  expect(klavesnice("x=3, y=2", "rovnice")).toEqual({ inputMode: "text", klavesy: [] });
  expect(klavesnice("Ano", "geometrie").inputMode).toBe("text");
});

test("klávesa navíc vloží znak na pozici kurzoru a pole drží fokus", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/trenink?tema=zlomky");
  const input = page.getByPlaceholder("Tvoje odpověď");
  const skip = page.getByRole("button", { name: /Přeskočit úlohu/ });
  await input.or(skip.first()).first().waitFor({ timeout: 20_000 });
  for (let i = 0; i < 25 && (await input.count()) === 0; i++) {
    if ((await skip.count()) === 0) break;
    await skip.first().click();
    await page.waitForTimeout(150);
  }
  test.skip((await input.count()) === 0, "žádná úloha s psaním");

  // ve zlomcích jsou vždycky právě dvě klávesy navíc
  await expect(page.locator('[data-testid^="mathkey-"]')).toHaveCount(2);
  await expect(input).toHaveAttribute("inputmode", /decimal|text/);

  await input.fill("12");
  await page.getByTestId("mathkey-slash").click();
  await page.getByTestId("mathkey-minus").click();
  await expect(input).toHaveValue("12/-");

  await input.evaluate((el: HTMLInputElement) => { el.focus(); el.setSelectionRange(1, 1); });
  await page.getByTestId("mathkey-slash").click();
  await expect(input).toHaveValue("1/2/-");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("INPUT");
});

test("během série zmizí horní lišta i spodní navigace, nahoře je jen zavřít a postup", async ({ page }) => {
  await page.goto("/trenink?tema=zlomky");
  await expect(page.getByTestId("serie-hlava")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Ukončit sérii" })).toBeVisible();
  await expect(page.locator("header.app-chrome")).toBeHidden();
  await expect(page.locator("nav.app-chrome")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.priklad)).toBe("1");
});
