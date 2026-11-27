/**
 * Časová osa žáka (ZA-09): všechno, co se stalo, lidsky a s časem, seskupené do návštěv
 * (datum, zařízení, délka). Technická událost app_heartbeat se neukazuje, jen z ní vzniká délka návštěvy.
 * Cesta před registrací se bere z navstevy_ucet (anonymní otisk zařízení ze dne registrace).
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TEMA_LABELS } from "@/types";
import { NAZVY as NAZVY_EMAILU } from "@/lib/emaily/katalog";
import type { Zak } from "./typy";
import type { Kontext } from "./data";
import { demoData } from "./demo";

export type TypUdalosti = "trenink" | "zpravy" | "platby" | "web" | "ucet" | "admin";
export interface PolozkaOsy { cas: string; typ: TypUdalosti; text: string }
export interface Navsteva { od: string; do: string; zarizeni: string | null; minut: number | null; nazev: string; polozky: PolozkaOsy[] }

const tema = (k: string) => (TEMA_LABELS as Record<string, string>)[k] ?? k;
const STRANKY: Record<string, string> = { "/": "úvodní stránka", "/registrace": "registrace", "/prihlaseni": "přihlášení", "/premium": "stránka Premium", "/cenik": "ceník", "/trenink": "trénink", "/diagnostika": "diagnostika", "/testy": "testy", "/sbirka": "Hexík", "/profil": "profil", "/vitej": "vítej" };
const NAZEV_FUNKCE: Record<string, string> = { truhla: "otevřel truhlu", satnik: "šatník Hexíka", obchudek: "obchůdek", boss: "Boss týdne", mise: "denní mise", pokojicek: "pokojíček", sady: "sady", kalendar: "adventní kalendář" };

export interface DataOsy { navstevy: Navsteva[]; predRegistraci: PolozkaOsy[]; zarizeni: string | null; premiumVidel: string | null; nejslabsi: { nazev: string; pct: number; n: number } | null; temata: { nazev: string; n: number; ok: number }[] }

export async function nactiOsu(z: Zak, k: Kontext): Promise<DataOsy> {
  const polozky: PolozkaOsy[] = [];
  const heartbeat: { cas: string; zarizeni: string | null }[] = [];
  const predRegistraci: PolozkaOsy[] = [];
  const temata = new Map<string, { n: number; ok: number }>();
  let premiumVidel: string | null = null;

  polozky.push({ cas: z.registrace, typ: "ucet", text: `Registrace (${z.trida}. třída)` });
  if (z.email_overen && Math.abs(Date.parse(z.email_overen) - Date.parse(z.registrace)) > 60_000) polozky.push({ cas: z.email_overen, typ: "ucet", text: "Potvrdil e-mail" });

  if (k.demo) {
    for (const a of demoData().aktivita.filter((x) => x.user_id === z.id)) {
      polozky.push({ cas: `${a.den}T15:0${a.pocet % 10}:00Z`, typ: "trenink", text: a.druh === "diagnostika" ? "Diagnostika hotová" : `Trénink: ${a.pocet * 8} příkladů` });
      heartbeat.push({ cas: `${a.den}T15:00:00Z`, zarizeni: "mobil" }, { cas: `${a.den}T15:12:00Z`, zarizeni: "mobil" });
    }
  } else if (supabaseAdmin) {
    const db = supabaseAdmin;
    const [proc, ev, odp, souhl, pozn, audit, nav, prem, usr] = await Promise.all([
      db.from("procvicovani").select("kdy, sekund, temata").eq("user_id", z.id).order("kdy", { ascending: false }).limit(300),
      db.from("analytics_events").select("event_name, created_at, properties").eq("user_id", z.id).order("created_at", { ascending: false }).limit(3000),
      db.from("odpovedi").select("rezim, sada_id, spravne, preskoceno, created_at, cas_ms").eq("user_id", z.id).in("rezim", ["diagnostika", "test", "vyzva", "rychly", "boss"]).order("created_at", { ascending: false }).limit(1000),
      db.from("souhlasy").select("druh, udelen, verze, created_at").eq("user_id", z.id),
      db.from("admin_poznamky").select("text, created_at").eq("user_id", z.id).order("created_at", { ascending: false }).limit(50),
      db.from("admin_audit").select("akce, detail, created_at").eq("cil_user_id", z.id).neq("akce", "karta_otevrena").order("created_at", { ascending: false }).limit(100),
      db.from("navstevy_ucet").select("v, den").eq("user_id", z.id).eq("kdy", "registrace").limit(5),
      db.from("user_premium").select("is_premium, trial_granted_by, stripe_subscription_id, created_at, updated_at, trial_expires_at").eq("user_id", z.id).maybeSingle(),
      db.auth.admin.getUserById(z.id),
    ]);
    for (const p of proc.data ?? []) {
      const t = (p.temata ?? []) as { k: string; n: number; ok: number }[];
      const n = t.reduce((a, x) => a + x.n, 0), ok = t.reduce((a, x) => a + x.ok, 0);
      for (const x of t) { const c = temata.get(x.k) ?? { n: 0, ok: 0 }; c.n += x.n; c.ok += x.ok; temata.set(x.k, c); }
      const min = Math.max(1, Math.round(((p.sekund as number) ?? 0) / 60));
      polozky.push({ cas: p.kdy as string, typ: "trenink", text: `Trénink ${t.map((x) => tema(x.k)).join(", ")}: ${n} příkladů, ${ok} správně, ${min} min` });
    }
    const maProc = (cas: string) => (proc.data ?? []).some((p) => Math.abs(Date.parse(p.kdy as string) - Date.parse(cas)) < 5 * 60_000);
    const vDny = new Map<string, Set<string>>();
    for (const e of ev.data ?? []) {
      const pr = (e.properties ?? {}) as Record<string, unknown>;
      const cas = e.created_at as string;
      switch (e.event_name) {
        case "app_heartbeat": {
          heartbeat.push({ cas, zarizeni: (pr.zarizeni as string) ?? null });
          const den = cas.slice(0, 10); if (pr.v) { const s = vDny.get(den) ?? new Set<string>(); s.add(pr.v as string); vDny.set(den, s); }
          break;
        }
        case "training_completed": if (!maProc(cas)) polozky.push({ cas, typ: "trenink", text: `Trénink: ${pr.total ?? "?"} příkladů, ${pr.correct ?? "?"} správně` }); break;
        case "diagnostic_completed": polozky.push({ cas, typ: "trenink", text: "Diagnostika hotová" }); break;
        case "mock_test_completed": polozky.push({ cas, typ: "trenink", text: `Cvičný test hotový${pr.body !== undefined ? `: ${pr.body} bodů` : ""}` }); break;
        case "feature_used": polozky.push({ cas, typ: "trenink", text: `Hexík: ${NAZEV_FUNKCE[pr.f as string] ?? pr.f}` }); break;
        case "video_lesson_opened": polozky.push({ cas, typ: "trenink", text: `Otevřel videolekci (${tema(String(pr.tema ?? ""))})` }); break;
        case "email_sent": polozky.push({ cas, typ: "zpravy", text: `E-mail: ${(NAZVY_EMAILU as Record<string, string>)[pr.e as string] ?? pr.e}` }); break;
        case "email_unsubscribed": polozky.push({ cas, typ: "zpravy", text: "Odhlásil e-maily" }); break;
        case "diagnostic_training_started": polozky.push({ cas, typ: "trenink", text: `Z výsledků diagnostiky šel trénovat (${tema(String(pr.tema ?? ""))})` }); break;
      }
    }
    // Otevřel stránku Premium: anonymní page_viewed se spáruje přes denní otisk zařízení z app_heartbeat
    const vsechnyV = [...new Set([...vDny.values()].flatMap((s) => [...s]))];
    if (vsechnyV.length) {
      const { data: pv } = await db.from("analytics_events").select("created_at, properties").eq("event_name", "page_viewed").in("properties->>v", vsechnyV.slice(0, 100)).like("properties->>cesta", "/premium%").order("created_at").limit(20);
      if (pv?.length) { premiumVidel = pv[0].created_at as string; for (const r of pv) polozky.push({ cas: r.created_at as string, typ: "platby", text: "Otevřel stránku Premium" }); }
    }
    const sady = new Map<string, { rezim: string; cas: string; n: number; ok: number }>();
    for (const o of odp.data ?? []) { const kl = (o.sada_id as string) ?? (o.created_at as string); const s = sady.get(kl) ?? { rezim: o.rezim as string, cas: o.created_at as string, n: 0, ok: 0 }; s.n++; if (o.spravne) s.ok++; if ((o.created_at as string) < s.cas) s.cas = o.created_at as string; sady.set(kl, s); }
    const NAZ: Record<string, string> = { diagnostika: "Diagnostika", test: "Cvičný test", vyzva: "Týdenní výzva", rychly: "Rychlý režim", boss: "Boss týdne" };
    for (const s of sady.values()) polozky.push({ cas: s.cas, typ: "trenink", text: `${NAZ[s.rezim] ?? s.rezim}: ${s.n} úloh, ${s.ok} správně` });
    for (const s of souhl.data ?? []) polozky.push({ cas: s.created_at as string, typ: "ucet", text: s.druh === "podminky" ? `Souhlas s podmínkami (verze ${s.verze})` : s.druh === "novinky_email" ? (s.udelen ? "Chce novinky e-mailem" : "Nechce novinky e-mailem") : `Souhlas: ${s.druh}` });
    for (const p of pozn.data ?? []) polozky.push({ cas: p.created_at as string, typ: "admin", text: `Poznámka: ${p.text}` });
    const NAZ_AUDIT: Record<string, string> = { premium_udeleno: "Udělil jsi Premium", premium_odebrano: "Odebral jsi Premium", diagnostika_resetovana: "Resetoval jsi diagnostiku", email_odeslan_rucne: "Poslal jsi e-mail", trida_zmenena: "Změnil jsi třídu", zebricek_zmenen: "Upravil jsi žebříček", reset_hesla_odeslan: "Poslal jsi odkaz na heslo", ucet_deaktivovan: "Změnil jsi aktivaci účtu", testovaci_zmeneno: "Změnil jsi testovací účet", poznamka_zaka: "", stitek_zmenen: "Změnil jsi štítky" };
    for (const a of audit.data ?? []) { const t = NAZ_AUDIT[a.akce as string]; if (t) polozky.push({ cas: a.created_at as string, typ: "admin", text: t + ((a.detail as Record<string, unknown>)?.rezim === "test" ? " (test)" : "") }); }
    if (prem.data?.stripe_subscription_id) polozky.push({ cas: prem.data.created_at as string, typ: "platby", text: "Začal platit Premium (Stripe)" });
    // Historie e-mailů z účtu (připomínky z appky)
    // (app_metadata.emaily.odeslano = kdy naposledy odešel který e-mail; doplní e-maily z doby před měřením email_sent)
    const odeslano = ((usr.data.user?.app_metadata as Record<string, { odeslano?: Record<string, string> }> | undefined)?.emaily?.odeslano ?? {});
    for (const [e, t] of Object.entries(odeslano)) if (t && !polozky.some((p) => p.typ === "zpravy" && Math.abs(Date.parse(p.cas) - Date.parse(t)) < 5 * 60_000)) polozky.push({ cas: t, typ: "zpravy", text: `E-mail: ${(NAZVY_EMAILU as Record<string, string>)[e] ?? e}` });
    // Cesta před registrací (stejné zařízení, stejný den)
    for (const n of nav.data ?? []) {
      const od = new Date(Date.parse(`${n.den}T00:00:00Z`) - 2 * 3600_000).toISOString();
      const { data: anon } = await db.from("analytics_events").select("event_name, created_at, properties").eq("properties->>v", n.v).is("user_id", null).gte("created_at", od).lte("created_at", z.registrace).order("created_at").limit(200);
      for (const a of anon ?? []) {
        const pr = (a.properties ?? {}) as Record<string, unknown>;
        const zdroj = pr.utm_source ? ` (${pr.utm_source}${pr.utm_campaign ? ` · ${pr.utm_campaign}` : ""})` : pr.ref ? ` (z ${pr.ref})` : "";
        if (a.event_name === "page_viewed") predRegistraci.push({ cas: a.created_at as string, typ: "web", text: `Otevřel ${STRANKY[pr.cesta as string] ?? pr.cesta}${pr.vstup ? zdroj : ""}` });
        else if (a.event_name === "element_clicked") predRegistraci.push({ cas: a.created_at as string, typ: "web", text: `Klikl: ${pr.cil}` });
        else if (a.event_name === "sample_answered") predRegistraci.push({ cas: a.created_at as string, typ: "web", text: `Zkusil ukázkový příklad (${pr.spravne ? "správně" : "špatně"})` });
        else if (a.event_name === "form_error_shown") predRegistraci.push({ cas: a.created_at as string, typ: "web", text: `Chyba ve formuláři: ${pr.cil}` });
        else if (a.event_name === "page_left" && pr.sekund) predRegistraci.push({ cas: a.created_at as string, typ: "web", text: `Odešel z ${STRANKY[pr.cesta as string] ?? pr.cesta} po ${pr.sekund} s` });
      }
    }
  }

  // Návštěvy: signály app_heartbeat s mezerou nejvýš 30 min tvoří jednu návštěvu
  const hb = heartbeat.sort((a, b) => a.cas.localeCompare(b.cas));
  const navstevy: Navsteva[] = [];
  for (const h of hb) {
    const posl = navstevy[navstevy.length - 1];
    if (posl && Date.parse(h.cas) - Date.parse(posl.do) <= 30 * 60_000) { posl.do = h.cas; posl.minut = (posl.minut ?? 0) + 1; }
    else navstevy.push({ od: h.cas, do: h.cas, zarizeni: h.zarizeni, minut: 1, nazev: "", polozky: [] });
  }
  // Položky do návštěv, zbytek do „mimo appku“ podle dne (e-maily, akce admina, starší data bez signálu)
  const zbyle: PolozkaOsy[] = [];
  for (const p of polozky) {
    const t = Date.parse(p.cas);
    const n = navstevy.find((x) => t >= Date.parse(x.od) - 10 * 60_000 && t <= Date.parse(x.do) + 10 * 60_000);
    if (n && p.typ !== "zpravy" && p.typ !== "admin") n.polozky.push(p); else zbyle.push(p);
  }
  const den = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague", weekday: "short", day: "numeric", month: "numeric" });
  const skupiny = new Map<string, Navsteva>();
  for (const p of zbyle) {
    const kl = new Date(p.cas).toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });
    const s = skupiny.get(kl) ?? { od: p.cas, do: p.cas, zarizeni: null, minut: null, nazev: "", polozky: [] };
    s.polozky.push(p); if (p.cas < s.od) s.od = p.cas; if (p.cas > s.do) s.do = p.cas;
    skupiny.set(kl, s);
  }
  const vse = [...navstevy.filter((n) => n.polozky.length || (n.minut ?? 0) >= 2), ...skupiny.values()];
  for (const n of vse) {
    n.polozky.sort((a, b) => b.cas.localeCompare(a.cas));
    n.nazev = n.minut !== null ? `${den(n.od)} · ${n.zarizeni ?? "zařízení neznámé"} · ${n.minut} min v appce` : `${den(n.od)}`;
  }
  vse.sort((a, b) => b.od.localeCompare(a.od));

  const tem = [...temata].map(([kk, v]) => ({ nazev: tema(kk), ...v })).sort((a, b) => a.ok / a.n - b.ok / b.n);
  const slabe = tem.find((t) => t.n >= 10);
  return {
    navstevy: vse, predRegistraci: predRegistraci.sort((a, b) => a.cas.localeCompare(b.cas)),
    zarizeni: hb[hb.length - 1]?.zarizeni ?? null, premiumVidel,
    nejslabsi: slabe ? { nazev: slabe.nazev, pct: Math.round((slabe.ok / slabe.n) * 100), n: slabe.n } : null,
    temata: tem,
  };
}
