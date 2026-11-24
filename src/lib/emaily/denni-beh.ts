import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { odhadDitete, tridaUzivatele } from "@/lib/odhad-server";
import { krystaly, type SbirkaStav } from "@/lib/sbirka";
import { coPoslat, serie, ZACATEK_SEZONY } from "./rozhodnuti";
import { emailovyStav, posliEmailZakovi } from "./odeslat";
import type { DataZaka, EmailZaka } from "./katalog";

/**
 * Denní běh připomínek (cron 16:00). Projde účty z letošní sezóny, z tréninků a diagnostiky rozhodne, kdo dostane
 * který e-mail (rozhodnuti.ts), doplní skutečná data (odhad, série, krystaly) a pošle. S nanecisto = true nic
 * neposílá, jen vrátí seznam (admin → E-maily, kontrola před ostrým během).
 */

export interface PolozkaBehu { uid: string; email: string; trida: 5 | 9; posle: EmailZaka; vysledek?: string }

async function vsichniUzivatele(): Promise<User[]> {
  const out: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin!.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return out;
}

/** Načte všechny řádky po 1000 (PostgREST jich víc najednou nevrátí). */
async function vsechnyRadky<T>(dotaz: (od: number, do_: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let od = 0; ; od += 1000) {
    const { data, error } = await dotaz(od, od + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function denniBeh(nanecisto: boolean): Promise<{ dnes: string; polozky: PolozkaBehu[] }> {
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const dnes = pragueDateStr();
  const ted = new Date().toISOString();
  const od = pragueDateStr(new Date(Date.now() - 40 * 86400000));

  const uzivatele = (await vsichniUzivatele()).filter((u) => pragueDateStr(new Date(u.created_at)) >= ZACATEK_SEZONY);
  const ids = new Set(uzivatele.map((u) => u.id));

  const [treninky, diagnostiky] = await Promise.all([
    vsechnyRadky<{ user_id: string; date: string }>((a, b) =>
      supabaseAdmin!.from("sessions").select("user_id, date").gte("date", od).order("date").range(a, b)),
    vsechnyRadky<{ user_id: string; updated_at: string }>((a, b) =>
      supabaseAdmin!.from("diagnostic_results").select("user_id, updated_at").order("updated_at").range(a, b)),
  ]);
  const treninkyUctu = new Map<string, string[]>();
  for (const t of treninky) if (ids.has(t.user_id)) treninkyUctu.set(t.user_id, [...(treninkyUctu.get(t.user_id) ?? []), t.date]);
  // Diagnostika: první den, kdy má účet výsledky (řádky po tématech, bereme nejstarší)
  const diagUctu = new Map<string, string>();
  for (const d of diagnostiky) if (ids.has(d.user_id) && !diagUctu.has(d.user_id)) diagUctu.set(d.user_id, pragueDateStr(new Date(d.updated_at)));

  const polozky: PolozkaBehu[] = [];
  for (const u of uzivatele) {
    if (!u.email) continue;
    const dny = treninkyUctu.get(u.id) ?? [];
    const posle = coPoslat({
      registrace: pragueDateStr(new Date(u.created_at)),
      emailPotvrzen: !!u.email_confirmed_at,
      testovaci: !!u.app_metadata?.testovaci,
      diagnostika: diagUctu.get(u.id) ?? null,
      treninky: dny,
      stav: emailovyStav(u),
      dnes, ted,
    });
    if (!posle) continue;
    const trida = tridaUzivatele(u);
    const polozka: PolozkaBehu = { uid: u.id, email: u.email, trida, posle };
    polozky.push(polozka);
    if (nanecisto) continue;

    const data: DataZaka = { trida, dnes };
    if (posle === "plan") {
      const o = await odhadDitete(supabaseAdmin, u, dnes);
      const nej = [...o.temata].sort((a, b) => (b.max - b.body) - (a.max - a.body))[0];
      data.odhad = o.bezDat ? undefined : { celkem: o.celkem, max: o.max, tema: nej && nej.max - nej.body >= 1 ? { klic: nej.tema, label: nej.label } : null };
    }
    if (posle === "styska") {
      const serazene = [...new Set(dny)].sort();
      data.posledniTrenink = serazene[serazene.length - 1];
      data.serie = serie(dny);
      const { data: sb } = await supabaseAdmin.from("user_sbirka").select("state").eq("user_id", u.id).maybeSingle();
      const st = sb?.state as SbirkaStav | undefined;
      if (st && typeof st.ziskano === "number") data.krystaly = krystaly(st);
    }
    const r = await posliEmailZakovi(u, posle, data);
    polozka.vysledek = r.ok ? "odesláno" : `chyba: ${r.chyba}`;
  }
  return { dnes, polozky };
}
