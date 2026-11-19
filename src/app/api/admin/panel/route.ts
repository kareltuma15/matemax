import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { KRONIKA, dnyMezi } from "@/lib/obsah-kronika";

/**
 * Řídicí panel adminu (Karel 19. 11. 2026): co dnes potřebuje pozornost, byznys a učení jedním pohledem.
 * Testovací účty (app_metadata.testovaci) se nikde nepočítají. Jen pro admina.
 */
export interface PolozkaPozornosti {
  druh: "premium" | "odpada" | "diagnostika" | "zpetna" | "propojeni" | "chyby" | "novinky";
  titulek: string;
  popis: string;
  /** Účty, kterých se to týká (klepnutí otevře detail žáka). */
  ucty: { id: string; jmeno: string }[];
}

export interface Panel {
  dnes: { noveUcty: number; noveTyden: number; noveMinulyTyden: number; trenovalo: number; zaku: number; online: string[]; premium: { plati: number; rucne: number; zkousi: number }; zpetnaVazba: number };
  pozornost: PolozkaPozornosti[];
  byznys: { plati: number; rucne: number; zkousi: number; konciDo7: number; premiumZobrazeno: number; platbaStart: number; podilPremium: number };
  uceni: { odhad9: number | null; odhad5: number | null; prikladuTyden: number; temata: { k: string; ok: number; n: number }[] };
}

const DEN = 86400000;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  const ted = Date.now();
  const dnes = pragueDateStr();

  const [{ data: authData }, { data: premRows }, { data: diagRows }, { data: procRows }, { data: ziveRows }, { data: fbRows }, { data: propRows }, { data: evRows }, sbirkaRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from("user_premium").select("user_id, is_premium, trial_expires_at, stripe_subscription_id, trial_granted_by"),
    supabaseAdmin.from("diagnostic_results").select("user_id"),
    supabaseAdmin.from("procvicovani").select("user_id, datum, temata").gte("datum", pragueDateStr(new Date(ted - 30 * DEN))).limit(50000),
    supabaseAdmin.from("analytics_events").select("user_id, created_at").eq("event_name", "zive").gte("created_at", new Date(ted - 21 * DEN).toISOString()).not("user_id", "is", null).limit(50000),
    supabaseAdmin.from("user_feedback").select("user_id, rating, liked, suggestion, created_at").gte("created_at", new Date(ted - 7 * DEN).toISOString()).order("created_at", { ascending: false }),
    supabaseAdmin.from("vysledky_propojeni").select("user_id, vytvoreno_at").is("zruseno_at", null).gte("vytvoreno_at", new Date(ted - 7 * DEN).toISOString()),
    supabaseAdmin.from("analytics_events").select("event_name, created_at, properties").in("event_name", ["formular_chyba", "premium_zobrazeno", "platba_start"]).gte("created_at", new Date(ted - 30 * DEN).toISOString()).limit(20000),
    supabaseAdmin.from("user_sbirka").select("user_id, state").limit(5000),
  ]);

  const vsichni = authData?.users ?? [];
  const testovaci = new Set(vsichni.filter((u) => (u.app_metadata as Record<string, unknown> | undefined)?.testovaci).map((u) => u.id));
  const users = vsichni.filter((u) => !testovaci.has(u.id));
  const ids = new Set(users.map((u) => u.id));
  const jmeno = (id: string) => {
    const u = users.find((x) => x.id === id); if (!u) return "?";
    const m = (u.user_metadata ?? {}) as Record<string, unknown>;
    return (typeof m.first_name === "string" && m.first_name) || (typeof m.full_name === "string" && m.full_name) || (u.email ?? "").split("@")[0];
  };
  const ucet = (id: string) => ({ id, jmeno: jmeno(id) });

  // ── Premium ──
  let plati = 0, rucne = 0, zkousi = 0;
  const konci: string[] = [];
  for (const r of premRows ?? []) {
    const id = r.user_id as string; if (!ids.has(id) || !r.is_premium) continue;
    const doKdy = r.trial_expires_at ? Date.parse(r.trial_expires_at as string) : null;
    if (doKdy !== null && doKdy < ted) continue;
    if (r.stripe_subscription_id) plati++;
    else if (((r.trial_granted_by as string | null) ?? "").startsWith("admin")) rucne++;
    else zkousi++;
    if (doKdy !== null && doKdy - ted <= 7 * DEN) konci.push(id);
  }

  // ── Aktivita po dnech (tréninky + signál „jsem tu“) ──
  const dnyAktivity = new Map<string, Set<string>>();
  const pridej = (id: string, d: string) => { if (!ids.has(id)) return; const s = dnyAktivity.get(id) ?? new Set<string>(); s.add(d); dnyAktivity.set(id, s); };
  for (const r of procRows ?? []) pridej(r.user_id as string, r.datum as string);
  for (const r of ziveRows ?? []) pridej(r.user_id as string, pragueDateStr(new Date(r.created_at as string)));
  const trenovalo = new Set((procRows ?? []).filter((r) => r.datum === dnes && ids.has(r.user_id as string)).map((r) => r.user_id as string)).size;
  const online = [...new Set((ziveRows ?? []).filter((r) => ted - Date.parse(r.created_at as string) <= 120_000 && ids.has(r.user_id as string)).map((r) => r.user_id as string))].map(jmeno);
  // Odpadá: aspoň 3 dny aktivity mezi 6. a 20. dnem zpátky, posledních 5 dní nic
  const odpada = [...dnyAktivity].filter(([, s]) => {
    const dny = [...s].map((d) => dnyMezi(d, dnes));
    return dny.filter((x) => x >= 6 && x <= 20).length >= 3 && !dny.some((x) => x <= 5);
  }).map(([id]) => id);

  // ── Registrace a diagnostika ──
  const den = (iso: string) => pragueDateStr(new Date(iso));
  const noveUcty = users.filter((u) => den(u.created_at) === dnes).length;
  const noveTyden = users.filter((u) => ted - Date.parse(u.created_at) <= 7 * DEN).length;
  const noveMinulyTyden = users.filter((u) => { const t = ted - Date.parse(u.created_at); return t > 7 * DEN && t <= 14 * DEN; }).length;
  const diag = new Set((diagRows ?? []).map((r) => r.user_id as string));
  const bezDiag = users.filter((u) => !diag.has(u.id) && ted - Date.parse(u.created_at) > 2 * DEN && ted - Date.parse(u.created_at) < 60 * DEN).map((u) => u.id);

  // ── Události ──
  const ev = evRows ?? [];
  const chyby24 = ev.filter((e) => e.event_name === "formular_chyba" && ted - Date.parse(e.created_at as string) <= DEN);
  const chybyPodle = [...chyby24.reduce((m, e) => { const k = ((e.properties as Record<string, string> | null)?.cil) ?? "?"; return m.set(k, (m.get(k) ?? 0) + 1); }, new Map<string, number>())];
  const unikV = (n: string) => new Set(ev.filter((e) => e.event_name === n).map((e) => (e.properties as Record<string, string> | null)?.v)).size;

  // ── Zpětná vazba a propojení ──
  const fb = (fbRows ?? []).filter((r) => !r.user_id || ids.has(r.user_id as string));
  const prop = (propRows ?? []).filter((r) => ids.has(r.user_id as string));

  // ── Novinky ──
  const posledniNovinka = (KRONIKA.zapisy as { datum: string | null; novinka?: unknown }[]).filter((z) => z.novinka && z.datum).map((z) => z.datum!).sort().pop() ?? null;
  const dniBezNovinky = posledniNovinka ? dnyMezi(posledniNovinka, dnes) : null;

  // ── Seznam „Potřebuje pozornost“ ──
  const pozornost: PolozkaPozornosti[] = [];
  if (konci.length) pozornost.push({ druh: "premium", titulek: `Premium končí do 7 dní (${konci.length})`, popis: "Prodluž v detailu žáka, nebo nech vypršet.", ucty: konci.map(ucet) });
  if (odpada.length) pozornost.push({ druh: "odpada", titulek: `Přestali chodit (${odpada.length})`, popis: "Dřív trénovali aspoň 3 dny, posledních 5 dní nic.", ucty: odpada.map(ucet) });
  if (bezDiag.length) pozornost.push({ druh: "diagnostika", titulek: `Bez diagnostiky déle než 2 dny (${bezDiag.length})`, popis: "Bez diagnostiky appka neví, co jim dát trénovat.", ucty: bezDiag.map(ucet) });
  if (fb.length) {
    const s = fb.find((r) => r.suggestion) ?? fb[0];
    pozornost.push({ druh: "zpetna", titulek: `Zpětná vazba za týden (${fb.length})`, popis: s?.suggestion ? `„${String(s.suggestion).slice(0, 140)}“` : `Hodnocení ${s?.rating ?? "–"} z 5`, ucty: fb.filter((r) => r.user_id).map((r) => ucet(r.user_id as string)) });
  }
  if (prop.length) pozornost.push({ druh: "propojeni", titulek: `Nová propojení s Vyhodnocením (${prop.length})`, popis: "Za posledních 7 dní.", ucty: prop.map((r) => ucet(r.user_id as string)) });
  if (chyby24.length) pozornost.push({ druh: "chyby", titulek: `Chyby v registraci a přihlášení za 24 h (${chyby24.length})`, popis: chybyPodle.map(([k, n]) => `${k} (${n})`).join(", "), ucty: [] });
  if (dniBezNovinky === null || dniBezNovinky > 9) pozornost.push({ druh: "novinky", titulek: dniBezNovinky === null ? "Zatím žádná novinka" : `${dniBezNovinky} dní bez nové novinky`, popis: "Limit 14 dní. Novinky se ukazují na úvodní stránce a na Domově.", ucty: [] });

  // ── Učení ──
  type Sb = { maxOdhad?: Partial<Record<"5" | "9", number>> };
  const sb = (sbirkaRes.error ? [] : sbirkaRes.data ?? []).filter((r) => ids.has(r.user_id as string)).map((r) => r.state as Sb);
  const prumer = (t: "5" | "9") => { const v = sb.map((s) => s.maxOdhad?.[t]).filter((x): x is number => typeof x === "number"); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const temata = new Map<string, { ok: number; n: number }>();
  let prikladuTyden = 0;
  for (const r of procRows ?? []) {
    if (!ids.has(r.user_id as string)) continue;
    const t = (r.temata ?? []) as { k: string; n: number; ok: number }[];
    for (const x of t) { const c = temata.get(x.k) ?? { ok: 0, n: 0 }; c.ok += x.ok; c.n += x.n; temata.set(x.k, c); }
    if (dnyMezi(r.datum as string, dnes) <= 6) prikladuTyden += t.reduce((a, x) => a + x.n, 0);
  }

  const panel: Panel = {
    dnes: { noveUcty, noveTyden, noveMinulyTyden, trenovalo, zaku: users.length, online, premium: { plati, rucne, zkousi }, zpetnaVazba: fb.length },
    pozornost,
    byznys: { plati, rucne, zkousi, konciDo7: konci.length, premiumZobrazeno: unikV("premium_zobrazeno"), platbaStart: unikV("platba_start"), podilPremium: users.length ? Math.round(((plati + rucne + zkousi) / users.length) * 100) : 0 },
    uceni: { odhad9: prumer("9"), odhad5: prumer("5"), prikladuTyden, temata: [...temata].map(([k, x]) => ({ k, ...x })).filter((x) => x.n >= 10).sort((a, b) => a.ok / a.n - b.ok / b.n) },
  };
  return NextResponse.json(panel);
}
