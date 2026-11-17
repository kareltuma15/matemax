/**
 * Odměny z testů nanečisto a Boss týdne (3. etapa Sbírky).
 *
 * Test se započítá třemi cestami (každý den testu jen jednou):
 *  1. kód Generálka, který žák dostane v učebně (ověří /api/sbirka/generalka),
 *  2. výsledek, který do MateMaxu poslala appka Vyhodnocení testů (tabulka vysledky_testy, jen vlastní řádky),
 *  3. podepsaný odkaz na doporučení po testu (DoporuceniPoTestu).
 * Výsledky z Vyhodnocení nesou i body, takže jen u nich jde poznat zlepšení (Legendární truhla).
 */
import type { Trida } from "@/types";
import { supabase } from "./supabase";
import { localDateStr } from "./date";
import { upravSbirku, zapocitejTest, bojSBossem, type OdmenaZaTest } from "./sbirka";

export type VysledekKodu = { ok: true; den: string; odmena: OdmenaZaTest } | { ok: false; duvod: string };

export async function uplatniKodGeneralky(kod: string, trida: Trida): Promise<VysledekKodu> {
  try {
    const res = await fetch("/api/sbirka/generalka", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kod }) });
    const j = (await res.json()) as { ok: boolean; d?: string; duvod?: string };
    if (!j.ok || !j.d) return { ok: false, duvod: j.duvod ?? "neplatny" };
    const den = j.d;
    const odmena = upravSbirku((s) => zapocitejTest(s, trida, den));
    return { ok: true, den, odmena };
  } catch {
    return { ok: false, duvod: "sit" };
  }
}

/** Test z podepsaného odkazu na doporučení (podpis už ověřil server). */
export function zapocitejTestZOdkazu(trida: Trida, den: string): OdmenaZaTest {
  return upravSbirku((s) => zapocitejTest(s, trida, den));
}

/** Načte výsledky z Vyhodnocení testů (jen přihlášený s propojeným účtem) a připíše odměny. */
export async function nactiTestyZVysledku(): Promise<{ nove: number; zlepseni: number }> {
  const out = { nove: 0, zlepseni: 0 };
  if (!supabase) return out;
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return out;
  const { data, error } = await supabase
    .from("vysledky_testy").select("test_d, celkem, g").eq("user_id", uid).order("test_d", { ascending: true });
  if (error || !data) return out;
  for (const r of data as { test_d: string; celkem: number | null; g: string }[]) {
    const trida: Trida = r.g === "m5" ? 5 : 9;
    const o = upravSbirku((s) => zapocitejTest(s, trida, r.test_d, typeof r.celkem === "number" ? r.celkem : null));
    if (o.novy) out.nove++;
    if (o.zlepseni) out.zlepseni++;
  }
  return out;
}

/** Výsledek boje s bossem týdne (jeden pokus za týden). null = tento týden už bojoval. */
export function odmenaZaBosse(spravne: boolean): { vyhra: boolean; krystaly: number } | null {
  return upravSbirku((s) => bojSBossem(s, localDateStr(), spravne));
}
