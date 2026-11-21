import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import { overDoporuceni } from "../src/lib/doporuceni-server";
import { normalizujDoporuceni, sestavDoporucenouSadu, proc, cilovaObtiznost } from "../src/lib/doporuceni";
import { lokalniPlanPatri } from "../src/lib/plan-po-testu";
import { pondeliTydne, localDateStr } from "../src/lib/date";

// Doporučení po testu nanečisto z appky Vyhodnocení testů (dohodnutý formát v1).

const KLIC = "cvicny-klic-nepouzivat-v-provozu";
const UKAZKA = "eyJ2IjoxLCJzcmMiOiJuYW5lY2lzdG8iLCJnIjoibTkiLCJ0ZXN0Ijp7Im4iOjEsImQiOiIyMDI2LTExLTE0In0sImRhbHNpIjoiMjAyNi0xMi0xMiIsInRvcCI6W3siayI6Inpsb21reSIsInB0cyI6MiwibWF4Ijo2LCJqIjoiZG9sYWRpdCJ9LHsiayI6InNsb3ZuaV91bG9oeSIsInMiOiJwb2h5YiIsInB0cyI6MCwibWF4IjoyLCJqIjoiemF0aW0xIn0seyJrIjoiZ2VvbWV0cmllIiwicHRzIjo1LCJtYXgiOjksImoiOiJ6aG9yc2lsbyJ9XSwiaWF0IjoxNzk0NTI4MDAwLCJleHAiOjE4MDQ4OTYwMDB9.aPSi-sFhLQ-Y4-JIBG-JA_sYE4Qb-5vId_XgyBTujX8";
const OCEKAVANE = {
  v: 1, src: "nanecisto", g: "m9", test: { n: 1, d: "2026-11-14" }, dalsi: "2026-12-12",
  top: [
    { k: "zlomky", pts: 2, max: 6, j: "doladit" },
    { k: "slovni_ulohy", s: "pohyb", pts: 0, max: 2, j: "zatim1" },
    { k: "geometrie", pts: 5, max: 9, j: "zhorsilo" },
  ],
  iat: 1794528000, exp: 1804896000,
};
const podepis = (json: unknown) => {
  const data = Buffer.from(JSON.stringify(json), "utf8").toString("base64url");
  return `${data}.${createHmac("sha256", KLIC).update(data).digest("base64url")}`;
};
const PRED_EXPIRACI = 1795000000;

test("ukázkový odkaz s cvičným klíčem projde a dá přesně dohodnutý JSON", () => {
  const v = overDoporuceni(UKAZKA, KLIC, PRED_EXPIRACI);
  expect(v.ok).toBe(true);
  if (v.ok) expect(v.doporuceni).toEqual(OCEKAVANE);
});

test("změněný znak v datech nebo v podpisu, prošlý odkaz a jiný klíč neprojdou", () => {
  const [data, podpis] = UKAZKA.split(".");
  const jinyZnak = (s: string, i: number) => s.slice(0, i) + (s[i] === "A" ? "B" : "A") + s.slice(i + 1);
  expect(overDoporuceni(`${jinyZnak(data, 20)}.${podpis}`, KLIC, PRED_EXPIRACI)).toEqual({ ok: false, duvod: "podpis" });
  expect(overDoporuceni(`${data}.${jinyZnak(podpis, 5)}`, KLIC, PRED_EXPIRACI)).toEqual({ ok: false, duvod: "podpis" });
  expect(overDoporuceni(UKAZKA, KLIC, OCEKAVANE.exp + 1)).toEqual({ ok: false, duvod: "proslo" });
  expect(overDoporuceni(UKAZKA, "jiny-klic", PRED_EXPIRACI).ok).toBe(false);
  expect(overDoporuceni(UKAZKA, undefined, PRED_EXPIRACI)).toEqual({ ok: false, duvod: "klic" });
  expect(overDoporuceni("nesmysl", KLIC, PRED_EXPIRACI).ok).toBe(false);
});

test("neznámé téma nebo dovednost se vynechá, zbytek doporučení platí", () => {
  const d = normalizujDoporuceni({ ...OCEKAVANE, top: [{ k: "astrologie", pts: 1, max: 2, j: "doladit" }, { k: "zlomky", s: "neexistuje", pts: 1, max: 6, j: "divne" }] });
  expect(d?.top).toEqual([{ k: "zlomky", pts: 1, max: 6, j: "doladit" }]);
  // téma 5. třídy v doporučení pro 9. třídu se nepoužije
  expect(normalizujDoporuceni({ ...OCEKAVANE, top: [{ k: "p5_obsah", pts: 1, max: 2, j: "doladit" }] })).toBeNull();
  // podepsané doporučení s neznámým tématem projde ověřením i tak
  const v = overDoporuceni(podepis({ ...OCEKAVANE, top: [...OCEKAVANE.top, { k: "xyz", pts: 0, max: 1, j: "nebylo" }] }), KLIC, PRED_EXPIRACI);
  expect(v.ok && v.doporuceni.top.length).toBe(3);
});

test("doporučená sada: 6 / 3 / 1 příkladů, obtížnost podle bodů, zamčené téma se přeskočí", () => {
  const ulohy = ["zlomky", "slovni_ulohy", "geometrie"].flatMap((tema) =>
    [1, 2, 3].flatMap((o) => Array.from({ length: 8 }, (_, i) => ({ id: `${tema}-${o}-${i}`, tema, obtiznost: o, dovednost: tema === "slovni_ulohy" && i < 4 ? "pohyb" : undefined }))));
  const sada = sestavDoporucenouSadu(OCEKAVANE.top as never, ulohy, () => false, (u) => u.dovednost, () => 0);
  expect(sada).toHaveLength(10);
  expect(sada.filter((id) => id.startsWith("zlomky")).length).toBe(6);
  expect(sada.filter((id) => id.startsWith("slovni_ulohy")).length).toBe(3);
  expect(sada.filter((id) => id.startsWith("geometrie")).length).toBe(1);
  // zlomky 2 z 6 bodů = pod 40 % → lehčí příklady
  expect(sada.filter((id) => id.startsWith("zlomky")).every((id) => id.startsWith("zlomky-1"))).toBe(true);
  expect(cilovaObtiznost(5, 9)).toBe(2);
  expect(cilovaObtiznost(8, 9)).toBe(3);
  // pohyb: jen úlohy z dovednosti pohyb
  expect(sada.filter((id) => id.startsWith("slovni_ulohy")).every((id) => Number(id.split("-")[2]) < 4)).toBe(true);

  const bezPremium = sestavDoporucenouSadu(OCEKAVANE.top as never, ulohy, (t) => t !== "zlomky", (u) => u.dovednost, () => 0);
  expect(bezPremium).toHaveLength(10);
  expect(bezPremium.every((id) => id.startsWith("zlomky"))).toBe(true);
  expect(proc(OCEKAVANE.top[1] as never)).toBe("v testu 0 z 2 bodů, zatím jednou");
});

test("host s platným odkazem vidí doporučení a registraci, neplatný odkaz ukáže větu a výběr témat", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "9"));
  await page.goto(`/trenink?doporuceni=${UKAZKA}`);
  const obrazovka = page.getByTestId("doporuceni-po-testu");
  await expect(obrazovka).toContainText("Po 1. testu nanečisto (14. 11.)");
  await expect(obrazovka).toContainText("Další test 12. 12.");
  await expect(obrazovka.locator("[data-tema]")).toHaveCount(3);
  await expect(obrazovka).toContainText("Slovní úlohy: Pohyb");
  await expect(obrazovka).toContainText("v testu 2 z 6 bodů");
  await expect(page.getByTestId("doporuceni-host")).toBeVisible();
  // odkaz si zařízení pamatuje pro dobu po přihlášení
  expect(await page.evaluate(() => localStorage.getItem("matemax-doporuceni-odkaz"))).toContain(UKAZKA.slice(0, 20));

  await page.goto(`/trenink?doporuceni=${UKAZKA.slice(0, -3)}abc`);
  await expect(page.getByTestId("doporuceni-neplatne")).toBeVisible();
  await expect(page.getByTestId("doporuceni-po-testu")).toHaveCount(0);
});

test("plán po testu v prohlížeči patří jen svému účtu (sdílený telefon)", () => {
  expect(lokalniPlanPatri({ uid: "A" }, "A")).toBe(true);
  expect(lokalniPlanPatri({ uid: "A" }, "B")).toBe(false);
  expect(lokalniPlanPatri({}, "B")).toBe(false); // stará kopie bez účtu se přihlášenému neukáže
  expect(lokalniPlanPatri({}, null)).toBe(true); // host vidí svou
  expect(lokalniPlanPatri({ uid: "A" }, null)).toBe(false);
  expect(lokalniPlanPatri(null, "A")).toBe(false);
});

test("kalendář aktivity: poslední sloupec je tento týden, začátek pondělí o 7 týdnů dřív", () => {
  // sobota 21. 11. 2026 → tento týden začíná 16. 11., mřížka 28. 9.–22. 11.
  expect(localDateStr(pondeliTydne(new Date(2026, 10, 21), 0))).toBe("2026-11-16");
  expect(localDateStr(pondeliTydne(new Date(2026, 10, 21), 7))).toBe("2026-09-28");
  // neděle patří k týdnu, který začal v pondělí
  expect(localDateStr(pondeliTydne(new Date(2026, 10, 22), 0))).toBe("2026-11-16");
  expect(localDateStr(pondeliTydne(new Date(2026, 10, 16), 0))).toBe("2026-11-16");
});
