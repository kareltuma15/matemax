/**
 * Fronta akcí na Dnes (DN-01, výběr pravidel PL-01 pro fázi A). Každé doporučení má lidi za sebou,
 * proč na tom záleží, hlavní akci a prioritu. Vyřízené, odložené a skryté se pamatují v admin_doporuceni_stav.
 * Klíč = pravidlo + dotčení žáci: když přibude nový žák, doporučení se vrátí.
 * Priorita = dotčení lidé × váha oblasti (peníze 3, aktivace 2, ostatní 1) × naléhavost.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { cerstvost } from "@/lib/obsah";
import type { Zak } from "./typy";
import type { Nastaveni } from "./nastaveni";
import type { Kontext } from "./data";
import { denZ, dnyMezi, type DnyAktivity } from "./metriky";
import { ChybiMigraceUceni, NAZVY_PRIZNAKU, POPISY_PRIZNAKU, PRAHY_UCENI, nactiKarty, nactiOdpovedi, opakovani, statUloh, tematZaka } from "./uceni";
import { kontrolyUloh, potlaceneUlohy } from "./kontroly";

export type AkceDoporuceni =
  | { typ: "email"; text: string; sablona: string }
  | { typ: "odkaz"; text: string; href: string }
  | { typ: "ukol"; text: string; ukol: string };

export interface Doporuceni {
  klic: string;
  pravidlo: string;
  oblast: "aktivace" | "navrat" | "penize" | "obsah" | "rust" | "zpravy" | "uceni";
  titulek: string;
  proc: string;
  lide: string[];
  akce: AkceDoporuceni;
  priorita: number;
}

const VAHA: Record<Doporuceni["oblast"], number> = { penize: 3, aktivace: 2, zpravy: 2, navrat: 1.5, uceni: 1.5, obsah: 1, rust: 1 };
const H = 3600_000;

export async function spocitejDoporuceni(zaci: Zak[], dny: DnyAktivity, n: Nastaveni, k: Kontext): Promise<Doporuceni[]> {
  const ted = Date.now();
  const dnes = pragueDateStr();
  const p = n.pravidla;
  const out: Doporuceni[] = [];
  const pridej = (d: Omit<Doporuceni, "klic" | "priorita">, nalehavost = 1) => {
    if (!d.lide.length && d.oblast !== "obsah" && d.oblast !== "rust" && d.oblast !== "uceni") return;
    out.push({ ...d, klic: `${d.pravidlo}:${[...d.lide].sort().join(",").slice(0, 150)}`, priorita: Math.max(1, d.lide.length) * VAHA[d.oblast] * nalehavost });
  };

  // Aktivace: nový žák X h bez diagnostiky (nejvýš 14 dní od registrace, starší řeší „nezačal“)
  const bezDiag = zaci.filter((z) => !z.diagnostika && ted - Date.parse(z.registrace) > p.bezDiagnostikyHodin * H && ted - Date.parse(z.registrace) < 14 * 24 * H);
  pridej({ pravidlo: "bez_diagnostiky", oblast: "aktivace", titulek: `${bezDiag.length} ${bezDiag.length === 1 ? "nový žák" : "noví žáci"} ${p.bezDiagnostikyHodin} h bez diagnostiky`, proc: "Bez diagnostiky appka neví, co jim dát trénovat, a většina takových žáků se nevrátí.", lide: bezDiag.map((z) => z.id), akce: { typ: "email", text: "Poslat připomínku", sablona: "nezacal" } }, 1.5);

  // Aktivace: diagnostika bez tréninku 48 h
  const diagBez = zaci.filter((z) => z.diagnostika && !z.prvni_trenink && ted - Date.parse(z.diagnostika) > p.diagBezTreninkuHodin * H && ted - Date.parse(z.diagnostika) < 21 * 24 * H);
  pridej({ pravidlo: "diagnostika_bez_treninku", oblast: "aktivace", titulek: `${diagBez.length} po diagnostice ${p.diagBezTreninkuHodin} h bez tréninku`, proc: "Diagnostiku udělali, první trénink ne. Připomínka s nejslabším tématem jim dá jasný další krok.", lide: diagBez.map((z) => z.id), akce: { typ: "email", text: "Poslat připomínku", sablona: "plan" } });

  // Návrat: aktivní žák (aspoň 3 dny tréninku za 3 týdny) X dní netrénoval
  const prestali = zaci.filter((z) => {
    if (!z.posledni_aktivita) return false;
    const od = dnyMezi(z.posledni_aktivita, dnes);
    if (od < p.prestalDni || od > 21) return false;
    let pred = 0; for (const d of dny.get(z.id) ?? []) if (dnyMezi(d, dnes) <= 24) pred++;
    return pred >= 3;
  });
  pridej({ pravidlo: "prestal", oblast: "navrat", titulek: `${prestali.length} ${prestali.length === 1 ? "aktivní žák přestal" : "aktivní žáci přestali"} trénovat`, proc: `Dřív trénovali aspoň 3 dny, teď ${p.prestalDni}+ dní nic. Osobní zpráva teď funguje líp než za měsíc.`, lide: prestali.map((z) => z.id), akce: { typ: "email", text: "Poslat zprávu", sablona: "styska" } }, 1.2);

  // Peníze: ruční nebo zkušební Premium končí do X dní
  const konci = zaci.filter((z) => z.premium !== "zdarma" && z.premium !== "stripe" && z.premium_do && Date.parse(z.premium_do) - ted <= p.premiumKonciDni * 24 * H && Date.parse(z.premium_do) > ted);
  pridej({ pravidlo: "premium_konci", oblast: "penize", titulek: `Premium končí do ${p.premiumKonciDni} dní (${konci.length})`, proc: "Prodluž, nebo nech skončit. Žák po konci ztratí přístup k zamčeným tématům.", lide: konci.map((z) => z.id), akce: { typ: "odkaz", text: konci.length === 1 ? "Otevřít žáka" : "Otevřít seznam", href: konci.length === 1 ? `/admin/novy/zaci/${konci[0].id}` : `/admin/novy/zaci?segment=premium` } }, 1.3);

  // Obsah: oblast po limitu čerstvosti (kokpit obsahu)
  for (const c of cerstvost(dnes).filter((x) => x.stav === "zle")) {
    pridej({ pravidlo: `cerstvost_${c.oblast}`, oblast: "obsah", titulek: `${c.nazev}: ${c.dni === null ? "zatím žádná novinka" : `${c.dni} dní bez novinky`}`, proc: `Limit je ${c.limit} dní. Novinky drží žáky v appce a ukazují se na úvodní stránce.`, lide: [], akce: { typ: "ukol", text: "Naplánovat novinku", ukol: `Novinka: ${c.nazev}` } }, 0.8);
  }

  // Růst: registraci otevřelo 20+ lidí, odeslalo pod 20 % (7 dní, anonymní denní otisky)
  if (!k.demo && supabaseAdmin) {
    const od = new Date(ted - 7 * 24 * H).toISOString();
    const [{ data: otevreli }, { data: odeslali }] = await Promise.all([
      supabaseAdmin.from("analytics_events").select("properties").eq("event_name", "page_viewed").gte("created_at", od).like("properties->>cesta", "/registrace%").limit(1000),
      supabaseAdmin.from("analytics_events").select("properties").in("event_name", ["signup_submitted", "signup_google_started"]).gte("created_at", od).limit(1000),
    ]);
    const v = (r: { properties: unknown }[] | null) => new Set((r ?? []).map((x) => (x.properties as Record<string, string> | null)?.v).filter(Boolean)).size;
    const o = v(otevreli), s = v(odeslali);
    if (o >= p.registraceMinOtevreni && (s / o) * 100 < p.registraceMinPodil) {
      pridej({ pravidlo: "registrace_konverze", oblast: "rust", titulek: `Registrace: ${o} otevřelo, ${s} odeslalo (7 dní)`, proc: "Většina přišla rovnou z reklamy a odešla do pár sekund. Zkontroluj umístění reklamy (Audience Network) a pole, u kterého lidé končí.", lide: [], akce: { typ: "odkaz", text: "Kde lidé končí", href: "/admin/navstevnost" } }, 1.5);
    }
  }

  // Učení (fáze B3): podezřelé / moc těžké / přeskakované úlohy, moc těžké téma u žáka, zapomínání stejných úloh
  try {
    const [odp, karty, kontroly] = await Promise.all([nactiOdpovedi(k, { od: new Date(ted - 30 * 24 * H).toISOString() }), nactiKarty(k), kontrolyUloh(k.demo)]);
    const pocitane = new Set(zaci.map((z) => z.id));
    const o = odp.filter((r) => pocitane.has(r.user_id));
    const potlacene = potlaceneUlohy(kontroly, o);
    for (const u of statUloh(o).filter((x) => !potlacene.has(x.uloha_id) && x.priznaky.some((p) => p === "podezrela" || p === "tezka" || p === "preskakovana")).slice(0, 3)) {
      const p = u.priznaky.includes("podezrela") ? "podezrela" : u.priznaky.includes("tezka") ? "tezka" : "preskakovana";
      pridej({ pravidlo: `uloha_${u.uloha_id}`, oblast: "obsah", titulek: `Úloha ${u.uloha_id}: ${NAZVY_PRIZNAKU[p]}`, proc: p === "podezrela" && u.spatna ? `„${u.spatna.odpoved}“ ${u.spatna.pocet}×, správně jen ${u.spravnaPocet}× (${u.pokusy} pokusů). Nejspíš chybí přijímaný tvar nebo je zadání nejasné.` : `${POPISY_PRIZNAKU[p]} Teď ${u.spravne} z ${u.pokusy} na první pokus, přeskočeno ${u.preskoceno}.`, lide: [], akce: { typ: "odkaz", text: "Zkontrolovat úlohu", href: `/admin/novy/uceni/uloha/${encodeURIComponent(u.uloha_id)}` } }, p === "podezrela" ? 1.6 : 1.1);
    }
    const tezke: string[] = [];
    const podleZaka = new Map<string, typeof o>();
    for (const r of o) podleZaka.set(r.user_id, [...(podleZaka.get(r.user_id) ?? []), r]);
    for (const [uid, rr] of podleZaka) if (tematZaka(rr, o).some((t) => t.obtiznost === "tezke")) tezke.push(uid);
    pridej({ pravidlo: "uceni_tezke", oblast: "uceni", titulek: `${tezke.length} ${tezke.length === 1 ? "žák má" : "žáci mají"} téma moc těžké`, proc: "V posledních 20 odpovědích v tématu pod 50 % správně nebo přes 30 % přeskočeno. Pomůže vysvětlení, videolekce nebo lehčí úlohy.", lide: tezke, akce: tezke.length === 1 ? { typ: "odkaz", text: "Otevřít učení žáka", href: `/admin/novy/zaci/${tezke[0]}?tab=uceni` } : { typ: "odkaz", text: "Otevřít žáky", href: `/admin/novy/zaci?ids=${tezke.join(",")}` } });
    const zap = opakovani(karty.filter((c) => pocitane.has(c.user_id)), o).zapomina;
    const zapLide = [...new Set(zap.map((x) => x.user_id))];
    pridej({ pravidlo: "zapomina", oblast: "uceni", titulek: `${zapLide.length} ${zapLide.length === 1 ? "žák zapomíná" : "žáci zapomínají"} stejné úlohy`, proc: `Aspoň ${PRAHY_UCENI.zapominaNeuspechu}× neúspěch u stejné úlohy v opakování (${zap.slice(0, 3).map((x) => x.uloha_id).join(", ")}). Pomůže vysvětlení nebo videolekce.`, lide: zapLide, akce: { typ: "odkaz", text: "Otevřít Opakování", href: "/admin/novy/uceni?tab=opakovani" } });
  } catch (e) { if (!(e instanceof ChybiMigraceUceni)) console.error("[doporuceni] učení", e); }

  // Zprávy: zpětná vazba za 7 dní
  if (!k.demo && supabaseAdmin) {
    const { data: fb } = await supabaseAdmin.from("user_feedback").select("user_id, created_at").gte("created_at", new Date(ted - 7 * 24 * H).toISOString()).limit(200);
    const ids = new Set(zaci.map((z) => z.id));
    const lide = [...new Set((fb ?? []).map((r) => r.user_id as string).filter((u) => u && ids.has(u)))];
    if (lide.length) pridej({ pravidlo: "zpetna_vazba", oblast: "zpravy", titulek: `Zpětná vazba za týden (${lide.length})`, proc: "Žáci napsali, co se jim líbí nebo co chybí. Schránka s odpovídáním přijde ve fázi B.", lide, akce: { typ: "odkaz", text: "Otevřít žáky", href: `/admin/novy/zaci?ids=${lide.join(",")}` } });
  }

  return out.sort((a, b) => b.priorita - a.priorita);
}

export interface StavDoporuceni { klic: string; stav: "hotovo" | "odlozeno" | "skryto" | null; do_kdy: string | null; palec: number | null }

/** Načte stavy a vyřadí vyřízené (vrátí se po 3 dnech, když podmínka trvá), odložené do data a skryté. */
export async function filtrujPodleStavu(seznam: Doporuceni[], k: Kontext): Promise<{ aktivni: Doporuceni[]; stavy: Map<string, StavDoporuceni> }> {
  if (k.demo || !supabaseAdmin || !seznam.length) return { aktivni: seznam, stavy: new Map() };
  const { data } = await supabaseAdmin.from("admin_doporuceni_stav").select("klic, stav, do_kdy, palec").in("klic", seznam.map((d) => d.klic));
  const stavy = new Map(((data ?? []) as StavDoporuceni[]).map((s) => [s.klic, s]));
  const ted = Date.now();
  const aktivni = seznam.filter((d) => {
    const s = stavy.get(d.klic);
    if (!s?.stav) return true;
    if (s.stav === "skryto") return false;
    return !!s.do_kdy && Date.parse(s.do_kdy) <= ted;
  });
  return { aktivni, stavy };
}

export const prvniDenOd = (z: Zak) => denZ(z.registrace);
