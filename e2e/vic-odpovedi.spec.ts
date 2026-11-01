import { test, expect, type Page } from "@playwright/test";
import { examples5 } from "../src/data/examples";

// Karta s více odpověďmi (podúlohy 4.1–4.3 a přiřazování A–F). Testuje se přes /nahled?ids=… — stejná karta jako v tréninku.
// Test nic nezapisuje na server.

const vic = examples5.filter((e) => e.id.startsWith("P5_VIC_"));

async function karta(page: Page, id: string) {
  await page.goto(`/nahled?ids=${id}`);
  return page.getByTestId("vic-odpovedi");
}

test("data: 8 úloh s podúlohami a 7 s přiřazováním, odpověď úlohy odpovídá částem", () => {
  expect(vic.length).toBe(15);
  for (const e of vic) {
    if (e.podulohy) expect(e.odpoved, e.id).toBe(e.podulohy.map((p) => p.odpoved).join(" ; "));
    else expect(e.prirazeni!.polozky.length, e.id).toBe(3);
  }
});

test("všech 15 úloh se vykreslí jako karta s více odpověďmi", async ({ page }) => {
  await page.goto(`/nahled?ids=${vic.map((e) => e.id).join(",")}`);
  await expect(page.getByTestId("vic-odpovedi")).toHaveCount(15);
});

test("podúlohy: tlačítko Zkontrolovat je zamčené, dokud nejsou vyplněné všechny", async ({ page }) => {
  const k = await karta(page, "P5_VIC_03");
  const btn = k.getByRole("button", { name: "Zkontrolovat" });
  await expect(btn).toBeDisabled();
  await k.getByLabel("Výsledek podúlohy 1").fill("33");
  await k.getByLabel("Výsledek podúlohy 2").fill("18");
  await expect(btn).toBeDisabled();
  await k.getByLabel("Výsledek podúlohy 3").fill("75");
  await expect(btn).toBeEnabled();
});

test("podúlohy: všechno správně → Správně! a výsledek true", async ({ page }) => {
  const ex = vic.find((e) => e.id === "P5_VIC_06")!;
  const k = await karta(page, "P5_VIC_06");
  for (const [i, p] of ex.podulohy!.entries()) await k.getByLabel(`Výsledek podúlohy ${i + 1}`).fill(p.odpoved);
  await k.getByRole("button", { name: "Zkontrolovat" }).click();
  await expect(k.getByText("✓ Správně!")).toBeVisible();
});

test("podúlohy: jedna chyba → ukáže 2 z 3 a správný výsledek jen u chybné podúlohy", async ({ page }) => {
  const ex = vic.find((e) => e.id === "P5_VIC_03")!;
  const k = await karta(page, "P5_VIC_03");
  await k.getByLabel("Výsledek podúlohy 1").fill(ex.podulohy![0].odpoved);
  await k.getByLabel("Výsledek podúlohy 2").fill("99");
  await k.getByLabel("Výsledek podúlohy 3").fill(ex.podulohy![2].odpoved);
  await k.getByRole("button", { name: "Zkontrolovat" }).click();
  await expect(k.getByText("Správně 2 z 3")).toBeVisible();
  await expect(k.getByTestId("poduloha-2").getByText(/Správně:/)).toBeVisible();
  await expect(k.getByTestId("poduloha-1").getByText(/Správně:/)).toHaveCount(0);
});

test("podúlohy: čas a zaokrouhlení se čtou i s mezerou (19.25, 49 000)", async ({ page }) => {
  const k = await karta(page, "P5_VIC_08");
  await k.getByLabel("Výsledek podúlohy 1").fill("49 000");
  await k.getByLabel("Výsledek podúlohy 2").fill("48 700");
  await k.getByLabel("Výsledek podúlohy 3").fill("8 725");
  await k.getByRole("button", { name: "Zkontrolovat" }).click();
  await expect(k.getByText("✓ Správně!")).toBeVisible();
});

test("přiřazování: všechno správně → Správně!", async ({ page }) => {
  const ex = vic.find((e) => e.id === "P5_VIC_11")!;
  const k = await karta(page, "P5_VIC_11");
  const btn = k.getByRole("button", { name: "Zkontrolovat" });
  await expect(btn).toBeDisabled();
  for (const [i, p] of ex.prirazeni!.polozky.entries()) await k.getByRole("button", { name: `Položka ${i + 1}: ${"ABCDEF"[p.spravna]}` }).click();
  await expect(btn).toBeEnabled();
  await btn.click();
  await expect(k.getByText("✓ Správně!")).toBeVisible();
});

test("přiřazování: špatně → ukáže počet správných a správné přiřazení; po vyhodnocení už nejde měnit", async ({ page }) => {
  const ex = vic.find((e) => e.id === "P5_VIC_13")!;
  const pol = ex.prirazeni!.polozky;
  const k = await karta(page, "P5_VIC_13");
  // první dvě správně, třetí záměrně špatně
  await k.getByRole("button", { name: `Položka 1: ${"ABCDEF"[pol[0].spravna]}` }).click();
  await k.getByRole("button", { name: `Položka 2: ${"ABCDEF"[pol[1].spravna]}` }).click();
  await k.getByRole("button", { name: `Položka 3: ${"ABCDEF"[(pol[2].spravna + 1) % 6]}` }).click();
  await k.getByRole("button", { name: "Zkontrolovat" }).click();
  await expect(k.getByText("Správně 2 z 3")).toBeVisible();
  await expect(k.getByText(/správně je 1–A, 2–E, 3–D/)).toBeVisible();
  await expect(k.getByRole("button", { name: "Položka 1: B" })).toBeDisabled();
});

test("přiřazování: výběr jde před kontrolou změnit", async ({ page }) => {
  const k = await karta(page, "P5_VIC_10");
  const a = k.getByRole("button", { name: "Položka 1: A" });
  const b = k.getByRole("button", { name: "Položka 1: B" });
  await a.click();
  await expect(a).toHaveAttribute("aria-pressed", "true");
  await b.click();
  await expect(b).toHaveAttribute("aria-pressed", "true");
  await expect(a).toHaveAttribute("aria-pressed", "false");
});
