import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { stripe } from "@/lib/stripe";
import { NAZVY, PRIPOMINKY, type EmailZaka } from "./katalog";
import { jeVyloucenyUcet } from "../admin-data";

/**
 * Analytika e-mailů pro Admin → E-maily (mockup schválený Karlem 25. 11. 2026, docs/emaily-2026-11/analytika-emailu-mockup.html).
 * - odesláno: analytics_events „email_odeslan“ (properties.e = který e-mail)
 * - prokliky: návštěvy s utm_source=email a utm_campaign=<e-mail>, unikátně podle denního otisku návštěvníka
 * - návrat: příjemce (žák, u reportu dítě) měl do 2 dnů od e-mailu trénink (tabulka sessions)
 * - odhlášeno: „email_odhlaseni“ (zak / report)
 * - doručitelnost: „email_dorucitelnost“ z webhooku Resendu (delivered / bounced / complained / opened)
 * Testovací účty (app_metadata.testovaci) se nepočítají.
 */

export type DruhEmailu = "zak" | "servis" | "rodic";
export const EMAILY_ANALYTIKY: { id: string; nazev: string; druh: DruhEmailu; cil: string }[] = [
  { id: "uvitani", nazev: NAZVY.uvitani, druh: "servis", cil: "trenink" },
  ...(["nezacal", "plan", "styska", "spi", "advent"] as EmailZaka[]).map((id) => ({ id, nazev: NAZVY[id], druh: "zak" as const, cil: "trenink" })),
  { id: "report", nazev: "Týdenní report", druh: "rodic", cil: "dite_trenovalo" },
  { id: "pozvanka", nazev: "Pozvánka rodiči", druh: "rodic", cil: "potvrzeno" },
  { id: "premium", nazev: "Vítejte v Premium", druh: "rodic", cil: "propojil_rodice" },
  { id: "platba", nazev: "Platba se nepovedla", druh: "rodic", cil: "zaplaceno" },
];

export interface RadekEmailu {
  id: string; nazev: string; druh: DruhEmailu;
  odeslano: number; prokliky: number | null; cilText: string; cilPodil: number | null; odhlaseno: number | null;
}
export interface AnalytikaEmailu {
  dni: number;
  souhrn: {
    odeslano: number; odeslanoPred: number; zakum: number; rodicum: number;
    prokliky: number; proklikyPred: number;
    navrat: number | null; navratPred: number | null;
    odhlaseno: number; odhlasenoZak: number; odhlasenoReport: number; prijemcu: number;
  };
  postreh: string | null;
  radky: RadekEmailu[];
  poDnech: { den: string; zak: number; servis: number; rodic: number }[];
  trychtyr: { odeslano: number; proklik: number; trenink: number };
  dorucitelnost: { zapnuto: boolean; doruceno: number; nedoruceno: number; spam: number; otevreno: number };
}

type Ev = { created_at: string; user_id: string | null; event_name: string; properties: Record<string, unknown> | null };
const s = (x: unknown) => (typeof x === "string" ? x : undefined);

async function vsechny<T>(dotaz: (od: number, do_: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let od = 0; ; od += 1000) {
    const { data, error } = await dotaz(od, od + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function pridejDny(den: string, n: number): string {
  const d = new Date(den + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function spocitejAnalytikuEmailu(dni: 7 | 30 | 90): Promise<AnalytikaEmailu> {
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const ted = Date.now();
  const od = new Date(ted - dni * 86400000).toISOString();
  const odPred = new Date(ted - 2 * dni * 86400000).toISOString();

  // Testovací účty
  const testovaci = new Set<string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (jeVyloucenyUcet(u)) testovaci.add(u.id);
    if (data.users.length < 1000) break;
  }

  const ev = (await vsechny<Ev>((a, b) => supabaseAdmin!.from("analytics_events")
    .select("created_at, user_id, event_name, properties")
    .in("event_name", ["email_sent", "email_unsubscribed", "email_status_received"])
    .gte("created_at", odPred).order("created_at").range(a, b)))
    .filter((e) => !(e.user_id && testovaci.has(e.user_id)));
  const navstevy = await vsechny<Ev>((a, b) => supabaseAdmin!.from("analytics_events")
    .select("created_at, user_id, event_name, properties")
    .eq("event_name", "page_viewed").eq("properties->>utm_source", "email")
    .gte("created_at", odPred).order("created_at").range(a, b));

  const vObdobi = (e: { created_at: string }) => e.created_at >= od;
  const odeslane = ev.filter((e) => e.event_name === "email_sent");
  const ted_ = odeslane.filter(vObdobi), pred = odeslane.filter((e) => !vObdobi(e));

  // Prokliky: unikátní návštěvník (denní otisk v) za e-mail a den
  const proklikySet = (seznam: Ev[]) => {
    const m = new Map<string, Set<string>>();
    for (const n of seznam) {
      const kam = s(n.properties?.utm_campaign); if (!kam) continue;
      const klic = `${s(n.properties?.v) ?? n.created_at}:${n.created_at.slice(0, 10)}`;
      if (!m.has(kam)) m.set(kam, new Set());
      m.get(kam)!.add(klic);
    }
    return m;
  };
  const proklikyTed = proklikySet(navstevy.filter(vObdobi));
  const proklikyPred = proklikySet(navstevy.filter((e) => !vObdobi(e)));
  const soucet = (m: Map<string, Set<string>>) => [...m.values()].reduce((a, x) => a + x.size, 0);

  // Návrat k tréninku do 2 dnů (příjemce = user_id, u reportu dítě v properties.dite)
  const prijemce = (e: Ev) => s(e.properties?.dite) ?? e.user_id;
  const ucty = [...new Set(odeslane.map(prijemce).filter((x): x is string => !!x))];
  const treninky = new Map<string, Set<string>>();
  if (ucty.length) {
    const odDen = pragueDateStr(new Date(Date.parse(odPred)));
    for (let i = 0; i < ucty.length; i += 200) {
      const rows = await vsechny<{ user_id: string; date: string }>((a, b) => supabaseAdmin!.from("sessions")
        .select("user_id, date").in("user_id", ucty.slice(i, i + 200)).gte("date", odDen).range(a, b));
      for (const r of rows) { if (!treninky.has(r.user_id)) treninky.set(r.user_id, new Set()); treninky.get(r.user_id)!.add(r.date); }
    }
  }
  const vratilSe = (e: Ev) => {
    const u = prijemce(e); if (!u) return false;
    const den = pragueDateStr(new Date(e.created_at));
    const dny = treninky.get(u); if (!dny) return false;
    // trénink ve stejný den až po e-mailu nepoznáme na hodinu, bereme den odeslání + 2 další dny
    return [den, pridejDny(den, 1), pridejDny(den, 2)].some((d) => dny.has(d));
  };
  const podil = (seznam: Ev[]) => (seznam.length ? seznam.filter(vratilSe).length / seznam.length : null);
  const jePripominka = (e: Ev) => PRIPOMINKY.includes(s(e.properties?.e) as EmailZaka);

  // Cíle u e-mailů rodičům
  const odhlaseni = ev.filter((e) => e.event_name === "email_unsubscribed");
  const odhlTed = odhlaseni.filter(vObdobi);
  const { data: potvrzene } = await supabaseAdmin.from("parent_child_link").select("token, verified, verified_at").like("token", "rodic:%");
  const potvrzenoVObdobi = ((potvrzene ?? []) as { verified: boolean; verified_at: string | null }[]).filter((p) => p.verified && p.verified_at && p.verified_at >= od).length;

  const radky: RadekEmailu[] = [];
  for (const def of EMAILY_ANALYTIKY) {
    const moje = ted_.filter((e) => s(e.properties?.e) === def.id);
    const n = moje.length;
    const klik = proklikyTed.get(def.id)?.size ?? 0;
    let cilText = "–", cilPodil: number | null = null;
    if (n) {
      if (def.cil === "trenink" || def.cil === "dite_trenovalo") {
        cilPodil = podil(moje);
        cilText = `${def.cil === "dite_trenovalo" ? "dítě trénovalo: " : ""}${Math.round((cilPodil ?? 0) * 100)} %`;
      } else if (def.cil === "potvrzeno") {
        cilText = `potvrdilo odběr: ${Math.min(potvrzenoVObdobi, n)} z ${n}`;
      } else if (def.cil === "propojil_rodice") {
        const deti = moje.map((e) => e.user_id).filter((x): x is string => !!x);
        let propojeno = 0;
        if (deti.length) {
          const { data } = await supabaseAdmin.from("parent_child_link").select("child_user_id").in("child_user_id", deti).eq("verified", true);
          propojeno = new Set(((data ?? []) as { child_user_id: string }[]).map((d) => d.child_user_id)).size;
        }
        cilText = `propojilo rodiče: ${propojeno} z ${n}`;
      } else if (def.cil === "zaplaceno") {
        let zaplaceno = 0;
        for (const e of moje.slice(0, 20)) {
          const inv = s(e.properties?.faktura);
          if (!inv) continue;
          try { if ((await stripe.invoices.retrieve(inv)).status === "paid") zaplaceno++; } catch { /* faktura nedostupná */ }
        }
        cilText = `zaplaceno: ${zaplaceno} z ${n}`;
      }
    }
    const odhl = def.id === "report" ? odhlTed.filter((e) => s(e.properties?.druh) === "report").length
      : def.druh === "zak" ? odhlTed.filter((e) => s(e.properties?.posledni) === def.id).length : null;
    radky.push({ id: def.id, nazev: def.nazev, druh: def.druh, odeslano: n, prokliky: def.id === "platba" ? null : klik, cilText, cilPodil, odhlaseno: odhl });
  }

  // Postřeh: nejlepší a nejslabší návrat u e-mailů s aspoň 10 odeslanými
  const hodnotitelne = radky.filter((r) => r.cilPodil !== null && r.odeslano >= 10 && r.druh !== "rodic");
  let postreh: string | null = null;
  if (hodnotitelne.length >= 2) {
    const serazene = [...hodnotitelne].sort((a, b) => b.cilPodil! - a.cilPodil!);
    const nej = serazene[0], nejhorsi = serazene[serazene.length - 1];
    postreh = `Nejvíc vrací do appky „${nej.nazev}“: ${Math.round(nej.cilPodil! * 100)} % žáků do 2 dnů trénovalo. Nejslabší je „${nejhorsi.nazev}“ (${Math.round(nejhorsi.cilPodil! * 100)} %).`;
  }

  // Po dnech
  const druhId = new Map(EMAILY_ANALYTIKY.map((d) => [d.id, d.druh]));
  const poDnechMap = new Map<string, { zak: number; servis: number; rodic: number }>();
  for (let i = dni - 1; i >= 0; i--) poDnechMap.set(pragueDateStr(new Date(ted - i * 86400000)), { zak: 0, servis: 0, rodic: 0 });
  for (const e of ted_) {
    const den = pragueDateStr(new Date(e.created_at));
    const radek = poDnechMap.get(den); if (!radek) continue;
    radek[druhId.get(s(e.properties?.e) ?? "") ?? "servis"]++;
  }

  const pripominky = ted_.filter(jePripominka);
  const proklikyPripominek = [...proklikyTed.entries()].filter(([k]) => PRIPOMINKY.includes(k as EmailZaka)).reduce((a, [, v]) => a + v.size, 0);
  const dor = ev.filter((e) => e.event_name === "email_status_received" && vObdobi(e));
  const typ = (t: string) => dor.filter((e) => s(e.properties?.typ) === t).length;
  const prijemcu = new Set(ted_.map((e) => e.user_id ?? s(e.properties?.komu) ?? e.created_at)).size;

  return {
    dni,
    souhrn: {
      odeslano: ted_.length, odeslanoPred: pred.length,
      zakum: ted_.filter((e) => druhId.get(s(e.properties?.e) ?? "") !== "rodic").length,
      rodicum: ted_.filter((e) => druhId.get(s(e.properties?.e) ?? "") === "rodic").length,
      prokliky: soucet(proklikyTed), proklikyPred: soucet(proklikyPred),
      navrat: podil(pripominky), navratPred: podil(pred.filter(jePripominka)),
      odhlaseno: odhlTed.length,
      odhlasenoZak: odhlTed.filter((e) => s(e.properties?.druh) === "zak").length,
      odhlasenoReport: odhlTed.filter((e) => s(e.properties?.druh) === "report").length,
      prijemcu,
    },
    postreh,
    radky,
    poDnech: [...poDnechMap.entries()].map(([den, v]) => ({ den, ...v })),
    trychtyr: { odeslano: pripominky.length, proklik: proklikyPripominek, trenink: pripominky.filter(vratilSe).length },
    dorucitelnost: { zapnuto: !!process.env.RESEND_WEBHOOK_SECRET, doruceno: typ("delivered"), nedoruceno: typ("bounced"), spam: typ("complained"), otevreno: typ("opened") },
  };
}
