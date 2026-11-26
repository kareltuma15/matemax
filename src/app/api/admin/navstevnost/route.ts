import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { nactiVse, vsechnyUcty, vylouceneUcty } from "@/lib/admin-data";

/**
 * Návštěvnost a trychtýř pro admina (Karel): z analytics_events (měření bez cookies) a z účtů.
 * Vrací jen souhrny (počty), žádné e-maily ani jednotlivé návštěvníky.
 */
type Ev = { event_name: string; created_at: string; user_id: string | null; properties: Record<string, string | undefined> & { sekund?: number; scroll?: number; kliku?: number } | null };

/** Hodina v Praze (0–23). */
const hodinaPraha = (d: Date) => Number(new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", hourCycle: "h23" }).format(d));
/** Pražský den o `n` dní dřív než dnes (poledne UTC je bezpečné přes letní čas). */
const denPred = (n: number) => pragueDateStr(new Date(Date.now() - n * 86400000));

const POPIS_UDALOSTI: Record<string, string> = {
  page_viewed: "otevřel stránku", element_clicked: "klikl", page_left: "odešel ze stránky", signup_submitted: "odeslal registraci", signup_google_started: "registrace přes Google",
  premium_viewed: "otevřel Premium", checkout_started: "začal platit", form_started: "začal vyplňovat", form_error_shown: "chyba ve formuláři", recommendation_opened: "otevřel doporučení",
};

/**
 * Živý přehled (obnovuje se každých 30 s): kdo je teď na webu, dnešek po hodinách proti včerejšku
 * a posledních 20 událostí. Jen počty a cesty, žádné osobní údaje.
 */
/** Účty pro statistiky: jména a testovací účty (značka app_metadata.testovaci). */
async function nactiUcty() {
  const users = await vsechnyUcty();
  const testovaci = vylouceneUcty(users);
  const jmena = new Map(users.map((u) => {
    const m = (u.user_metadata ?? {}) as Record<string, unknown>;
    const jm = (typeof m.first_name === "string" && m.first_name) || (typeof m.full_name === "string" && m.full_name) || (u.email ?? "").split("@")[0];
    return [u.id, { jmeno: jm, trida: Number(m.trida) === 5 ? 5 : 9 }] as const;
  }));
  return { users, testovaci, jmena };
}

/**
 * Spárování anonymních návštěv s účty přes signál „jsem tu“ (stejný denní otisk v):
 * v → účet, a otisky testovacích účtů, které se ze statistik vynechají.
 */
function parujUcty(ev: Ev[], testovaci: Set<string>) {
  const vUcet = new Map<string, string>();
  for (const e of ev) if (e.event_name === "app_heartbeat" && e.user_id && e.properties?.v) vUcet.set(e.properties.v, e.user_id);
  const testV = new Set([...vUcet].filter(([, u]) => testovaci.has(u)).map(([v]) => v));
  const cista = ev.filter((e) => !(e.user_id && testovaci.has(e.user_id)) && !(e.properties?.v && testV.has(e.properties.v)));
  return { vUcet, cista };
}

async function zive() {
  const ted = Date.now();
  const [{ data, error }, ucty] = await Promise.all([
    nactiVse<Ev>((a, b) => supabaseAdmin!.from("analytics_events").select("event_name, created_at, user_id, properties").gte("created_at", new Date(ted - 50 * 3600000).toISOString()).order("created_at", { ascending: false }).range(a, b)).then((data) => ({ data, error: null as { message: string } | null })),
    nactiUcty(),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { vUcet, cista: ev } = parujUcty((data ?? []) as Ev[], ucty.testovaci);
  // Kdo je teď v appce: přihlášení jménem (signál za poslední 2 min), bez účtu jen počtem a stránkou
  const dnesD = pragueDateStr();
  const prihlaseni = new Map<string, { jmeno: string; trida: number; cesta: string | null; zarizeni: string | null; minutDnes: number }>();
  for (const e of ev) {
    if (e.event_name !== "app_heartbeat" || !e.user_id) continue;
    const ucet = ucty.jmena.get(e.user_id);
    if (!ucet) continue;
    const c = prihlaseni.get(e.user_id);
    const nedavno = ted - Date.parse(e.created_at) <= 120_000;
    if (!c) { if (nedavno) prihlaseni.set(e.user_id, { ...ucet, cesta: e.properties?.cesta ?? null, zarizeni: e.properties?.zarizeni ?? null, minutDnes: 0 }); else continue; }
    const x = prihlaseni.get(e.user_id);
    if (x && pragueDateStr(new Date(e.created_at)) === dnesD) x.minutDnes += 1;
  }
  const bezUctu = new Map<string, string>();
  for (const e of ev) if (e.event_name === "page_viewed" && ted - Date.parse(e.created_at) <= 300_000 && e.properties?.v && !vUcet.has(e.properties.v) && !bezUctu.has(e.properties.v)) bezUctu.set(e.properties.v, e.properties.cesta ?? "?");
  const ziveUcty = [...prihlaseni.values()];
  const bezUctuStranky = [...[...bezUctu.values()].reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map<string, number>())].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
  const dnesMinut = ev.filter((e) => e.event_name === "app_heartbeat" && pragueDateStr(new Date(e.created_at)) === dnesD).length;
  // Trénoval = dokončil aspoň 1 trénink dnes (stejná definice jako Řídicí panel, docs/metriky.md), ne jen otevřel stránku
  const { data: dnesTren } = await supabaseAdmin!.from("procvicovani").select("user_id").eq("datum", dnesD).limit(1000);
  const dnesTrenovalo = new Set((dnesTren ?? []).map((r) => r.user_id as string).filter((u) => !ucty.testovaci.has(u))).size;
  const v = (arr: typeof ev) => new Set(arr.map((e) => e.properties?.v).filter(Boolean)).size;
  const za = (min: number) => ev.filter((e) => ted - Date.parse(e.created_at) <= min * 60000);
  const dnes = pragueDateStr(), vcera = denPred(1);
  const hodinaTed = hodinaPraha(new Date(ted));
  const dneska = ev.filter((e) => pragueDateStr(new Date(e.created_at)) === dnes);
  const vcerejsi = ev.filter((e) => pragueDateStr(new Date(e.created_at)) === vcera);
  const navstevy = (arr: typeof ev) => arr.filter((e) => e.event_name === "page_viewed");
  const poHodinach = Array.from({ length: 24 }, (_, h) => ({
    h,
    dnes: v(navstevy(dneska).filter((e) => hodinaPraha(new Date(e.created_at)) === h)),
    vcera: v(navstevy(vcerejsi).filter((e) => hodinaPraha(new Date(e.created_at)) === h)),
  }));
  const posl30 = navstevy(za(30));
  const strankyTed = [...posl30.reduce((m, e) => { const k = e.properties?.cesta ?? "?"; const s = m.get(k) ?? new Set<string>(); s.add(e.properties?.v ?? e.created_at); return m.set(k, s); }, new Map<string, Set<string>>())]
    .map(([k, s]) => ({ k, n: s.size })).sort((a, b) => b.n - a.n).slice(0, 8);
  return NextResponse.json({
    cas: new Date(ted).toISOString(),
    pet: v(za(5)), tricet: v(za(30)),
    dnes: { navstevniku: v(navstevy(dneska)), stranek: navstevy(dneska).length },
    // Včera ve stejnou dobu (do stejné hodiny a minuty), ať je srovnání férové
    vceraDoTed: v(navstevy(vcerejsi).filter((e) => { const d = new Date(e.created_at); const h = hodinaPraha(d); return h < hodinaTed || (h === hodinaTed && d.getUTCMinutes() <= new Date(ted).getUTCMinutes()); })),
    vceraCelkem: v(navstevy(vcerejsi)),
    hodinaTed, poHodinach, strankyTed,
    ziveUcty, bezUctuOnline: bezUctu.size, bezUctuStranky, dnesMinut, dnesTrenovalo,
    posledni: ev.filter((e) => e.event_name !== "page_left" && e.event_name !== "app_heartbeat").slice(0, 20).map((e) => ({
      cas: e.created_at, co: POPIS_UDALOSTI[e.event_name] ?? e.event_name,
      kde: e.event_name === "element_clicked" ? (e.properties?.text || e.properties?.cil) : e.properties?.cesta, zarizeni: e.properties?.zarizeni ?? null,
    })),
  });
}

/**
 * Detail jednoho dne (klepnutí na sloupec v grafu): každý návštěvník zvlášť, kolik stránek prošel,
 * kudy (pořadí stránek), jak dlouho, odkud přišel a jestli je to přihlášený žák. Bez testovacích účtů.
 */
async function detailDne(denD: string) {
  const od = new Date(Date.parse(denD + "T00:00:00Z") - 3 * 3600000).toISOString();
  const doo = new Date(Date.parse(denD + "T00:00:00Z") + 27 * 3600000).toISOString();
  const [{ data, error }, ucty, { data: prop }] = await Promise.all([
    nactiVse<Ev>((a, b) => supabaseAdmin!.from("analytics_events").select("event_name, created_at, user_id, properties").gte("created_at", od).lt("created_at", doo).order("created_at", { ascending: true }).range(a, b)).then((data) => ({ data, error: null as { message: string } | null })),
    nactiUcty(),
    supabaseAdmin!.from("vysledky_propojeni").select("user_id").is("zruseno_at", null),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const propojeni = new Set((prop ?? []).map((r) => r.user_id as string));
  const vDne = ((data ?? []) as Ev[]).filter((e) => pragueDateStr(new Date(e.created_at)) === denD);
  const { vUcet, cista } = parujUcty(vDne, ucty.testovaci);
  const poV = new Map<string, Ev[]>();
  for (const e of cista) { const v = e.properties?.v; if (!v || e.event_name === "app_heartbeat") continue; poV.set(v, [...(poV.get(v) ?? []), e]); }
  // Přihlášení, kteří ten den nic veřejného neotevřeli, ale byli v appce (jen signál „jsem tu“)
  for (const e of cista) if (e.event_name === "app_heartbeat" && e.properties?.v && !poV.has(e.properties.v)) poV.set(e.properties.v, []);
  const navstevnici = [...poV].map(([v, evs]) => {
    const nav = evs.filter((e) => e.event_name === "page_viewed");
    const trasa: string[] = [];
    for (const e of nav) { const c = e.properties?.cesta ?? "?"; if (trasa[trasa.length - 1] !== c) trasa.push(c); }
    const casy = [...evs, ...cista.filter((e) => e.event_name === "app_heartbeat" && e.properties?.v === v)].map((e) => Date.parse(e.created_at));
    const ziveMinut = cista.filter((e) => e.event_name === "app_heartbeat" && e.properties?.v === v).length;
    const odchodSek = evs.filter((e) => e.event_name === "page_left").reduce((a, e) => a + (Number(e.properties?.sekund) || 0), 0);
    const trvani = Math.max(ziveMinut * 60, casy.length > 1 ? (Math.max(...casy) - Math.min(...casy)) / 1000 : 0, odchodSek);
    const prvni = nav[0]?.properties ?? evs[0]?.properties ?? {};
    const uid = vUcet.get(v);
    const ucet = uid ? ucty.jmena.get(uid) : undefined;
    return {
      ucet: ucet ? { jmeno: ucet.jmeno, trida: ucet.trida, propojeny: propojeni.has(uid!) } : null,
      stranek: nav.length, kliku: evs.filter((e) => e.event_name === "element_clicked").length,
      trasa: trasa.slice(0, 14), dalsich: Math.max(0, trasa.length - 14),
      sekund: Math.round(trvani), zarizeni: prvni.zarizeni ?? null,
      zdroj: prvni.utm_source ? `utm: ${prvni.utm_source}` : prvni.ref ?? null,
      od: casy.length ? new Date(Math.min(...casy)).toISOString() : null,
    };
  }).sort((a, b) => (b.ucet ? 1 : 0) - (a.ucet ? 1 : 0) || b.stranek - a.stranek || b.sekund - a.sekund);
  return NextResponse.json({ den: denD, lidi: navstevnici.length, stranek: navstevnici.reduce((a, n) => a + n.stranek, 0), navstevnici: navstevnici.slice(0, 80) });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  if (new URL(req.url).searchParams.get("zive") === "1") return zive();
  const denDetail = new URL(req.url).searchParams.get("den");
  if (denDetail && /^\d{4}-\d{2}-\d{2}$/.test(denDetail)) return detailDne(denDetail);

  const dni = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("dni")) || 30));
  const od = new Date(Date.now() - dni * 86400000).toISOString();

  const [{ data: evRows, error }, ucty] = await Promise.all([
    nactiVse<Ev>((a, b) => supabaseAdmin!.from("analytics_events").select("event_name, created_at, user_id, properties").gte("created_at", od).order("created_at", { ascending: true }).range(a, b)).then((data) => ({ data, error: null as { message: string } | null })),
    nactiUcty(),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const authData = { users: ucty.users.filter((u) => !ucty.testovaci.has(u.id)) };
  const { vUcet, cista: ev } = parujUcty((evRows ?? []) as Ev[], ucty.testovaci);
  const p = (e: Ev) => e.properties ?? {};

  const navstevy = ev.filter((e) => e.event_name === "page_viewed");
  const unik = (arr: Ev[]) => new Set(arr.map((e) => p(e).v).filter(Boolean)).size;
  // Den podle Prahy (ne UTC: noční návštěvy by jinak padaly do předchozího dne)
  const den = (iso: string) => pragueDateStr(new Date(iso));

  // po dnech
  const dnyMap = new Map<string, Ev[]>();
  for (const e of navstevy) { const d = den(e.created_at); dnyMap.set(d, [...(dnyMap.get(d) ?? []), e]); }
  const poDnech = Array.from({ length: dni }, (_, i) => {
    const d = denPred(dni - 1 - i);
    const a = dnyMap.get(d) ?? [];
    const prihlaseni = new Set(a.map((e) => p(e).v).filter((v) => v && vUcet.has(v))).size;
    return { den: d, navstevniku: unik(a), prihlaseni, bezUctu: unik(a) - prihlaseni, stranek: a.length, ucty: (authData?.users ?? []).filter((u) => den(u.created_at) === d).length };
  });

  const pocitej = (arr: Ev[], klic: (e: Ev) => string | undefined, unikatne = true) => {
    const m = new Map<string, Set<string> | number>();
    for (const e of arr) {
      const k = klic(e); if (!k) continue;
      if (unikatne) { const s = (m.get(k) as Set<string>) ?? new Set<string>(); s.add(p(e).v ?? Math.random().toString()); m.set(k, s); }
      else m.set(k, ((m.get(k) as number) ?? 0) + 1);
    }
    return [...m.entries()].map(([k, v]) => ({ k, n: typeof v === "number" ? v : v.size })).sort((a, b) => b.n - a.n).slice(0, 15);
  };

  const zdroje = pocitej(navstevy, (e) => p(e).utm_source ? `utm: ${p(e).utm_source}` : p(e).ref ?? "přímo / neznámo");
  const stranky = pocitej(navstevy, (e) => p(e).cesta);
  const kliky = pocitej(ev.filter((e) => e.event_name === "element_clicked"), (e) => p(e).cil);
  const zarizeni = pocitej(navstevy, (e) => p(e).zarizeni);

  const vSet = (f: (e: Ev) => boolean) => new Set(ev.filter(f).map((e) => p(e).v).filter(Boolean)).size;
  const uzivatele = (authData?.users ?? []).filter((u) => u.created_at >= od);
  const trychtyr = [
    { krok: "Návštěvníci MateMaxu", n: unik(navstevy) },
    { krok: "Otevřeli úvodní stránku", n: vSet((e) => e.event_name === "page_viewed" && (p(e).cesta === "/" || p(e).cesta === "/matemax")) },
    { krok: "Klikli na registraci / Začít", n: vSet((e) => e.event_name === "element_clicked" && /^\/(registrace|vitej)/.test(p(e).cil ?? "")) },
    { krok: "Otevřeli registraci", n: vSet((e) => e.event_name === "page_viewed" && (p(e).cesta ?? "").startsWith("/registrace")) },
    { krok: "Odeslali registraci", n: ev.filter((e) => e.event_name === "signup_submitted" || e.event_name === "signup_google_started").length },
    { krok: "Nové účty", n: uzivatele.length },
    { krok: "Potvrdili e-mail / přihlásili se", n: uzivatele.filter((u) => u.email_confirmed_at || u.last_sign_in_at).length },
    { krok: "Dokončili diagnostiku", n: new Set(ev.filter((e) => e.event_name === "diagnostic_completed").map((e) => e.user_id ?? e.created_at)).size },
    { krok: "Dokončili trénink", n: new Set(ev.filter((e) => e.event_name === "training_completed").map((e) => e.user_id ?? e.created_at)).size },
    { krok: "Otevřeli Premium", n: vSet((e) => e.event_name === "premium_viewed") },
    { krok: "Začali platit", n: vSet((e) => e.event_name === "checkout_started") },
  ];

  // ── Kampaně: co který zdroj přinesl (Karel 22. 11. 2026, reklama na Facebooku) ──
  // Návštěvník (denní otisk v) patří zdroji první návštěvy s kampaní / cizím webem, jinak „přímo“.
  // Účty: zdroj uložený při registraci (user_metadata.zdroj, od 22. 11.), starší účty „neuvedeno“.
  const zdrojUdalosti = (e: Ev): string => {
    const x = p(e);
    if (x.utm_source) return [x.utm_source, x.utm_campaign].filter(Boolean).join(" · ");
    const r = x.ref ?? "";
    if (/(^|\.)facebook\.com$|^fb\.me$/.test(r)) return "facebook";
    if (/(^|\.)instagram\.com$/.test(r)) return "instagram";
    return r || "přímo";
  };
  const zdrojV = new Map<string, string>();
  for (const e of navstevy) {
    const v = p(e).v; if (!v) continue;
    const z = zdrojUdalosti(e);
    if (!zdrojV.has(v) || (zdrojV.get(v) === "přímo" && z !== "přímo")) zdrojV.set(v, z);
  }
  const [{ data: premRows }, { data: trenRows }] = await Promise.all([
    supabaseAdmin.from("user_premium").select("user_id, is_premium, stripe_subscription_id"),
    nactiVse<{ user_id: string }>((a, b) => supabaseAdmin!.from("sessions").select("user_id").gte("date", od.slice(0, 10)).order("date").range(a, b)).then((data) => ({ data })),
  ]);
  const placeni = new Set((premRows ?? []).filter((r) => r.is_premium && r.stripe_subscription_id).map((r) => r.user_id as string));
  const trenovali = new Set((trenRows ?? []).map((r) => r.user_id as string));
  const kampMap = new Map<string, { zdroj: string; navstevniku: number; klikRegistrace: number; odeslali: number; ucty: number; potvrdili: number; trenovali: number; platici: number }>();
  const kamp = (z: string) => kampMap.get(z) ?? kampMap.set(z, { zdroj: z, navstevniku: 0, klikRegistrace: 0, odeslali: 0, ucty: 0, potvrdili: 0, trenovali: 0, platici: 0 }).get(z)!;
  for (const z of zdrojV.values()) kamp(z).navstevniku++;
  const klikV = new Set(ev.filter((e) => e.event_name === "element_clicked" && /^\/(registrace|vitej)/.test(p(e).cil ?? "")).map((e) => p(e).v).filter(Boolean) as string[]);
  for (const v of klikV) kamp(zdrojV.get(v) ?? "přímo").klikRegistrace++;
  for (const e of ev) if (e.event_name === "signup_submitted" || e.event_name === "signup_google_started") kamp(p(e).v ? zdrojV.get(p(e).v!) ?? zdrojUdalosti(e) : zdrojUdalosti(e)).odeslali++;
  for (const u of uzivatele) {
    const z = (u.user_metadata as Record<string, unknown> | undefined)?.zdroj;
    const k = kamp(typeof z === "string" && z ? z : "neuvedeno (účty před 22. 11.)");
    k.ucty++;
    if (u.email_confirmed_at || u.last_sign_in_at) k.potvrdili++;
    if (trenovali.has(u.id)) k.trenovali++;
    if (placeni.has(u.id)) k.platici++;
  }
  const kampane = [...kampMap.values()].sort((a, b) => b.ucty - a.ucty || b.navstevniku - a.navstevniku).slice(0, 20);

  // Trénink po týdnech (ověření, že odměny pomáhají): dny tréninku a příklady na žáka, úspěšnost.
  // Z tabulky sessions (jeden řádek = dokončený trénink). Jen souhrny, žádné jednotlivé účty.
  const tydnu = 8;
  const pondeli = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
  const prvniPondeli = pondeli(new Date(Date.now() - (tydnu - 1) * 7 * 86400000));
  const odData = prvniPondeli.toISOString().slice(0, 10);
  const [{ data: sesRows }, sbirkaRes] = await Promise.all([
    nactiVse<{ user_id: string; date: string; total: number; correct: number }>((a, b) => supabaseAdmin!.from("sessions").select("user_id, date, total, correct").gte("date", odData).order("date").range(a, b)).then((data) => ({ data })),
    supabaseAdmin.from("user_sbirka").select("user_id, state").limit(5000),
  ]);
  const trenink = Array.from({ length: tydnu }, (_, i) => {
    const od = new Date(prvniPondeli.getTime() + i * 7 * 86400000);
    const doo = new Date(od.getTime() + 6 * 86400000);
    const a = od.toISOString().slice(0, 10), b = doo.toISOString().slice(0, 10);
    const radky = (sesRows ?? []).filter((r) => r.date >= a && r.date <= b && !ucty.testovaci.has(r.user_id));
    const zaci = new Map<string, Set<string>>();
    for (const r of radky) { const s = zaci.get(r.user_id) ?? new Set<string>(); s.add(r.date); zaci.set(r.user_id, s); }
    const n = zaci.size;
    const prikladu = radky.reduce((x, r) => x + (r.total ?? 0), 0);
    const spravne = radky.reduce((x, r) => x + (r.correct ?? 0), 0);
    return {
      tyden: a,
      zaku: n,
      dniNaZaka: n ? Math.round(([...zaci.values()].reduce((x, s) => x + s.size, 0) / n) * 10) / 10 : 0,
      prikladuNaZaka: n ? Math.round(prikladu / n) : 0,
      uspesnost: prikladu ? Math.round((spravne / prikladu) * 100) : null,
    };
  });
  type Sb = { ziskano?: number; utraceno?: number; otevreno?: number; mam?: string[] };
  const sb = (sbirkaRes.error ? [] : (sbirkaRes.data ?? [])).filter((r) => !ucty.testovaci.has(r.user_id as string)).map((r) => r.state as Sb);
  const odmeny = sbirkaRes.error ? null : {
    zaku: sb.length,
    ziskano: sb.reduce((x, s) => x + (s.ziskano ?? 0), 0),
    utraceno: sb.reduce((x, s) => x + (s.utraceno ?? 0), 0),
    truhel: sb.reduce((x, s) => x + (s.otevreno ?? 0), 0),
    odmen: sb.reduce((x, s) => x + (s.mam?.length ?? 0), 0),
  };

  // Úvodní stránka: co návštěvníci dělají (od 16. 11. 2026, událost odchod)
  const odchody = ev.filter((e) => e.event_name === "page_left" && p(e).cesta === "/");
  const sek = odchody.map((e) => p(e).sekund ?? 0).sort((a, b) => a - b);
  const median = sek.length ? sek[Math.floor(sek.length / 2)] : null;
  const scrollPodil = (min: number) => odchody.length ? Math.round((odchody.filter((e) => (p(e).scroll ?? 0) >= min).length / odchody.length) * 100) : 0;
  const navUvod = new Set(navstevy.filter((e) => p(e).cesta === "/").map((e) => p(e).v).filter(Boolean));
  const pokracovali = new Set(navstevy.filter((e) => p(e).cesta !== "/" && navUvod.has(p(e).v)).map((e) => p(e).v)).size;
  const uvod = {
    zobrazeni: odchody.length,
    navstevniku: navUvod.size,
    odesliHned: odchody.filter((e) => (p(e).sekund ?? 0) < 10 && !(p(e).kliku)).length,
    bezKliku: odchody.filter((e) => !(p(e).kliku)).length,
    medianSekund: median,
    scroll: [25, 50, 75, 90].map((min) => ({ min, podil: scrollPodil(min) })),
    posledniSekce: pocitej(odchody, (e) => p(e).sekce ?? "úplně nahoře", false),
    kliky: pocitej(ev.filter((e) => e.event_name === "element_clicked" && p(e).cesta === "/"), (e) => p(e).text || p(e).cil, false),
    pokracovali,
    formular: pocitej(ev.filter((e) => e.event_name === "form_started"), (e) => p(e).cesta),
    chyby: pocitej(ev.filter((e) => e.event_name === "form_error_shown"), (e) => `${p(e).cesta}: ${p(e).cil}`, false),
  };

  return NextResponse.json({
    dni, uvod,
    trenink, odmeny,
    mereniOd: navstevy[0]?.created_at ?? null,
    souhrn: { navstevniku: unik(navstevy), stranek: navstevy.length, novychUctu: uzivatele.length },
    poDnech, zdroje, stranky, kliky, zarizeni, trychtyr, kampane,
  });
}
