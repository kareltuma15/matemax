import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";

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
  navsteva: "otevřel stránku", klik: "klikl", odchod: "odešel ze stránky", registrace_odeslana: "odeslal registraci", registrace_google: "registrace přes Google",
  premium_zobrazeno: "otevřel Premium", platba_start: "začal platit", formular_start: "začal vyplňovat", formular_chyba: "chyba ve formuláři", doporuceni_otevreno: "otevřel doporučení",
};

/**
 * Živý přehled (obnovuje se každých 30 s): kdo je teď na webu, dnešek po hodinách proti včerejšku
 * a posledních 20 událostí. Jen počty a cesty, žádné osobní údaje.
 */
async function zive() {
  const ted = Date.now();
  const { data, error } = await supabaseAdmin!.from("analytics_events").select("event_name, created_at, properties").gte("created_at", new Date(ted - 50 * 3600000).toISOString()).order("created_at", { ascending: false }).limit(20000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ev = (data ?? []) as Omit<Ev, "user_id">[];
  const v = (arr: typeof ev) => new Set(arr.map((e) => e.properties?.v).filter(Boolean)).size;
  const za = (min: number) => ev.filter((e) => ted - Date.parse(e.created_at) <= min * 60000);
  const dnes = pragueDateStr(), vcera = denPred(1);
  const hodinaTed = hodinaPraha(new Date(ted));
  const dneska = ev.filter((e) => pragueDateStr(new Date(e.created_at)) === dnes);
  const vcerejsi = ev.filter((e) => pragueDateStr(new Date(e.created_at)) === vcera);
  const navstevy = (arr: typeof ev) => arr.filter((e) => e.event_name === "navsteva");
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
    posledni: ev.filter((e) => e.event_name !== "odchod").slice(0, 20).map((e) => ({
      cas: e.created_at, co: POPIS_UDALOSTI[e.event_name] ?? e.event_name,
      kde: e.event_name === "klik" ? (e.properties?.text || e.properties?.cil) : e.properties?.cesta, zarizeni: e.properties?.zarizeni ?? null,
    })),
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  if (new URL(req.url).searchParams.get("zive") === "1") return zive();

  const dni = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("dni")) || 30));
  const od = new Date(Date.now() - dni * 86400000).toISOString();

  const [{ data: evRows, error }, { data: authData }] = await Promise.all([
    supabaseAdmin.from("analytics_events").select("event_name, created_at, user_id, properties").gte("created_at", od).order("created_at", { ascending: true }).limit(50000),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ev = (evRows ?? []) as Ev[];
  const p = (e: Ev) => e.properties ?? {};

  const navstevy = ev.filter((e) => e.event_name === "navsteva");
  const unik = (arr: Ev[]) => new Set(arr.map((e) => p(e).v).filter(Boolean)).size;
  // Den podle Prahy (ne UTC: noční návštěvy by jinak padaly do předchozího dne)
  const den = (iso: string) => pragueDateStr(new Date(iso));

  // po dnech
  const dnyMap = new Map<string, Ev[]>();
  for (const e of navstevy) { const d = den(e.created_at); dnyMap.set(d, [...(dnyMap.get(d) ?? []), e]); }
  const poDnech = Array.from({ length: dni }, (_, i) => {
    const d = denPred(dni - 1 - i);
    const a = dnyMap.get(d) ?? [];
    return { den: d, navstevniku: unik(a), stranek: a.length, ucty: (authData?.users ?? []).filter((u) => den(u.created_at) === d).length };
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
  const kliky = pocitej(ev.filter((e) => e.event_name === "klik"), (e) => p(e).cil);
  const zarizeni = pocitej(navstevy, (e) => p(e).zarizeni);

  const vSet = (f: (e: Ev) => boolean) => new Set(ev.filter(f).map((e) => p(e).v).filter(Boolean)).size;
  const uzivatele = (authData?.users ?? []).filter((u) => u.created_at >= od);
  const trychtyr = [
    { krok: "Návštěvníci MateMaxu", n: unik(navstevy) },
    { krok: "Otevřeli úvodní stránku", n: vSet((e) => e.event_name === "navsteva" && (p(e).cesta === "/" || p(e).cesta === "/matemax")) },
    { krok: "Klikli na registraci / Začít", n: vSet((e) => e.event_name === "klik" && /^\/(registrace|vitej)/.test(p(e).cil ?? "")) },
    { krok: "Otevřeli registraci", n: vSet((e) => e.event_name === "navsteva" && (p(e).cesta ?? "").startsWith("/registrace")) },
    { krok: "Odeslali registraci", n: ev.filter((e) => e.event_name === "registrace_odeslana" || e.event_name === "registrace_google").length },
    { krok: "Nové účty", n: uzivatele.length },
    { krok: "Potvrdili e-mail / přihlásili se", n: uzivatele.filter((u) => u.email_confirmed_at || u.last_sign_in_at).length },
    { krok: "Dokončili diagnostiku", n: new Set(ev.filter((e) => e.event_name === "diagnostika_dokoncena").map((e) => e.user_id ?? e.created_at)).size },
    { krok: "Dokončili trénink", n: new Set(ev.filter((e) => e.event_name === "session_completed").map((e) => e.user_id ?? e.created_at)).size },
    { krok: "Otevřeli Premium", n: vSet((e) => e.event_name === "premium_zobrazeno") },
    { krok: "Začali platit", n: vSet((e) => e.event_name === "platba_start") },
  ];

  // Trénink po týdnech (ověření, že odměny pomáhají): dny tréninku a příklady na žáka, úspěšnost.
  // Z tabulky sessions (jeden řádek = dokončený trénink). Jen souhrny, žádné jednotlivé účty.
  const tydnu = 8;
  const pondeli = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
  const prvniPondeli = pondeli(new Date(Date.now() - (tydnu - 1) * 7 * 86400000));
  const odData = prvniPondeli.toISOString().slice(0, 10);
  const [{ data: sesRows }, sbirkaRes] = await Promise.all([
    supabaseAdmin.from("sessions").select("user_id, date, total, correct").gte("date", odData).limit(20000),
    supabaseAdmin.from("user_sbirka").select("state").limit(5000),
  ]);
  const trenink = Array.from({ length: tydnu }, (_, i) => {
    const od = new Date(prvniPondeli.getTime() + i * 7 * 86400000);
    const doo = new Date(od.getTime() + 6 * 86400000);
    const a = od.toISOString().slice(0, 10), b = doo.toISOString().slice(0, 10);
    const radky = (sesRows ?? []).filter((r) => r.date >= a && r.date <= b);
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
  const sb = (sbirkaRes.error ? [] : (sbirkaRes.data ?? [])).map((r) => r.state as Sb);
  const odmeny = sbirkaRes.error ? null : {
    zaku: sb.length,
    ziskano: sb.reduce((x, s) => x + (s.ziskano ?? 0), 0),
    utraceno: sb.reduce((x, s) => x + (s.utraceno ?? 0), 0),
    truhel: sb.reduce((x, s) => x + (s.otevreno ?? 0), 0),
    odmen: sb.reduce((x, s) => x + (s.mam?.length ?? 0), 0),
  };

  // Úvodní stránka: co návštěvníci dělají (od 16. 11. 2026, událost odchod)
  const odchody = ev.filter((e) => e.event_name === "odchod" && p(e).cesta === "/");
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
    kliky: pocitej(ev.filter((e) => e.event_name === "klik" && p(e).cesta === "/"), (e) => p(e).text || p(e).cil, false),
    pokracovali,
    formular: pocitej(ev.filter((e) => e.event_name === "formular_start"), (e) => p(e).cesta),
    chyby: pocitej(ev.filter((e) => e.event_name === "formular_chyba"), (e) => `${p(e).cesta}: ${p(e).cil}`, false),
  };

  return NextResponse.json({
    dni, uvod,
    trenink, odmeny,
    mereniOd: navstevy[0]?.created_at ?? null,
    souhrn: { navstevniku: unik(navstevy), stranek: navstevy.length, novychUctu: uzivatele.length },
    poDnech, zdroje, stranky, kliky, zarizeni, trychtyr,
  });
}
