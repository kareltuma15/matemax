/**
 * Analytika MateMaxu pro admina (Karel 22. 11. 2026, mockup docs/appka-2026-11/analytika-mockup.html).
 * Jen na serveru (service role). Vrací souhrny a počty, žádné e-maily ani jména.
 *
 * Zdroje dat:
 *  - analytics_events: návštěvy bez cookies (denní otisk v), kliky, registrace, Premium, „zive“ (minuta v appce,
 *    s účtem), session_completed (s výsledky úloh „u“), diagnostika_dokoncena, funkce (herní systém),
 *    admin_utrata / admin_poznamka (útrata za reklamu a poznámky do grafu, zadává admin);
 *  - auth.users (registrace, potvrzení e-mailu, user_metadata.zdroj a trida), sessions (dokončené tréninky),
 *    user_sbirka (truhly), Stripe (předplatné: platící, měsíční příjem, zrušení).
 *
 * POZOR: Supabase vrací nejvýš 1 000 řádků na dotaz. Všechno se proto načítá po stránkách (nactiVse).
 */
import { supabaseAdmin } from "./supabase-admin";
import { pragueDateStr } from "./date";
import { allExamples } from "@/data/examples";
import { vsechnyUcty, vylouceneUcty } from "./admin-data";

const DEN = 86_400_000;

export type Zarizeni = "mobil" | "pocitac";
export interface FiltryAnalytiky { dni: number; trida: 5 | 9 | null; zdroj: string | null; zarizeni: Zarizeni | null }

type Props = Record<string, unknown>;
type Ev = { event_name: string; created_at: string; user_id: string | null; properties: Props | null };

const s = (v: unknown) => (typeof v === "string" ? v : undefined);
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Všechny řádky dotazu po stránkách po 1 000 (strop Supabase). */
async function nactiVse<T>(dotaz: (od: number, do_: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, max = 200_000): Promise<T[]> {
  const out: T[] = [];
  for (let od = 0; od < max; od += 1000) {
    const { data, error } = await dotaz(od, od + 999);
    if (error) throw new Error(error.message);
    const d = data ?? [];
    out.push(...d);
    if (d.length < 1000) break;
  }
  return out;
}

/** Hodina v Praze (kvůli půlnoci podle Prahy, ne UTC). */
const hodinaPraha = (d: Date) => Number(new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", hourCycle: "h23" }).format(d));
/** UTC čas pražské půlnoci daného dne (YYYY-MM-DD). */
export function pulnocPraha(den: string): number {
  const g = Date.parse(den + "T00:00:00Z");
  return g - hodinaPraha(new Date(g)) * 3600_000;
}
const denPraha = (iso: string | number) => pragueDateStr(new Date(iso));
const posunDen = (den: string, o: number) => pragueDateStr(new Date(pulnocPraha(den) + o * DEN + 12 * 3600_000));
const dnyMezi = (a: string, b: string) => Math.round((pulnocPraha(b) - pulnocPraha(a)) / DEN);

/** Zdroj návštěvy stejně jako v klientu (Mereni.zdrojProUcet): kampaň · utm, Facebook, cizí web, přímo. */
export function zdrojUdalosti(p: Props | null): string {
  const x = p ?? {};
  const us = s(x.utm_source);
  if (us) return [us, s(x.utm_campaign)].filter(Boolean).join(" · ");
  const r = s(x.ref) ?? "";
  if (/(^|\.)facebook\.com$|^fb\.me$/.test(r)) return "facebook";
  if (/(^|\.)instagram\.com$/.test(r)) return "instagram";
  return r || "přímo";
}
const NEUVEDENO = "neuvedeno (účty před 22. 11.)";

interface Predplatne { id: string; userId: string | null; vytvoreno: number; zruseno: number | null; mesicneKc: number; aktivni: boolean }

/** Předplatné ze Stripe (bez Stripe klíče prázdné). Měsíční částka v Kč z ceny a intervalu. */
async function nactiPredplatne(): Promise<Predplatne[] | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const { stripe } = await import("./stripe");
    const out: Predplatne[] = [];
    let starting_after: string | undefined;
    for (let i = 0; i < 20; i++) {
      const r = await stripe.subscriptions.list({ status: "all", limit: 100, ...(starting_after ? { starting_after } : {}) });
      for (const sub of r.data) {
        const mesicne = sub.items.data.reduce((a, it) => {
          const p = it.price; const castka = (p.unit_amount ?? 0) * (it.quantity ?? 1) / 100;
          const int = p.recurring?.interval ?? "month", pocet = p.recurring?.interval_count ?? 1;
          const naMesic = int === "year" ? castka / (12 * pocet) : int === "week" ? castka * 52 / 12 / pocet : int === "day" ? castka * 30 / pocet : castka / pocet;
          return a + (p.currency === "czk" ? naMesic : 0);
        }, 0);
        out.push({
          id: sub.id,
          userId: s((sub.metadata as Props | undefined)?.supabase_user_id) ?? s((sub.metadata as Props | undefined)?.user_id) ?? null,
          vytvoreno: sub.created * 1000,
          zruseno: sub.canceled_at ? sub.canceled_at * 1000 : sub.ended_at ? sub.ended_at * 1000 : null,
          mesicneKc: Math.round(mesicne),
          aktivni: sub.status === "active" || sub.status === "trialing" || sub.status === "past_due",
        });
      }
      if (!r.has_more || r.data.length === 0) break;
      starting_after = r.data[r.data.length - 1].id;
    }
    return out;
  } catch (e) {
    console.error("[analytika] stripe", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function spocitejAnalytiku(f: FiltryAnalytiky) {
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const db = supabaseAdmin;
  const ted = Date.now();
  const dnes = pragueDateStr();
  // Období: „dnes“ = od pražské půlnoci, jinak posledních N dní (včetně dneška). Předchozí období stejně dlouhé.
  const curOd = f.dni === 1 ? pulnocPraha(dnes) : pulnocPraha(posunDen(dnes, -(f.dni - 1)));
  const delka = f.dni === 1 ? ted - curOd : f.dni * DEN;
  const prevOd = curOd - (f.dni === 1 ? DEN : delka), prevDo = f.dni === 1 ? ted - DEN : curOd;
  const vCur = (t: number) => t >= curOd && t <= ted;
  const vPrev = (t: number) => t >= prevOd && t < prevDo;
  // Data stačí za obě období a 6 týdnů kohort (+36 dní na Den 30)
  const nacistOd = Math.min(prevOd, ted - 80 * DEN);

  const [evRows, usersRes, sesRows, sbirkaRows, premRows, predplatne] = await Promise.all([
    nactiVse<Ev>((a, b) => db.from("analytics_events").select("event_name, created_at, user_id, properties").gte("created_at", new Date(nacistOd).toISOString()).order("created_at", { ascending: true }).range(a, b)),
    vsechnyUcty().then((users) => ({ data: { users } })),
    nactiVse<{ user_id: string; date: string; total: number; correct: number }>((a, b) => db.from("sessions").select("user_id, date, total, correct").gte("date", pragueDateStr(new Date(nacistOd))).order("date", { ascending: true }).range(a, b)),
    nactiVse<{ user_id: string; state: { otevreno?: number } | null }>((a, b) => db.from("user_sbirka").select("user_id, state").range(a, b)).catch(() => []),
    nactiVse<{ user_id: string; is_premium: boolean; stripe_subscription_id: string | null }>((a, b) => db.from("user_premium").select("user_id, is_premium, stripe_subscription_id").range(a, b)).catch(() => []),
    nactiPredplatne(),
  ]);

  // ── Účty (bez testovacích) ──
  const vsichni = usersRes.data?.users ?? [];
  const testovaci = vylouceneUcty(vsichni);
  // Denní otisk v → účet (signál „jsem tu“), otisky testovacích účtů pryč ze všeho
  const vUcet = new Map<string, string>();
  const zarizeniUctu = new Map<string, Zarizeni>();
  for (const e of evRows) if (e.event_name === "app_heartbeat" && e.user_id) {
    const v = s(e.properties?.v); if (v) vUcet.set(v, e.user_id);
    if (!zarizeniUctu.has(e.user_id)) { const z = s(e.properties?.zarizeni); if (z === "mobil" || z === "pocitac") zarizeniUctu.set(e.user_id, z); }
  }
  const testV = new Set([...vUcet].filter(([, u]) => testovaci.has(u)).map(([v]) => v));
  const ev = evRows.filter((e) => !(e.user_id && testovaci.has(e.user_id)) && !(s(e.properties?.v) && testV.has(s(e.properties?.v)!)));
  const cas = (e: Ev) => Date.parse(e.created_at);

  type Ucet = { id: string; vytvoreno: number; den: string; zdroj: string; trida: 5 | 9; zarizeni: Zarizeni | null; potvrzeno: number | null };
  const ucty: Ucet[] = vsichni.filter((u) => !testovaci.has(u.id)).map((u) => {
    const m = (u.user_metadata ?? {}) as Props;
    const potv = u.email_confirmed_at ? Date.parse(u.email_confirmed_at) : u.last_sign_in_at && (u.app_metadata as Props | undefined)?.provider !== "email" ? Date.parse(u.created_at) : null;
    return { id: u.id, vytvoreno: Date.parse(u.created_at), den: denPraha(u.created_at), zdroj: s(m.zdroj) || NEUVEDENO, trida: Number(m.trida) === 5 ? 5 : 9, zarizeni: zarizeniUctu.get(u.id) ?? null, potvrzeno: potv };
  });
  const uctyFiltr = ucty.filter((u) => (!f.trida || u.trida === f.trida) && (!f.zdroj || u.zdroj === f.zdroj) && (!f.zarizeni || u.zarizeni === f.zarizeni));
  const filtrIds = new Set(uctyFiltr.map((u) => u.id));
  const uctyById = new Map(ucty.map((u) => [u.id, u]));

  // ── Návštěvníci (denní otisk v) se zdrojem a zařízením ──
  const navstevy = ev.filter((e) => e.event_name === "page_viewed");
  const zdrojV = new Map<string, string>(), zarV = new Map<string, Zarizeni>();
  for (const e of navstevy) {
    const v = s(e.properties?.v); if (!v) continue;
    const z = zdrojUdalosti(e.properties);
    if (!zdrojV.has(v) || (zdrojV.get(v) === "přímo" && z !== "přímo")) zdrojV.set(v, z);
    const zr = s(e.properties?.zarizeni); if (!zarV.has(v) && (zr === "mobil" || zr === "pocitac")) zarV.set(v, zr);
  }
  const vProchazi = (v: string | undefined) => !!v && (!f.zdroj || zdrojV.get(v) === f.zdroj) && (!f.zarizeni || zarV.get(v) === f.zarizeni);
  const unikV = (arr: Ev[]) => new Set(arr.map((e) => s(e.properties?.v)).filter((v) => vProchazi(v))).size;

  // ── Aktivita po dnech: tréninky (sessions) a minuty v appce (zive) ──
  const aktivniDny = new Map<string, Set<string>>(); // účet → dny s tréninkem nebo v appce
  const treninkDny = new Map<string, Set<string>>();
  const pridej = (m: Map<string, Set<string>>, u: string, d: string) => { const x = m.get(u) ?? new Set<string>(); x.add(d); m.set(u, x); };
  const ses = sesRows.filter((r) => !testovaci.has(r.user_id));
  for (const r of ses) { pridej(aktivniDny, r.user_id, r.date); pridej(treninkDny, r.user_id, r.date); }
  for (const e of ev) if (e.event_name === "app_heartbeat" && e.user_id) pridej(aktivniDny, e.user_id, denPraha(e.created_at));
  const denVCur = (d: string) => vCur(pulnocPraha(d) + 12 * 3600_000) || d === dnes;
  const denVPrev = (d: string) => { const t = pulnocPraha(d) + 12 * 3600_000; return f.dni === 1 ? d === posunDen(dnes, -1) : vPrev(t); };

  // ── Předplatné (účet z metadat předplatného, jinak přes user_premium.stripe_subscription_id) ──
  const uctPodleSub = new Map((premRows as { user_id: string; stripe_subscription_id: string | null }[]).filter((r) => r.stripe_subscription_id).map((r) => [r.stripe_subscription_id!, r.user_id]));
  const subs = (predplatne ?? []).map((p) => ({ ...p, userId: p.userId ?? uctPodleSub.get(p.id) ?? null })).filter((p) => !(p.userId && testovaci.has(p.userId)));
  const aktivniK = (t: number) => subs.filter((p) => p.vytvoreno <= t && (p.zruseno === null || p.zruseno > t) && (p.aktivni || p.zruseno !== null));
  const platiciUcty = new Set((premRows as { user_id: string; is_premium: boolean; stripe_subscription_id: string | null }[]).filter((r) => r.is_premium && r.stripe_subscription_id && !testovaci.has(r.user_id)).map((r) => r.user_id));
  const mesicneUctu = new Map<string, number>();
  for (const p of subs) if (p.userId && p.aktivni) mesicneUctu.set(p.userId, (mesicneUctu.get(p.userId) ?? 0) + p.mesicneKc);
  const prijemUctu = (id: string) => mesicneUctu.get(id) ?? (platiciUcty.has(id) ? 99 : 0);

  // ── Útrata za reklamu a poznámky (zadává admin) ──
  type Utrata = { den: string; zdroj: string; castka: number; kliky: number };
  const utrataMap = new Map<string, Utrata>(); // poslední zápis pro den+zdroj vyhrává
  const poznamky: { den: string; text: string }[] = [];
  for (const e of evRows) {
    if (e.event_name === "ad_spend_saved") {
      const den = s(e.properties?.den), zdroj = s(e.properties?.zdroj);
      if (den && zdroj) utrataMap.set(`${den}|${zdroj}`, { den, zdroj, castka: n(e.properties?.castka), kliky: n(e.properties?.kliky) });
    } else if (e.event_name === "chart_note_added") {
      const den = s(e.properties?.den), text = s(e.properties?.text);
      if (den && text) poznamky.push({ den, text });
    }
  }
  const utraty = [...utrataMap.values()].filter((u) => u.castka > 0 || u.kliky > 0);
  const kampaneSUtratou = new Set(utraty.map((u) => u.zdroj));
  const utrataV = (pred: (d: string) => boolean, zdroj?: string) => utraty.filter((u) => pred(u.den) && (!zdroj || u.zdroj === zdroj)).reduce((a, u) => a + u.castka, 0);

  // ═════════ 1. PŘEHLED ═════════
  const uctyCur = uctyFiltr.filter((u) => vCur(u.vytvoreno)), uctyPrev = uctyFiltr.filter((u) => vPrev(u.vytvoreno));
  const navCur = unikV(navstevy.filter((e) => vCur(cas(e)))), navPrev = unikV(navstevy.filter((e) => vPrev(cas(e))));
  const trenovaliV = (pred: (d: string) => boolean) => new Set(ses.filter((r) => filtrIds.has(r.user_id) && pred(r.date)).map((r) => r.user_id));
  const jadroK = (konec: string) => {
    const od = posunDen(konec, -6);
    return [...treninkDny].filter(([u, d]) => filtrIds.has(u) && [...d].filter((x) => x >= od && x <= konec).length >= 3).length;
  };
  const prevKonec = f.dni === 1 ? posunDen(dnes, -1) : posunDen(dnes, -f.dni);
  const platCur = aktivniK(ted), platPrev = aktivniK(prevDo);
  const uctyReklamy = (arr: Ucet[]) => arr.filter((u) => kampaneSUtratou.has(u.zdroj)).length;
  const utrCur = utrataV(denVCur), utrPrev = utrataV(denVPrev);
  const prehled = {
    navstevnici: { ted: navCur, pred: navPrev },
    noveUcty: { ted: uctyCur.length, pred: uctyPrev.length },
    konverze: { ted: navCur ? uctyCur.length / navCur : null, pred: navPrev ? uctyPrev.length / navPrev : null },
    trenovali: { ted: trenovaliV(denVCur).size, pred: trenovaliV(denVPrev).size },
    jadro: { ted: jadroK(dnes), pred: jadroK(prevKonec) },
    platici: { ted: predplatne ? platCur.length : platiciUcty.size, pred: predplatne ? platPrev.length : null },
    prijemMesicne: { ted: predplatne ? platCur.reduce((a, p) => a + p.mesicneKc, 0) : null, pred: predplatne ? platPrev.reduce((a, p) => a + p.mesicneKc, 0) : null },
    cenaZaUcet: { ted: utrCur && uctyReklamy(uctyCur) ? Math.round(utrCur / uctyReklamy(uctyCur)) : null, pred: utrPrev && uctyReklamy(uctyPrev) ? Math.round(utrPrev / uctyReklamy(uctyPrev)) : null, utrata: utrCur, uctu: uctyReklamy(uctyCur) },
    stripe: !!predplatne,
  };

  // Grafy po dnech (aspoň 7 dní) + předchozí období zarovnané podle pořadí dne
  const dniGrafu = Math.max(7, f.dni);
  const dnyGrafu = Array.from({ length: dniGrafu }, (_, i) => posunDen(dnes, -(dniGrafu - 1 - i)));
  const navPoDnech = new Map<string, Set<string>>();
  for (const e of navstevy) { const v = s(e.properties?.v); if (vProchazi(v)) pridej(navPoDnech, denPraha(e.created_at), v!); }
  const uctyPoDnech = new Map<string, number>();
  for (const u of uctyFiltr) uctyPoDnech.set(u.den, (uctyPoDnech.get(u.den) ?? 0) + 1);
  const graf = dnyGrafu.map((d) => {
    const p = posunDen(d, -dniGrafu);
    return { den: d, navstevnici: navPoDnech.get(d)?.size ?? 0, navstevniciPred: navPoDnech.get(p)?.size ?? 0, ucty: uctyPoDnech.get(d) ?? 0 };
  });
  const prvniUtrata = new Map<string, string>();
  for (const u of utraty) if (u.castka > 0 && (!prvniUtrata.has(u.zdroj) || u.den < prvniUtrata.get(u.zdroj)!)) prvniUtrata.set(u.zdroj, u.den);
  const udalosti = [
    ...[...prvniUtrata].map(([zdroj, den]) => ({ den, text: `📣 Reklama: ${zdroj}` })),
    ...poznamky,
  ].filter((x) => dnyGrafu.includes(x.den));

  // ═════════ 2. REKLAMA A ZDROJE ═════════
  const navCurEv = navstevy.filter((e) => vCur(cas(e)));
  const kampMap = new Map<string, { zdroj: string; utrata: number; kliky: number; navstevnici: number; odeslali: number; ucty: number; potvrdili: number; trenovali: number; jadro: number; platici: number; prijem: number; klikRegistrace: number }>();
  const kamp = (z: string) => kampMap.get(z) ?? kampMap.set(z, { zdroj: z, utrata: 0, kliky: 0, navstevnici: 0, odeslali: 0, ucty: 0, potvrdili: 0, trenovali: 0, jadro: 0, platici: 0, prijem: 0, klikRegistrace: 0 }).get(z)!;
  const vCurSet = new Set(navCurEv.map((e) => s(e.properties?.v)).filter(Boolean) as string[]);
  for (const v of vCurSet) if (!f.zarizeni || zarV.get(v) === f.zarizeni) kamp(zdrojV.get(v) ?? "přímo").navstevnici++;
  const klikRegV = new Set(ev.filter((e) => vCur(cas(e)) && e.event_name === "element_clicked" && /^\/(registrace|vitej)/.test(s(e.properties?.cil) ?? "")).map((e) => s(e.properties?.v)).filter(Boolean) as string[]);
  for (const v of klikRegV) if (!f.zarizeni || zarV.get(v) === f.zarizeni) kamp(zdrojV.get(v) ?? "přímo").klikRegistrace++;
  for (const e of ev) if (vCur(cas(e)) && (e.event_name === "signup_submitted" || e.event_name === "signup_google_started")) {
    const v = s(e.properties?.v); if (f.zarizeni && v && zarV.get(v) !== f.zarizeni) continue;
    kamp(v ? zdrojV.get(v) ?? zdrojUdalosti(e.properties) : zdrojUdalosti(e.properties)).odeslali++;
  }
  for (const u of uctyCur.filter((x) => !f.zdroj || x.zdroj === f.zdroj)) {
    const k = kamp(u.zdroj);
    k.ucty++;
    if (u.potvrzeno) k.potvrdili++;
    const td = treninkDny.get(u.id);
    if (td?.size) k.trenovali++;
    if (td && [...td].filter((d) => dnyMezi(u.den, d) >= 0 && dnyMezi(u.den, d) < 14).length >= 3) k.jadro++;
    if (platiciUcty.has(u.id)) { k.platici++; k.prijem += prijemUctu(u.id); }
  }
  for (const u of utraty) if (denVCur(u.den) && (!f.zdroj || u.zdroj === f.zdroj)) { const k = kamp(u.zdroj); k.utrata += u.castka; k.kliky += u.kliky; }
  const kampane = [...kampMap.values()]
    .map((k) => ({ ...k, cenaZaUcet: k.utrata && k.ucty ? Math.round(k.utrata / k.ucty) : null, navratnost: k.utrata ? k.prijem / k.utrata : null, reklama: kampaneSUtratou.has(k.zdroj) }))
    .sort((a, b) => Number(b.reklama) - Number(a.reklama) || b.ucty - a.ucty || b.navstevnici - a.navstevnici).slice(0, 25);

  // Trychtýř podle zdroje (3 největší zdroje): podíl z návštěvníků
  const top3 = kampane.filter((k) => k.navstevnici > 0 && k.zdroj !== NEUVEDENO).sort((a, b) => b.navstevnici - a.navstevnici).slice(0, 3);
  const trychtyrZdroju = top3.map((k) => ({
    zdroj: k.zdroj,
    kroky: [100, k.klikRegistrace / k.navstevnici * 100, k.ucty / k.navstevnici * 100, k.trenovali / k.navstevnici * 100, k.platici / k.navstevnici * 100].map((x) => Math.round(x * 10) / 10),
  }));

  // Reklama po dnech (jen zdroje s útratou)
  const reklamaPoDnech = dnyGrafu.filter((d) => denVCur(d) || f.dni < 7).map((d) => {
    const utr = utraty.filter((u) => u.den === d && (!f.zdroj || u.zdroj === f.zdroj));
    const zdroje = new Set(utr.map((u) => u.zdroj));
    const castka = utr.reduce((a, u) => a + u.castka, 0), kliky = utr.reduce((a, u) => a + u.kliky, 0);
    const nav = [...(navPoDnech.get(d) ?? [])].filter((v) => zdroje.has(zdrojV.get(v) ?? "")).length;
    const uc = uctyFiltr.filter((u) => u.den === d && zdroje.has(u.zdroj)).length;
    return { den: d, utrata: castka, kliky, navstevnici: nav, ucty: uc, cenaZaUcet: castka && uc ? Math.round(castka / uc) : null };
  }).filter((r) => r.utrata > 0 || r.kliky > 0);

  // ═════════ 3. TRYCHTÝŘ (mobil / počítač) ═════════
  type Seg = { mobil: number; pocitac: number; nezname: number };
  const segV = (pred: (e: Ev) => boolean): Seg => {
    const m = new Map<string, Zarizeni | null>();
    for (const e of ev) if (vCur(cas(e)) && pred(e)) { const v = s(e.properties?.v); if (vProchazi(v)) m.set(v!, zarV.get(v!) ?? (s(e.properties?.zarizeni) as Zarizeni | undefined) ?? null); }
    const out: Seg = { mobil: 0, pocitac: 0, nezname: 0 };
    for (const z of m.values()) out[z ?? "nezname"]++;
    return out;
  };
  const segE = (pred: (e: Ev) => boolean): Seg => {
    const out: Seg = { mobil: 0, pocitac: 0, nezname: 0 };
    for (const e of ev) if (vCur(cas(e)) && pred(e)) { const v = s(e.properties?.v); if (v && !vProchazi(v) && (f.zdroj || f.zarizeni)) continue; const z = (v && zarV.get(v)) || (s(e.properties?.zarizeni) as Zarizeni | undefined); out[z ?? "nezname"]++; }
    return out;
  };
  const segU = (arr: Ucet[]): Seg => { const out: Seg = { mobil: 0, pocitac: 0, nezname: 0 }; for (const u of arr) out[u.zarizeni ?? "nezname"]++; return out; };
  const diagUcty = new Set(ev.filter((e) => e.event_name === "diagnostic_completed" && e.user_id).map((e) => e.user_id!));
  const zaplatiliCur = subs.filter((p) => vCur(p.vytvoreno));
  const segZapl: Seg = { mobil: 0, pocitac: 0, nezname: 0 };
  for (const p of zaplatiliCur) { const u = p.userId ? uctyById.get(p.userId) : undefined; if (u && !filtrIds.has(u.id)) continue; segZapl[u?.zarizeni ?? "nezname"]++; }
  const trychtyr = [
    { krok: "Návštěvníci", ...segV((e) => e.event_name === "page_viewed") },
    { krok: "Otevřeli úvodní stránku", ...segV((e) => e.event_name === "page_viewed" && (s(e.properties?.cesta) === "/" || s(e.properties?.cesta) === "/matemax")) },
    { krok: "Klikli na Začít / registraci", ...segV((e) => e.event_name === "element_clicked" && /^\/(registrace|vitej)/.test(s(e.properties?.cil) ?? "")) },
    { krok: "Otevřeli registraci", ...segV((e) => e.event_name === "page_viewed" && (s(e.properties?.cesta) ?? "").startsWith("/registrace")) },
    { krok: "Odeslali registraci", ...segE((e) => e.event_name === "signup_submitted" || e.event_name === "signup_google_started") },
    { krok: "Nové účty", ...segU(uctyCur) },
    { krok: "Potvrdili e-mail", ...segU(uctyCur.filter((u) => u.potvrzeno)) },
    { krok: "Dokončili diagnostiku", ...segU(uctyCur.filter((u) => diagUcty.has(u.id))) },
    { krok: "Dokončili trénink", ...segU(uctyCur.filter((u) => treninkDny.get(u.id)?.size)) },
    { krok: "Otevřeli Premium", ...segV((e) => e.event_name === "premium_viewed") },
    { krok: "Zaplatili", ...segZapl },
  ];

  // ═════════ 4. AKTIVACE (účty z období, prvních 24 h) ═════════
  const prvniTrenink = new Map<string, number>();
  for (const e of ev) if (e.event_name === "training_completed" && e.user_id && !prvniTrenink.has(e.user_id)) prvniTrenink.set(e.user_id, cas(e));
  const prvniDiag = new Map<string, number>();
  for (const e of ev) if (e.event_name === "diagnostic_completed" && e.user_id && !prvniDiag.has(e.user_id)) prvniDiag.set(e.user_id, cas(e));
  const truhla = new Set((sbirkaRows as { user_id: string; state: { otevreno?: number } | null }[]).filter((r) => (r.state?.otevreno ?? 0) > 0).map((r) => r.user_id));
  const do24 = (u: Ucet, t: number | undefined | null) => t != null && t - u.vytvoreno <= DEN && t >= u.vytvoreno - 60_000;
  const trenoval24 = (u: Ucet) => do24(u, prvniTrenink.get(u.id)) || (!prvniTrenink.has(u.id) && [...(treninkDny.get(u.id) ?? [])].some((d) => dnyMezi(u.den, d) <= 1 && dnyMezi(u.den, d) >= 0));
  const akt = uctyCur;
  const podil = (k: number) => (akt.length ? Math.round((k / akt.length) * 100) : null);
  const minuty = akt.filter((u) => prvniTrenink.has(u.id)).map((u) => (prvniTrenink.get(u.id)! - u.vytvoreno) / 60_000).filter((m) => m >= 0).sort((a, b) => a - b);
  const vratilSe = (u: Ucet) => aktivniDny.get(u.id)?.has(posunDen(u.den, 1)) ?? false;
  const aktivace = {
    uctu: akt.length,
    kroky: [
      { krok: "Potvrdil e-mail do 24 h", podil: podil(akt.filter((u) => do24(u, u.potvrzeno)).length) },
      { krok: "Udělal diagnostiku do 24 h", podil: podil(akt.filter((u) => do24(u, prvniDiag.get(u.id))).length) },
      { krok: "Dokončil první trénink do 24 h", podil: podil(akt.filter(trenoval24).length) },
      { krok: "Otevřel truhlu (kdykoli)", podil: podil(akt.filter((u) => truhla.has(u.id)).length) },
      { krok: "Vrátil se druhý den", podil: podil(akt.filter(vratilSe).length) },
    ],
    medianMinutDoTreninku: minuty.length ? Math.round(minuty[Math.floor(minuty.length / 2)]) : null,
  };

  // ═════════ 5. RETENCE (kohorty po týdnech registrace) ═════════
  const pondeliOd = (den: string) => { const d = new Date(pulnocPraha(den) + 12 * 3600_000); const dow = (d.getUTCDay() + 6) % 7; return posunDen(den, -dow); };
  const tydny = Array.from({ length: 6 }, (_, i) => posunDen(pondeliOd(dnes), -7 * (5 - i)));
  const okna: [string, number, number][] = [["Den 1", 1, 1], ["Den 7", 7, 13], ["Den 14", 14, 20], ["Den 30", 30, 36]];
  const retence = tydny.map((t) => {
    const clenove = uctyFiltr.filter((u) => u.den >= t && u.den <= posunDen(t, 6));
    return {
      tyden: t, zaku: clenove.length,
      hodnoty: okna.map(([, od, do_]) => {
        const dostupni = clenove.filter((u) => dnyMezi(u.den, dnes) >= do_);
        if (!clenove.length || dostupni.length < clenove.length) return null;
        const vratili = clenove.filter((u) => { const a = aktivniDny.get(u.id); if (!a) return false; for (let o = od; o <= do_; o++) if (a.has(posunDen(u.den, o))) return true; return false; }).length;
        return Math.round((vratili / clenove.length) * 100);
      }),
    };
  });

  // ═════════ 6. ZAPOJENÍ A HERNÍ SYSTÉM ═════════
  const tydnu = Math.max(1, (f.dni === 1 ? 1 : f.dni) / 7);
  const zapoj = (pred: (d: string) => boolean, vObd: (t: number) => boolean) => {
    const akt2 = trenovaliV(pred);
    const r = ses.filter((x) => akt2.has(x.user_id) && pred(x.date));
    const prikladu = r.reduce((a, x) => a + (x.total ?? 0), 0), spravne = r.reduce((a, x) => a + (x.correct ?? 0), 0);
    const min = ev.filter((e) => e.event_name === "app_heartbeat" && e.user_id && akt2.has(e.user_id) && vObd(cas(e))).length;
    return { aktivnich: akt2.size, minutNaZaka: akt2.size ? Math.round(min / akt2.size / tydnu) : null, prikladuNaZaka: akt2.size ? Math.round(prikladu / akt2.size / tydnu) : null, uspesnost: prikladu ? Math.round((spravne / prikladu) * 100) : null };
  };
  const zapCur = zapoj(denVCur, vCur), zapPrev = zapoj(denVPrev, vPrev);
  const aktCurSet = trenovaliV(denVCur);
  const FUNKCE: [string, string][] = [["mise", "Denní mise"], ["truhla", "Truhly"], ["satnik", "Šatník Hexíka"], ["obchudek", "Obchůdek"], ["boss", "Boss týdne"], ["pokojicek", "Pokojíček"], ["sady", "Sady"], ["kalendar", "Adventní kalendář"]];
  const funkceUziti = FUNKCE.map(([k, nazev]) => {
    const uz = new Set(ev.filter((e) => e.event_name === "feature_used" && s(e.properties?.f) === k && e.user_id && aktCurSet.has(e.user_id) && vCur(cas(e))).map((e) => e.user_id!));
    return { k, nazev, zaku: uz.size, podil: aktCurSet.size ? Math.round((uz.size / aktCurSet.size) * 100) : 0 };
  });
  const funkceMeriOd = ev.find((e) => e.event_name === "feature_used")?.created_at ?? null;

  // ═════════ 7. PENÍZE ═════════
  const penize = {
    otevreliPremium: unikV(ev.filter((e) => vCur(cas(e)) && e.event_name === "premium_viewed")),
    zacaliPlatit: unikV(ev.filter((e) => vCur(cas(e)) && e.event_name === "checkout_started")),
    zavreliPlatbu: unikV(ev.filter((e) => vCur(cas(e)) && e.event_name === "checkout_canceled")),
    zaplatili: predplatne ? zaplatiliCur.length : null,
    zrusili: predplatne ? subs.filter((p) => p.zruseno !== null && vCur(p.zruseno)).length : null,
    platici: prehled.platici.ted, prijemMesicne: prehled.prijemMesicne.ted,
  };

  // ═════════ 8. OBSAH (výsledky úloh ze session_completed.u, aspoň za 30 dní) ═════════
  const obsahOd = Math.min(curOd, ted - 30 * DEN);
  const ulohy = new Map<string, { ok: number; spatne: number; preskok: number }>();
  for (const e of ev) {
    if (e.event_name !== "training_completed" || cas(e) < obsahOd || (e.user_id && !filtrIds.has(e.user_id) && uctyById.has(e.user_id))) continue;
    const u = e.properties?.u;
    if (!Array.isArray(u)) continue;
    for (const x of u) {
      if (!Array.isArray(x) || typeof x[0] !== "string") continue;
      const z = ulohy.get(x[0]) ?? { ok: 0, spatne: 0, preskok: 0 };
      if (x[1] === 1) z.ok++; else if (x[1] === 0) z.spatne++; else z.preskok++;
      ulohy.set(x[0], z);
    }
  }
  const popisUlohy = new Map(allExamples.map((x) => [x.id, x]));
  const radek = ([id, z]: [string, { ok: number; spatne: number; preskok: number }]) => {
    const p = popisUlohy.get(id) as { tema?: string; obtiznost?: number; zadani?: string } | undefined;
    const odp = z.ok + z.spatne;
    return { id, tema: p?.tema ?? "?", obtiznost: p?.obtiznost ?? null, zadani: (p?.zadani ?? "").replace(/\$|\\[a-z]+\{?|[{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, 90), pokusu: odp + z.preskok, chybovost: odp ? Math.round((z.spatne / odp) * 100) : null, preskoceno: z.preskok };
  };
  const vsechnyUlohy = [...ulohy].map(radek);
  const obsah = {
    meriOd: ev.find((e) => e.event_name === "training_completed" && Array.isArray(e.properties?.u))?.created_at ?? null,
    odpovedi: vsechnyUlohy.reduce((a, x) => a + x.pokusu, 0),
    tezke: vsechnyUlohy.filter((x) => x.pokusu >= 5 && (x.chybovost ?? 0) >= 60).sort((a, b) => (b.chybovost ?? 0) - (a.chybovost ?? 0)).slice(0, 12),
    preskakovane: vsechnyUlohy.filter((x) => x.preskoceno >= 3).sort((a, b) => b.preskoceno - a.preskoceno).slice(0, 8),
    lehke: vsechnyUlohy.filter((x) => x.pokusu >= 10 && (x.chybovost ?? 100) <= 5).sort((a, b) => b.pokusu - a.pokusu).slice(0, 8),
  };

  // ═════════ UPOZORNĚNÍ ═════════
  const upozorneni: { uroven: "spatne" | "pozor" | "ok"; nadpis: string; text: string }[] = [];
  const starsi24 = uctyCur.filter((u) => ted - u.vytvoreno > DEN);
  const nepotvrdili = starsi24.filter((u) => !u.potvrzeno);
  if (nepotvrdili.length >= 2 && nepotvrdili.length / starsi24.length >= 0.25) upozorneni.push({ uroven: "spatne", nadpis: `Potvrzení e-mailu: ${nepotvrdili.length} z ${starsi24.length} účtů ho do 24 h nepotvrdilo`, text: "Bez potvrzení se žák nepřihlásí a nezačne trénovat. E-mail často padá do Promo / Hromadné." });
  const chybyForm = new Map<string, number>();
  for (const e of ev) if (vCur(cas(e)) && e.event_name === "form_error_shown") { const k = s(e.properties?.cil) ?? "?"; chybyForm.set(k, (chybyForm.get(k) ?? 0) + 1); }
  const nejChyba = [...chybyForm].sort((a, b) => b[1] - a[1])[0];
  if (nejChyba && nejChyba[1] >= 3) upozorneni.push({ uroven: "pozor", nadpis: `Formuláře: ${nejChyba[1]}× chyba „${nejChyba[0]}“`, text: "Lidé narážejí na stejnou chybu. Projít text chyby a kdy se ukazuje." });
  for (const x of obsah.tezke.filter((x) => (x.chybovost ?? 0) >= 70).slice(0, 2)) upozorneni.push({ uroven: "pozor", nadpis: `Úloha ${x.id}: ${x.chybovost} % chyb (${x.pokusu} pokusů)`, text: "Podezřele těžká, nebo špatný klíč. Projít zadání a odpověď." });
  if (penize.zavreliPlatbu >= 2) upozorneni.push({ uroven: "pozor", nadpis: `Platba: ${penize.zavreliPlatbu}× návrat ze Stripe bez zaplacení`, text: "Lidé se dostali až k platbě a odešli. Projít stránku platby a cenu." });
  if (predplatne && platCur.length !== platiciUcty.size) upozorneni.push({ uroven: "pozor", nadpis: `Stripe a databáze nesedí: ${platCur.length} aktivních předplatných ve Stripe, ${platiciUcty.size} placených Premium v appce`, text: "Buď appka běží s testovacím klíčem Stripe, nebo se nějaká platba nespárovala s účtem. Projít ve Stripe." });
  if (navPrev >= 20 && navCur < navPrev * 0.6) upozorneni.push({ uroven: "pozor", nadpis: `Návštěvnost klesla o ${Math.round((1 - navCur / navPrev) * 100)} %`, text: `${navCur} návštěvníků proti ${navPrev} v předchozím období.` });
  for (const k of kampane.filter((x) => x.reklama && x.utrata > 0)) upozorneni.push({ uroven: k.cenaZaUcet !== null ? "ok" : "pozor", nadpis: `Reklama ${k.zdroj}: ${k.utrata.toLocaleString("cs-CZ")} Kč → ${k.ucty} ${k.ucty === 1 ? "účet" : k.ucty >= 2 && k.ucty <= 4 ? "účty" : "účtů"}`, text: k.cenaZaUcet !== null ? `Cena za nový účet ${k.cenaZaUcet} Kč, trénovalo ${k.trenovali}, platí ${k.platici}.` : "Zatím žádný účet z reklamy. Zkontroluj parametry odkazu (utm) a stránku, kam reklama vede." });

  return {
    filtry: f, obdobi: { od: new Date(curOd).toISOString(), do: new Date(ted).toISOString(), predOd: new Date(prevOd).toISOString(), predDo: new Date(prevDo).toISOString() },
    prehled, graf, udalosti, upozorneni,
    kampane, trychtyrZdroju, reklamaPoDnech, zdrojeProFiltr: [...new Set([...zdrojV.values(), ...ucty.map((u) => u.zdroj), ...kampaneSUtratou])].filter((z) => z !== NEUVEDENO).sort(),
    trychtyr, aktivace, retence,
    zapojeni: { ted: zapCur, pred: zapPrev, funkce: funkceUziti, funkceMeriOd },
    penize, obsah,
    utraty: utraty.filter((u) => pulnocPraha(u.den) >= ted - 60 * DEN).sort((a, b) => (a.den < b.den ? 1 : -1)),
    kvalita: { testovacichUctu: testovaci.size, udalosti: evRows.length, mereniOd: evRows[0]?.created_at ?? null },
  };
}

export type Analytika = Awaited<ReturnType<typeof spocitejAnalytiku>>;

/** Krátké shrnutí týdne do kokpitu / e-mailu (posledních 7 dní proti předchozím 7). */
export function shrnutiTydne(a: Analytika): string {
  const p = a.prehled;
  // Při malém základu (pod 10) procenta klamou (1 → 61 = +6 000 %), ukáže se předchozí číslo
  const zmena = (t: number, pr: number | null) => (pr === null ? "" : pr < 10 ? ` (předtím ${pr})` : ` (${t >= pr ? "▲" : "▼"} ${Math.abs(Math.round(((t - pr) / pr) * 100))} %)`);
  const radky = [
    `Návštěvníci: ${p.navstevnici.ted}${zmena(p.navstevnici.ted, p.navstevnici.pred)}, nové účty: ${p.noveUcty.ted} (předtím ${p.noveUcty.pred}).`,
    `Trénovalo ${p.trenovali.ted} žáků, 3+ dny v týdnu ${p.jadro.ted}. Platících ${p.platici.ted}${p.prijemMesicne.ted !== null ? `, měsíčně ${p.prijemMesicne.ted} Kč` : ""}.`,
  ];
  for (const k of a.kampane.filter((x) => x.reklama && x.utrata > 0)) radky.push(`Reklama ${k.zdroj}: ${k.utrata} Kč → ${k.ucty} účtů${k.cenaZaUcet !== null ? ` po ${k.cenaZaUcet} Kč` : ""}, trénovalo ${k.trenovali}, platí ${k.platici}.`);
  const nejvetsi = a.trychtyr.slice(1).map((k, i) => { const pred = a.trychtyr[i]; const c = (x: typeof k) => x.mobil + x.pocitac + x.nezname; return { krok: k.krok, ztrata: c(pred) ? 1 - c(k) / c(pred) : 0, n: c(pred) }; }).filter((x) => x.n >= 5).sort((x, y) => y.ztrata - x.ztrata)[0];
  if (nejvetsi) radky.push(`Největší ztráta v trychtýři: „${nejvetsi.krok}“ (−${Math.round(nejvetsi.ztrata * 100)} %).`);
  for (const u of a.upozorneni.filter((x) => x.uroven !== "ok").slice(0, 3)) radky.push(`⚠ ${u.nadpis}`);
  return radky.join("\n");
}
