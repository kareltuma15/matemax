/**
 * Demo data nového adminu (technický požadavek: generátor realistických testovacích dat oddělený od ostrých dat).
 * Zapíná se v adminu přepínačem „Demo data“ (cookie admin_demo=1) nebo ?demo=1. Nic se nečte z databáze
 * ani nezapisuje. Deterministické (stejná data při každém načtení), jména jsou vymyšlená.
 * Obsahuje i testovací účet a admina, aby šlo ověřit, že se nikde nepočítají (DA-10).
 */
import type { Aktivita, Zak } from "./typy";

const JMENA = ["Tomáš", "Eliška", "Jakub", "Anna", "Matěj", "Tereza", "Vojtěch", "Natálie", "Ondřej", "Klára", "Filip", "Adéla", "Lukáš", "Barbora", "Šimon", "Karolína", "David", "Veronika", "Adam", "Kristýna", "Daniel", "Zuzana", "Marek", "Lucie"];
const ZDROJE = ["fb · 120250280402450491", "fb · 120250280402450491", "letak · dod-gymnazium-tyn", "přímo", "facebook", "vysledky · test-14-11", "google", null];
const ODKUD = ["facebook", "kamarad", "skola", "letak", "test", null, null];

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const denPraha = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });

export interface DemoData { zaci: (Zak & { _testovaci?: boolean; _admin?: boolean })[]; aktivita: Aktivita[] }

let cache: { den: string; data: DemoData } | null = null;

export function demoData(): DemoData {
  const dnes = denPraha(new Date());
  if (cache?.den === dnes) return cache.data;
  const r = rng(20261127);
  const ted = Date.now();
  const zaci: DemoData["zaci"] = [];
  const aktivita: Aktivita[] = [];
  for (let i = 0; i < JMENA.length + 2; i++) {
    const testovaci = i === JMENA.length, admin = i === JMENA.length + 1;
    const dnyZpet = Math.floor(r() * 75);
    const registrace = new Date(ted - dnyZpet * 86400000 - Math.floor(r() * 20) * 3600000);
    const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const aktivni = r();
    const trida: 5 | 9 = r() < 0.3 ? 5 : 9;
    const diag = r() < 0.75 ? new Date(registrace.getTime() + Math.floor(r() * 40) * 60000) : null;
    const dny = new Set<string>();
    if (diag) {
      const intenzita = aktivni > 0.6 ? 0.55 : aktivni > 0.3 ? 0.2 : 0.04;
      for (let d = 0; d <= dnyZpet; d++) if ((d === 0 && r() < 0.6) || r() < intenzita * (aktivni > 0.8 && d > dnyZpet - 3 ? 1.5 : 1)) dny.add(denPraha(new Date(registrace.getTime() + d * 86400000)));
    }
    const serazene = [...dny].sort();
    for (const d of serazene) aktivita.push({ user_id: id, den: d, druh: "trenink", pocet: 1 + Math.floor(r() * 3) });
    if (diag) aktivita.push({ user_id: id, den: denPraha(diag), druh: "diagnostika", pocet: 1 });
    const odpovedi = serazene.length * (8 + Math.floor(r() * 10));
    const premiumLos = r();
    const regDen = denPraha(registrace);
    const druhyDen = denPraha(new Date(registrace.getTime() + 86400000));
    zaci.push({
      id,
      email: testovaci ? "test@example.invalid" : admin ? "admin@example.invalid" : `${JMENA[i].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")}${i}@example.invalid`,
      jmeno: testovaci ? "Testovací" : admin ? "Admin" : JMENA[i],
      trida,
      registrace: registrace.toISOString(),
      zdroj: ZDROJE[Math.floor(r() * ZDROJE.length)],
      odkud: ODKUD[Math.floor(r() * ODKUD.length)],
      email_overen: r() < 0.9 ? registrace.toISOString() : null,
      posledni_prihlaseni: serazene.length ? `${serazene[serazene.length - 1]}T16:00:00Z` : registrace.toISOString(),
      diagnostika: diag?.toISOString() ?? null,
      prvni_trenink: serazene.length ? new Date(Math.max(Date.parse(`${serazene[0]}T15:00:00Z`), (diag?.getTime() ?? 0) + 600000)).toISOString() : null,
      posledni_aktivita: serazene[serazene.length - 1] ?? (diag ? denPraha(diag) : null),
      dny_7: serazene.filter((d) => Date.parse(d) > ted - 7 * 86400000).length,
      dny_celkem: dny.size,
      odpovedi,
      spravne: Math.round(odpovedi * (0.5 + r() * 0.45)),
      vratil_2den: dny.has(druhyDen) && regDen !== druhyDen,
      premium: premiumLos < 0.08 ? "stripe" : premiumLos < 0.14 ? "rucne" : premiumLos < 0.18 ? "zkusebni" : "zdarma",
      premium_do: premiumLos >= 0.08 && premiumLos < 0.18 ? new Date(ted + Math.floor(r() * 30) * 86400000).toISOString() : null,
      souhlas_podminky: dnyZpet < 1 ? registrace.toISOString() : null,
      souhlas_novinky: dnyZpet < 1 ? r() < 0.4 : null,
      prezdivka: null,
      rodic_email: r() < 0.15 ? "rodic@example.invalid" : null,
      propojeno_vysledky: r() < 0.2 ? registrace.toISOString() : null,
      odhlasen_emaily: r() < 0.05,
      ...(testovaci ? { _testovaci: true } : {}),
      ...(admin ? { _admin: true } : {}),
    });
  }
  const data = { zaci, aktivita };
  cache = { den: dnes, data };
  return data;
}
