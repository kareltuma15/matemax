import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Návštěvnost a trychtýř pro admina (Karel): z analytics_events (měření bez cookies) a z účtů.
 * Vrací jen souhrny (počty), žádné e-maily ani jednotlivé návštěvníky.
 */
type Ev = { event_name: string; created_at: string; user_id: string | null; properties: Record<string, string | undefined> | null };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

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
  const den = (iso: string) => iso.slice(0, 10);

  // po dnech
  const dnyMap = new Map<string, Ev[]>();
  for (const e of navstevy) { const d = den(e.created_at); dnyMap.set(d, [...(dnyMap.get(d) ?? []), e]); }
  const poDnech = Array.from({ length: dni }, (_, i) => {
    const d = new Date(Date.now() - (dni - 1 - i) * 86400000).toISOString().slice(0, 10);
    const a = dnyMap.get(d) ?? [];
    return { den: d, navstevniku: unik(a), stranek: a.length };
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

  return NextResponse.json({
    dni,
    trenink, odmeny,
    mereniOd: navstevy[0]?.created_at ?? null,
    souhrn: { navstevniku: unik(navstevy), stranek: navstevy.length, novychUctu: uzivatele.length },
    poDnech, zdroje, stranky, kliky, zarizeni, trychtyr,
  });
}
