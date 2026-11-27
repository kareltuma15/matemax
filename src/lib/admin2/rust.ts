/**
 * Růst (fáze B4, RU-01 až RU-05, RU-08). Trychtýř po lidech: člověk je v kroku, jen když prošel předchozími.
 * Do registrace anonymní návštěvníci (denní otisk, kroky v rámci dne), od registrace účty (žáci z admin_zaci).
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import type { Kontext } from "./data";
import type { Zak } from "./typy";
import { aktivovan, denZ, dnyMezi, posunDen, CENA_PREMIUM, type DnyAktivity } from "./metriky";
import { nazevZdroje } from "./nastaveni";
import { cesta, osoba, s, zdroj, type Udalost } from "./navstevy";

export type Vstup = "registrace" | "uvod" | "email" | "vysledky";
export const NAZVY_VSTUPU: Record<Vstup, string> = { registrace: "Rovnou na registraci", uvod: "Přes úvodní stránku", email: "Z e-mailu", vysledky: "Z výsledků testu" };

export interface Krok { nazev: string; lide: string[]; odpadli: string[]; medianMin: number | null; ucty?: boolean }

const median = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);

/** Anonymní část trychtýře podle vstupu (první stránka dne a zdroj). Každý krok jen z lidí předchozího kroku. */
export function trychtyr(ud: Udalost[], vstup: Vstup): Krok[] {
  const podle = new Map<string, Udalost[]>();
  for (const u of ud) { const o = osoba(u); if (o && o.startsWith("v:")) podle.set(o, [...(podle.get(o) ?? []), u]); }
  const lide = [...podle].filter(([, rr]) => {
    const prvni = rr.find((u) => u.event_name === "page_viewed");
    if (!prvni) return false;
    const src = s(prvni.p.utm_source);
    if (vstup === "email") return src === "email";
    if (vstup === "vysledky") return src === "vysledky";
    if (src === "email" || src === "vysledky") return false;
    return vstup === "registrace" ? cesta(prvni) === "/registrace" : cesta(prvni) === "/";
  });
  const kdy = (rr: Udalost[], test: (u: Udalost) => boolean, po: number) => { const u = rr.find((x) => Date.parse(x.created_at) >= po && test(x)); return u ? Date.parse(u.created_at) : null; };
  const kroky: { nazev: string; test: (u: Udalost) => boolean }[] = [
    { nazev: vstup === "registrace" ? "Otevřeli registraci" : vstup === "uvod" ? "Otevřeli úvodní stránku" : "Přišli", test: (u) => u.event_name === "page_viewed" },
    ...(vstup === "uvod" ? [{ nazev: "Klikli na Začít / registraci", test: (u: Udalost) => (u.event_name === "element_clicked" && /zacit|registr/i.test(s(u.p.cil) ?? "")) || (u.event_name === "page_viewed" && cesta(u) === "/registrace") }] : []),
    ...(vstup !== "registrace" ? [{ nazev: "Otevřeli registraci", test: (u: Udalost) => u.event_name === "page_viewed" && cesta(u) === "/registrace" }] : []),
    { nazev: "Začali vyplňovat", test: (u) => u.event_name === "form_started" && cesta(u) === "/registrace" },
    { nazev: "Odeslali registraci", test: (u) => u.event_name === "signup_submitted" || u.event_name === "signup_google_started" },
  ];
  const out: Krok[] = [];
  let aktual = lide.map(([o, rr]) => ({ o, rr, cas: Date.parse(rr[0].created_at) }));
  for (const k of kroky) {
    const dalsi: typeof aktual = [], casy: number[] = [];
    for (const x of aktual) { const t = kdy(x.rr, k.test, x.cas); if (t !== null) { dalsi.push({ ...x, cas: t }); casy.push((t - x.cas) / 60000); } }
    const prosli = new Set(dalsi.map((x) => x.o));
    out.push({ nazev: k.nazev, lide: [...prosli], odpadli: aktual.filter((x) => !prosli.has(x.o)).map((x) => x.o), medianMin: out.length ? median(casy) : null });
    aktual = dalsi;
  }
  return out;
}

/** Účty: noví žáci v období → diagnostika → 1. trénink do 24 h → návrat 2. den. Odpadlé jde otevřít jako seznam žáků. */
export function trychtyrUctu(zaci: Zak[], od: string, doo: string): Krok[] {
  const novi = zaci.filter((z) => { const d = denZ(z.registrace); return d >= od && d <= doo; });
  const diag = novi.filter((z) => z.diagnostika), tren = diag.filter(aktivovan), navrat = tren.filter((z) => z.vratil_2den);
  const min = (a: Zak[], f: (z: Zak) => string | null) => median(a.filter((z) => f(z)).map((z) => Math.max(0, (Date.parse(f(z)!) - Date.parse(z.registrace)) / 60000)));
  const k = (nazev: string, lide: Zak[], pred: Zak[], m: number | null): Krok => ({ nazev, lide: lide.map((z) => z.id), odpadli: pred.filter((z) => !lide.includes(z)).map((z) => z.id), medianMin: m, ucty: true });
  return [k("Založili účet", novi, novi, null), k("Udělali diagnostiku", diag, novi, min(diag, (z) => z.diagnostika)), k("První trénink do 24 h", tren, diag, min(tren, (z) => z.prvni_trenink)), k("Vrátili se 2. den", navrat, tren, null)];
}

// ── Zdroje (RU-02) ──

export interface Zdroj { klic: string; nazev: string; navstevy: number; registrace: number; aktivovani: number; platici: number; utrata: number | null; zaciIds: string[] }

/** Sloučení domén a vlastního webu do lidských zdrojů. Návrat z platby (Stripe) není zdroj. */
export function sloucenyZdroj(z: string, kampane: Record<string, string>): string {
  const x = z.toLowerCase();
  if (/stripe/.test(x)) return "Návrat z platby";
  if (/^(fb|facebook)( · |$)|facebook\.com$|^m\.facebook|^l\.facebook|instagram/.test(x) && !x.includes(" · ")) return "Facebook (příspěvky a odkazy)";
  if (/matematika-snadno\.cz$/.test(x)) return "Web matematika-snadno.cz";
  if (x === "přímo" || x === "prime" || !x) return "Přímo / neznámo";
  return nazevZdroje(z, kampane);
}

export async function nactiUtratu(k: Kontext, od: string): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (k.demo) { m.set("fb · 120250280402450491", 840); return m; }
  if (!supabaseAdmin) return m;
  const { data } = await supabaseAdmin.from("analytics_events").select("properties, created_at").eq("event_name", "admin_utrata").order("created_at").limit(2000);
  const posledni = new Map<string, { zdroj: string; castka: number }>();
  for (const r of data ?? []) { const p = (r.properties ?? {}) as Record<string, unknown>; const den = String(p.den ?? ""); if (den >= od.slice(0, 10)) posledni.set(`${den}|${p.zdroj}`, { zdroj: String(p.zdroj ?? ""), castka: Number(p.castka ?? 0) }); }
  for (const x of posledni.values()) m.set(x.zdroj, (m.get(x.zdroj) ?? 0) + x.castka);
  return m;
}

export function zdroje(ud: Udalost[], zaci: Zak[], kampane: Record<string, string>, utrata: Map<string, number>, od: string, doo: string): Zdroj[] {
  const m = new Map<string, Zdroj & { nav: Set<string> }>();
  const get = (raw: string) => { const nazev = sloucenyZdroj(raw, kampane); const x = m.get(nazev) ?? { klic: raw, nazev, navstevy: 0, registrace: 0, aktivovani: 0, platici: 0, utrata: null, zaciIds: [], nav: new Set<string>() }; m.set(nazev, x); return x; };
  // Návštěva = první zobrazená stránka anonymního člověka za den (funguje i pro data před příznakem „vstup“ z 26. 11.)
  const videno = new Set<string>();
  for (const u of ud) if (u.event_name === "page_viewed") { const o = osoba(u); if (o && o.startsWith("v:") && !videno.has(o)) { videno.add(o); get(zdroj(u)).nav.add(o); } }
  for (const z of zaci) { const d = denZ(z.registrace); if (d < od || d > doo) continue; const x = get(z.zdroj ?? "přímo"); x.registrace++; x.zaciIds.push(z.id); if (aktivovan(z)) x.aktivovani++; if (z.premium === "stripe") x.platici++; }
  for (const [raw, castka] of utrata) { const x = get(raw); x.utrata = (x.utrata ?? 0) + castka; }
  return [...m.values()].filter((x) => x.nazev !== "Návrat z platby").map(({ nav, ...x }) => ({ ...x, navstevy: nav.size })).sort((a, b) => b.navstevy + b.registrace * 10 - (a.navstevy + a.registrace * 10));
}

// ── Retence (RU-04) ──

export interface Kohorta { tyden: string; zaci: string[]; tydny: { aktivni: string[] }[] }

/** Kohorty podle týdne registrace (pondělí). Buňka = žáci s tréninkem v N-tém týdnu po registraci. */
export function kohorty(zaci: Zak[], dny: DnyAktivity, pocetTydnu = 8, dnes = pragueDateStr()): Kohorta[] {
  const pondeli = (d: string) => { const w = new Date(d + "T12:00:00Z").getUTCDay(); return posunDen(d, -((w + 6) % 7)); };
  const m = new Map<string, Zak[]>();
  for (const z of zaci) { const t = pondeli(denZ(z.registrace)); m.set(t, [...(m.get(t) ?? []), z]); }
  return [...m].sort((a, b) => b[0].localeCompare(a[0])).slice(0, pocetTydnu).map(([tyden, zz]) => ({
    tyden, zaci: zz.map((z) => z.id),
    tydny: Array.from({ length: Math.min(5, Math.floor(dnyMezi(tyden, dnes) / 7) + 1) }, (_, i) => ({
      aktivni: zz.filter((z) => { for (const d of dny.get(z.id) ?? []) { const n = Math.floor(dnyMezi(pondeli(denZ(z.registrace)), d) / 7); if (n === i) return true; } return false; }).map((z) => z.id),
    })),
  }));
}

// ── Peníze (RU-05) ──

export async function penize(k: Kontext, zaci: Zak[], od: string) {
  const platici = zaci.filter((z) => z.premium === "stripe");
  const rucne = zaci.filter((z) => z.premium === "rucne" || z.premium === "zkusebni");
  let zaplaceno = 0, vraceno = 0, nova = 0, zrusena = 0, selhalo = 0;
  if (!k.demo && supabaseAdmin) {
    const [{ data: ev }, { data: wh }] = await Promise.all([
      supabaseAdmin.from("analytics_events").select("event_name, properties").in("event_name", ["invoice_paid", "charge_refunded"]).gte("created_at", od).limit(2000),
      supabaseAdmin.from("webhooky").select("typ").eq("zdroj", "stripe").gte("prijato_at", od).limit(5000),
    ]);
    for (const e of ev ?? []) { const c = Number((e.properties as Record<string, unknown> | null)?.castka ?? 0) / 100; if (e.event_name === "invoice_paid") zaplaceno += c; else vraceno += c; }
    for (const w of wh ?? []) { if (w.typ === "checkout.session.completed") nova++; if (w.typ === "customer.subscription.deleted") zrusena++; if (w.typ === "invoice.payment_failed") selhalo++; }
  } else if (k.demo) { zaplaceno = 99; nova = 1; }
  return { platici: platici.map((z) => z.id), mesicne: platici.length * CENA_PREMIUM, rucne: rucne.map((z) => ({ id: z.id, do: z.premium_do })), zaplaceno, vraceno, nova, zrusena, selhalo, meriSeOd: "2026-11-27" };
}
