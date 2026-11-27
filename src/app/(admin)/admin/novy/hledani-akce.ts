"use server";

/**
 * Hledání a příkazy (KO-04): žáci (jméno, přezdívka, e-mail), rodiče, úkoly a úlohy (ID, text).
 * Výsledky seskupené podle typu. V režimu sdílení se jména a e-maily nevracejí.
 */
import { vyzadujAdmina } from "@/lib/admin2/auth";
import { kontext, nactiZaky } from "@/lib/admin2/data";
import { pseudonymy, zobraz } from "@/lib/admin2/sdileni";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { allExamples } from "@/data/examples";
import { TEMA_LABELS } from "@/types";

export interface Vysledek { typ: "zak" | "rodic" | "ukol" | "uloha"; nazev: string; popis: string; href: string }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

export async function hledej(dotaz: string): Promise<Vysledek[]> {
  await vyzadujAdmina();
  const q = norm(dotaz.trim());
  if (q.length < 2) return [];
  const k = await kontext();
  const zaci = await nactiZaky(k);
  const ps = pseudonymy(zaci);
  const out: Vysledek[] = [];

  for (const z of zaci) {
    const zz = zobraz(z, k.sdileni, ps);
    const pole = k.sdileni ? [zz.jmeno] : [z.jmeno ?? "", z.email ?? "", z.prezdivka ?? "", z.id];
    if (pole.some((x) => norm(x).includes(q))) out.push({ typ: "zak", nazev: zz.jmeno, popis: `${z.trida}. třída · ${k.sdileni ? "" : zz.email}`, href: `/admin/novy/zaci/${z.id}` });
    if (out.length >= 8) break;
  }
  if (!k.sdileni) {
    for (const z of zaci.filter((x) => x.rodic_email && norm(x.rodic_email).includes(q)).slice(0, 4)) {
      out.push({ typ: "rodic", nazev: z.rodic_email!, popis: `rodič žáka ${zobraz(z, false, ps).jmeno}`, href: `/admin/novy/zaci/${z.id}` });
    }
  }
  if (!k.demo && supabaseAdmin) {
    const { data } = await supabaseAdmin.from("admin_ukoly").select("id, nazev, stav").ilike("nazev", `%${dotaz.trim().slice(0, 60)}%`).limit(5);
    for (const u of data ?? []) out.push({ typ: "ukol", nazev: u.nazev as string, popis: `úkol · ${u.stav}`, href: `/admin/novy/plan#ukol-${u.id}` });
  }
  let n = 0;
  for (const e of allExamples) {
    if (n >= 6) break;
    if (norm(e.id).includes(q) || (q.length >= 4 && norm(e.zadani ?? "").includes(q))) {
      out.push({ typ: "uloha", nazev: e.id, popis: `${(TEMA_LABELS as Record<string, string>)[e.tema] ?? e.tema} · ${(e.zadani ?? "").replace(/\$|\\[a-z]+|[{}]/g, " ").replace(/\s+/g, " ").slice(0, 70)}`, href: `/nahled?ids=${encodeURIComponent(e.id)}` });
      n++;
    }
  }
  return out;
}
