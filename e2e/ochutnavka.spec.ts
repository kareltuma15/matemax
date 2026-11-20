import { test, expect, type BrowserContext } from "@playwright/test";
import { sestavDoporucenouSadu } from "../src/lib/doporuceni";

// Dárek po testu nanečisto (ochutnávka, Karel 20. 11. 2026): bez Premium 10 příkladů zdarma
// z každého doporučeného Premium tématu, dítěti žádná cena, ta je jen v rámečku Pro rodiče.

// Stejný podepsaný odkaz jako v doporuceni.spec.ts (cvičný klíč): zlomky (zdarma), slovní úlohy: pohyb a geometrie (Premium)
const UKAZKA = "eyJ2IjoxLCJzcmMiOiJuYW5lY2lzdG8iLCJnIjoibTkiLCJ0ZXN0Ijp7Im4iOjEsImQiOiIyMDI2LTExLTE0In0sImRhbHNpIjoiMjAyNi0xMi0xMiIsInRvcCI6W3siayI6Inpsb21reSIsInB0cyI6MiwibWF4Ijo2LCJqIjoiZG9sYWRpdCJ9LHsiayI6InNsb3ZuaV91bG9oeSIsInMiOiJwb2h5YiIsInB0cyI6MCwibWF4IjoyLCJqIjoiemF0aW0xIn0seyJrIjoiZ2VvbWV0cmllIiwicHRzIjo1LCJtYXgiOjksImoiOiJ6aG9yc2lsbyJ9XSwiaWF0IjoxNzk0NTI4MDAwLCJleHAiOjE4MDQ4OTYwMDB9.aPSi-sFhLQ-Y4-JIBG-JA_sYE4Qb-5vId_XgyBTujX8";
const KLIC_DARKU = "m9-1-2026-11-14";
const TOP = [
  { k: "zlomky", pts: 2, max: 6, j: "doladit" },
  { k: "slovni_ulohy", s: "pohyb", pts: 0, max: 2, j: "zatim1" },
  { k: "geometrie", pts: 5, max: 9, j: "zhorsilo" },
];

async function falesnaRelace(context: BrowserContext) {
  const fs = await import("fs");
  const env = fs.readFileSync(".env.local", "utf8");
  const ref = new URL(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)![1].replace(/["']/g, "")).hostname.split(".")[0];
  const user = { id: "00000000-0000-4000-8000-000000000000", aud: "authenticated", role: "authenticated", email: "zak@example.com", app_metadata: {}, user_metadata: { first_name: "Tomáš", trida: 9 }, created_at: "2026-10-01T00:00:00Z" };
  const relace = { access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
  await context.addCookies([{ name: `sb-${ref}-auth-token`, value: "base64-" + Buffer.from(JSON.stringify(relace)).toString("base64url"), domain: "localhost", path: "/" }]);
  await context.route("**/auth/v1/user**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(user) }));
  await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
}

test("strop tématu: omezené téma dá jen kolik smí, zbytek připadne dalším tématům", () => {
  const ulohy = ["zlomky", "slovni_ulohy", "geometrie"].flatMap((tema) =>
    [1, 2, 3].flatMap((o) => Array.from({ length: 8 }, (_, i) => ({ id: `${tema}-${o}-${i}`, tema, obtiznost: o, dovednost: tema === "slovni_ulohy" && i < 4 ? "pohyb" : undefined }))));
  const strop = (t: string) => (t === "slovni_ulohy" ? 2 : t === "geometrie" ? 0 : Infinity);
  const sada = sestavDoporucenouSadu(TOP as never, ulohy, () => false, (u) => u.dovednost, () => 0, strop);
  expect(sada).toHaveLength(10);
  expect(sada.filter((id) => id.startsWith("slovni_ulohy")).length).toBe(2);
  expect(sada.filter((id) => id.startsWith("geometrie")).length).toBe(0);
  expect(sada.filter((id) => id.startsWith("zlomky")).length).toBe(8);
});

test("bez Premium: dárek po testu místo zámků, cena jen pro rodiče", async ({ page, context }) => {
  await falesnaRelace(context);
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto(`/trenink?doporuceni=${UKAZKA}`);
  const obrazovka = page.getByTestId("doporuceni-po-testu");
  await expect(page.getByTestId("darek-pruh")).toContainText("Dárek po testu", { timeout: 20_000 });
  await expect(page.getByTestId("darek-stitek")).toHaveCount(2);
  await expect(page.getByTestId("darek-stitek").first()).toContainText("10 příkladů zdarma");
  await expect(obrazovka).not.toContainText("🔒");
  await expect(page.getByTestId("doporuceni-start")).toContainText("dárkový trénink");
  // Dítěti žádná cena, ta je jen v rámečku Pro rodiče
  const rodice = page.getByTestId("pro-rodice");
  await expect(rodice).toContainText("99 Kč měsíčně");
  const textBezRodicu = await obrazovka.evaluate((el) => {
    const kopie = el.cloneNode(true) as HTMLElement;
    kopie.querySelectorAll("[data-testid=pro-rodice]").forEach((x) => x.remove());
    return kopie.innerText;
  });
  expect(textBezRodicu).not.toMatch(/Kč|Kup|Vyzkoušet Premium|Řekni rodičům/);

  // Hlavní trénink míchá i Premium témata
  await page.getByTestId("doporuceni-start").click();
  const ulohy = (await page.getByTestId("sezeni").getAttribute("data-ulohy"))!.split(",");
  expect(ulohy).toHaveLength(10);
  await expect(page.getByTestId("sezeni")).toHaveAttribute("data-darek", "slovni_ulohy,geometrie");
});

test("dárek z tématu se počítá: zbývá 3 z 10 → trénink tématu má 3 příklady bez zámku", async ({ page, context }) => {
  await falesnaRelace(context);
  await page.addInitScript((klic) => {
    localStorage.setItem("matemax-trida", "9");
    localStorage.setItem("matemax-darek-po-testu", JSON.stringify({ klic, pouzito: { geometrie: 7, slovni_ulohy: 10 } }));
  }, KLIC_DARKU);
  await page.goto(`/trenink?doporuceni=${UKAZKA}`);
  await expect(page.getByTestId("darek-stitek")).toHaveCount(1, { timeout: 20_000 });
  await expect(page.getByTestId("darek-stitek")).toContainText("zbývá 3 z 10");
  await expect(page.getByTestId("doporuceni-po-testu")).toContainText("Dárek hotový");
  await page.getByTestId("darek-trenovat").click();
  const ulohy = (await page.getByTestId("sezeni").getAttribute("data-ulohy"))!.split(",");
  expect(ulohy).toHaveLength(3);
  await expect(page.getByTestId("darek-v-treninku")).toContainText(/zbývá|zdarma/);
  await expect(page.getByTestId("upgrade-card")).toHaveCount(0);
});
