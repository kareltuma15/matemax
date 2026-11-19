import { test, expect } from "@playwright/test";

// Mobil (Karel 19. 11. 2026): na úzkém telefonu nesmí být text mimo obrazovku ani useknutý.
// Kontrolují se veřejné stránky ve 320 a 375 px. Ozdoby (aria-hidden) a vodorovně posuvné pásy se nepočítají.

import { NAVRAT_PRODUKCE } from "../src/lib/vysledky";

// Úvod pro žáka z osobního QR (skenuje se telefonem)
const QR = `/propojit?klient=vysledky&state=abc123&navrat=${encodeURIComponent(NAVRAT_PRODUKCE)}&uvod=qr&g=m9&test=2026-12-12`;
const STRANKY = ["/", "/cenik", "/jak-to-funguje", "/prihlaseni", "/registrace", "/sbirka", "/trenink", "/testy-nanecisto", "/rodice", QR];

for (const sirka of [320, 375]) {
  test.describe(`mobil ${sirka} px`, () => {
    test.use({ viewport: { width: sirka, height: 800 } });
    for (const cesta of STRANKY) {
      test(`${cesta === QR ? "úvod z QR" : cesta}: nic mimo obrazovku`, async ({ page }, info) => {
        test.skip(info.project.name !== "mobile", "stačí jeden projekt");
        await page.addInitScript(() => { localStorage.setItem("matemax-trida", "9"); localStorage.setItem("matemax-hexik-uvod", "1"); });
        await page.goto(cesta, { waitUntil: "networkidle" });
        const mimo = await page.evaluate((W) => {
          const vadne: string[] = [];
          for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
            if (el.children.length || !(el.innerText || "").trim() || el.closest("[aria-hidden='true']")) continue;
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") continue;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            let p = el.parentElement, posuvne = false;
            while (p) { const x = getComputedStyle(p); if (/(auto|scroll)/.test(x.overflowX) && p.scrollWidth > p.clientWidth) { posuvne = true; break; } p = p.parentElement; }
            if (!posuvne && (r.right > W + 1 || r.left < -1)) vadne.push(`${Math.round(r.left)}..${Math.round(r.right)} «${el.innerText.trim().slice(0, 40)}»`);
          }
          return { vadne: vadne.slice(0, 10), sirka: document.documentElement.scrollWidth };
        }, sirka);
        expect(mimo.sirka, "stránka nesmí jít posouvat do strany").toBeLessThanOrEqual(sirka);
        expect(mimo.vadne, "text mimo obrazovku").toEqual([]);
      });
    }
  });
}
