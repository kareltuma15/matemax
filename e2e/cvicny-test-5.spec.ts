import { test, expect } from "@playwright/test";
import { examples5 } from "../src/data/examples";
import {
  KOSTRA_TESTU_5, sestavTest5, vyhodnotTest5, bodyCasti, typCasti, TEST5_MAX_BODU,
  type OdpovedCasti, type CastTestu,
} from "../src/lib/cvicny-test-5";

// Cvičný test pro 5. třídu: kostra přijímaček CERMAT na víceletá gymnázia (14 úloh, 70 minut, 50 bodů).

/** Pseudonáhoda se semínkem, ať jde test zopakovat. */
function nahoda(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

function spravnaOdpoved(c: CastTestu): OdpovedCasti {
  switch (c.typ) {
    case "text": return { text: c.ex.odpoved };
    case "rys": return { rys: true };
    case "AE": return { volby: [c.ex.spravna!] };
    case "AN": return { volby: c.ex.tvrzeni!.map((t) => (t.pravda ? 0 : 1)) };
    case "AF": return { volby: c.ex.prirazeni!.polozky.map((p) => p.spravna) };
  }
}

test("kostra: 14 úloh, dohromady 50 bodů, rýsování 6 bodů", () => {
  expect(KOSTRA_TESTU_5.map((u) => u.cislo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  expect(KOSTRA_TESTU_5.flatMap((u) => u.casti).reduce((s, c) => s + c.body, 0)).toBe(TEST5_MAX_BODU);
  expect(KOSTRA_TESTU_5.find((u) => u.cislo === 7)!.casti.reduce((s, c) => s + c.body, 0)).toBe(6);
});

test("losování: vždy všech 14 úloh za 50 bodů, jen úlohy 5. třídy, žádná dvakrát, správný typ karty", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const t = sestavTest5(examples5, nahoda(seed));
    expect(t.map((u) => u.cislo), `seed ${seed}`).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const casti = t.flatMap((u) => u.casti);
    expect(casti.reduce((s, c) => s + c.body, 0), `seed ${seed}`).toBe(50);
    expect(new Set(casti.map((c) => c.ex.id)).size).toBe(casti.length);
    for (const c of casti) {
      expect(c.ex.tema.startsWith("p5_")).toBe(true);
      expect(typCasti(c.ex)).toBe(c.typ);
    }
    expect(t.find((u) => u.cislo === 7)!.casti.every((c) => c.typ === "rys")).toBe(true);
    expect(t.find((u) => u.cislo === 14)!.casti.every((c) => c.ex.podtema === "p5_vzory")).toBe(true);
  }
});

test("body: všechno správně = 50, nic = 0, dílčí body poměrně dolů", () => {
  const t = sestavTest5(examples5, nahoda(7));
  const casti = t.flatMap((u) => u.casti);
  const vse = Object.fromEntries(casti.map((c) => [c.ex.id, spravnaOdpoved(c)]));
  expect(vyhodnotTest5(t, vse).body).toBe(50);
  const nic = vyhodnotTest5(t, {});
  expect(nic.body).toBe(0);
  expect(nic.max).toBe(50);
  expect(nic.ulohy).toHaveLength(14);

  // přiřazování (5 bodů, 3 položky): 2 správně = 3 body, 1 správně = 1 bod
  const af = casti.find((c) => c.typ === "AF")!;
  const spr = af.ex.prirazeni!.polozky.map((p) => p.spravna);
  const spatne = (i: number) => (spr[i] + 1) % af.ex.prirazeni!.nabidka.length;
  if (spr.length === 3) {
    expect(bodyCasti(af, { volby: [spr[0], spr[1], spatne(2)] })).toBe(3);
    expect(bodyCasti(af, { volby: [spr[0], spatne(1), spatne(2)] })).toBe(1);
  }
  // pravda/nepravda: všechno správně = 4, jedno špatně méně
  const an = casti.find((c) => c.typ === "AN")!;
  const ok = an.ex.tvrzeni!.map((x) => (x.pravda ? 0 : 1));
  expect(bodyCasti(an, { volby: ok })).toBe(4);
  expect(bodyCasti(an, { volby: [1 - ok[0], ...ok.slice(1)] })).toBeLessThan(4);
  // výběr A–E: jen celé body
  const ae = casti.find((c) => c.typ === "AE")!;
  expect(bodyCasti(ae, { volby: [ae.ex.spravna!] })).toBe(2);
  expect(bodyCasti(ae, { volby: [(ae.ex.spravna! + 1) % ae.ex.moznosti!.length] })).toBe(0);
  // okruhy: součet bodů po okruzích = 50
  expect(nic.okruhy.reduce((s, o) => s + o.max, 0)).toBe(50);
});

test("obrazovka: úvod, test na 70 minut, rozpracovaný test přežije obnovení, odevzdání ukáže body", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
  await page.goto("/cermat-test");
  await expect(page.getByTestId("cvicny-test-5")).toContainText("14 úloh, 70 minut, 50 bodů");
  await page.getByTestId("cvicny-test-5-start").click();

  await expect(page.getByTestId("cvicny-test-5-bezi")).toBeVisible();
  await expect(page.getByTestId("cvicny-test-5-cas")).toHaveText(/^(70:00|69:5\d)$/);
  for (let i = 1; i <= 14; i++) await expect(page.getByTestId(`uloha-${i}`)).toBeVisible();
  await expect(page.getByTestId("rys-v-testu").first()).toBeVisible();
  // během testu se nic nekontroluje
  await expect(page.getByRole("button", { name: "Zkontrolovat výsledek" })).toHaveCount(0);

  await page.getByTestId("vstup-1.1").fill("12345");
  await page.getByTestId("moznost-9-A").click();
  await expect(page.getByTestId("cvicny-test-5-vyplneno")).toContainText("Vyplněno 2 z");

  await page.reload();
  await expect(page.getByTestId("cvicny-test-5-bezi")).toBeVisible();
  await expect(page.getByTestId("vstup-1.1")).toHaveValue("12345");
  await expect(page.getByTestId("cvicny-test-5-vyplneno")).toContainText("Vyplněno 2 z");

  await page.getByTestId("cvicny-test-5-odevzdat").click();
  await expect(page.getByTestId("cvicny-test-5-vysledky")).toBeVisible();
  await expect(page.getByTestId("cvicny-test-5-body")).toContainText("z 50");
  await expect(page.getByTestId("uloha-body-14")).toBeVisible();

  // výsledek se ukáže v Testech a rozpracovaný test je pryč
  await page.goto("/testy");
  await expect(page.getByTestId("testy-cermat")).toContainText(/Naposledy \d+ z 50 bodů/);
  await page.goto("/cermat-test");
  await expect(page.getByTestId("cvicny-test-5")).toBeVisible();
  await expect(page.getByTestId("cvicny-test-5-posledni")).toContainText("z 50 bodů");
});

test("vypršení času test sám odevzdá", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("matemax-trida", "5"));
  await page.goto("/cermat-test");
  await page.getByTestId("cvicny-test-5-start").click();
  await expect(page.getByTestId("cvicny-test-5-bezi")).toBeVisible();
  // čas vypršel, zatímco stránka nebyla otevřená: po načtení se test odevzdá s tím, co žák stihl
  await page.getByTestId("vstup-1.1").fill("7");
  await page.evaluate(() => {
    const k = "cvicny-test-5-rozpracovany";
    const u = JSON.parse(localStorage.getItem(k)!);
    u.start = Date.now() - 71 * 60 * 1000;
    localStorage.setItem(k, JSON.stringify(u));
  });
  await page.reload();
  await expect(page.getByTestId("cvicny-test-5-vysledky")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Čas vypršel")).toBeVisible();
});
