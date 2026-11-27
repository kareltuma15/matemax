/**
 * Herní prvky a krystaly (fáze B4, UC-11). Zdroj: user_sbirka.state (Hexíkova Sbírka). Využití se ukazuje jako
 * „2 ze 4 aktivních“ s odkazem na žáky. Aktivní = trénoval v posledních 30 dnech. Sbírka se ukládá od listopadu 2026.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { najdiOdmenu, type SbirkaStav } from "@/lib/sbirka";
import type { Kontext } from "./data";
import type { Zak } from "./typy";

export interface PrvekHry { klic: string; nazev: string; lide: string[] }
export interface StavHry { aktivni: string[]; prvky: PrvekHry[]; ziskano: number; utraceno: number; zustatky: { id: string; zustatek: number }[]; oblibene: { nazev: string; lide: number }[]; navrat: { sOdmenou: [number, number]; bez: [number, number] } }

type S = Partial<SbirkaStav>;

export async function nactiSbirky(k: Kontext, zaci: Zak[]): Promise<Map<string, S>> {
  const m = new Map<string, S>();
  if (k.demo) {
    zaci.forEach((z, i) => { if (i % 3 === 2) return; m.set(z.id, { ziskano: 120 + i * 37, utraceno: i % 2 ? 100 : 0, mam: i % 2 ? ["k9-cepice-zimni", "k9-satek"] : [], otevreno: i % 4, nasazeno: i % 2 ? { 9: { cepice: "x" } } as S["nasazeno"] : {}, mise: { d: "", hotove: [], serie: i % 3, maxSerie: i % 5, tezke: 0 }, boss: { pokusy: i % 3 ? ["2026-11-23"] : [], porazeno: [] }, sady: i % 5 === 0 ? { advent: "2026-11-20" } : {}, trofeje: i % 2 ? { prvni: "2026-11-10" } : {} }); });
    return m;
  }
  if (!supabaseAdmin) return m;
  const pocitani = new Set(zaci.map((z) => z.id));
  for (let i = 0; i < 20_000; i += 1000) {
    const { data, error } = await supabaseAdmin.from("user_sbirka").select("user_id, state").range(i, i + 999);
    if (error) break;
    for (const r of data ?? []) if (pocitani.has(r.user_id as string)) m.set(r.user_id as string, (r.state ?? {}) as S);
    if ((data ?? []).length < 1000) break;
  }
  return m;
}

export function stavHry(zaci: Zak[], sbirky: Map<string, S>, dnes: string): StavHry {
  const aktivni = zaci.filter((z) => z.posledni_aktivita && Date.parse(dnes) - Date.parse(z.posledni_aktivita) <= 30 * 86400000).map((z) => z.id);
  const kdo = (test: (s: S) => boolean) => aktivni.filter((id) => { const s = sbirky.get(id); return !!s && test(s); });
  const prvky: PrvekHry[] = [
    { klic: "truhly", nazev: "Otevřel truhlu", lide: kdo((s) => (s.otevreno ?? 0) > 0) },
    { klic: "satnik", nazev: "Nasadil věc v šatníku", lide: kdo((s) => Object.values(s.nasazeno ?? {}).some((t) => t && Object.keys(t).length > 0)) },
    { klic: "obchod", nazev: "Koupil něco za krystaly", lide: kdo((s) => (s.utraceno ?? 0) > 0) },
    { klic: "mise", nazev: "Splnil denní misi", lide: kdo((s) => (s.mise?.maxSerie ?? 0) > 0 || (s.mise?.hotove?.length ?? 0) > 0) },
    { klic: "boss", nazev: "Bojoval s bossem týdne", lide: kdo((s) => (s.boss?.pokusy?.length ?? 0) > 0) },
    { klic: "sady", nazev: "Nasbíral půlku nebo celou sadu", lide: kdo((s) => Object.keys(s.sady ?? {}).length > 0 || Object.keys(s.polovinySad ?? {}).length > 0) },
    { klic: "trofeje", nazev: "Má trofej", lide: kdo((s) => Object.keys(s.trofeje ?? {}).length > 0) },
  ];
  let ziskano = 0, utraceno = 0;
  const pocty = new Map<string, number>();
  const zustatky: { id: string; zustatek: number }[] = [];
  for (const [id, s] of sbirky) {
    ziskano += s.ziskano ?? 0; utraceno += s.utraceno ?? 0;
    zustatky.push({ id, zustatek: (s.ziskano ?? 0) - (s.utraceno ?? 0) });
    for (const v of new Set(s.mam ?? [])) pocty.set(v, (pocty.get(v) ?? 0) + 1);
  }
  const oblibene = [...pocty].map(([id, n]) => ({ nazev: najdiOdmenu(id)?.nazev ?? id, lide: n })).sort((a, b) => b.lide - a.lide).slice(0, 6);
  // Vracejí se po odměně? Aktivní v posledních 7 dnech: kdo otevřel truhlu, proti těm, kdo ne (orientační, malý vzorek)
  const tyden = (id: string) => (zaci.find((z) => z.id === id)?.dny_7 ?? 0) > 0;
  const s = aktivni.filter((id) => (sbirky.get(id)?.otevreno ?? 0) > 0), b = aktivni.filter((id) => !((sbirky.get(id)?.otevreno ?? 0) > 0));
  return { aktivni, prvky, ziskano, utraceno, zustatky: zustatky.sort((a, b) => b.zustatek - a.zustatek), oblibene, navrat: { sOdmenou: [s.filter(tyden).length, s.length], bez: [b.filter(tyden).length, b.length] } };
}
