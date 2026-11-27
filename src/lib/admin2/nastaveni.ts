/**
 * Nastavení adminu (SY-03): cíle sezóny, prahy stavů a doporučení, názvy kampaní, ostrý režim e-mailů.
 * Uložené v tabulce admin_nastaveni (klíč → JSON). Výchozí hodnoty ze zadání a z roadmapy sezóny.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface CilSezony { klic: string; nazev: string; jednotka: string; milniky: { do: string; od: number; az: number }[]; zdroj: "registrace" | "zaci_testy_ucet" | "kompletni" ; poznamka?: string }

export interface Nastaveni {
  /** Začátek sezóny (počítají se registrace od tohoto dne). */
  sezonaOd: string;
  cile: CilSezony[];
  /** Ručně zadané počty, které appka nevidí (prodané Kompletní přípravy z Wixu). */
  rucne: { kompletni: number };
  /** Stavy žáka (ZA-02): nový do X dní, aktivní = trénink za posledních X dní, usíná do X dní, pak spí. */
  prahy: { novyDni: number; aktivniDni: number; usinaDni: number };
  /** Doporučení (PL-01, výběr pro fázi A). */
  pravidla: { bezDiagnostikyHodin: number; diagBezTreninkuHodin: number; prestalDni: number; premiumKonciDni: number; registraceMinOtevreni: number; registraceMinPodil: number };
  /** Lidské názvy kampaní a zdrojů: kód → název („fb · 1202…“ → „FB reklama Herní systém“). */
  kampane: Record<string, string>;
  /** E-maily z adminu jdou naostro žákům? Výchozí NE: vše jde na adresu admina s TEST v předmětu. */
  emailyNaostro: boolean;
  /** Uložené segmenty žáků (vlastní filtr). */
  segmenty: { nazev: string; dotaz: string }[];
}

export const VYCHOZI: Nastaveni = {
  sezonaOd: "2026-09-01",
  cile: [
    { klic: "registrace", nazev: "Registrace v MateMaxu", jednotka: "žáků", zdroj: "registrace", milniky: [{ do: "2026-12-31", od: 15, az: 25 }, { do: "2027-02-28", od: 25, az: 40 }, { do: "2027-05-15", od: 35, az: 55 }] },
    { klic: "testy_ucet", nazev: "Deváťáci z testů nanečisto s účtem do 7 dní", jednotka: "%", zdroj: "zaci_testy_ucet", milniky: [{ do: "2027-05-15", od: 40, az: 100 }], poznamka: "Počet deváťáků na testech appka zatím nezná (data z Vyhodnocení a Wixu přijdou ve fázi B a D)." },
    { klic: "kompletni", nazev: "Rodiny s Kompletní přípravou", jednotka: "rodin", zdroj: "kompletni", milniky: [{ do: "2027-02-28", od: 3, az: 3 }], poznamka: "Nákupy jsou ve Wixu: počet zadej ručně v nastavení, dokud nebude napojení." },
  ],
  rucne: { kompletni: 0 },
  prahy: { novyDni: 7, aktivniDni: 7, usinaDni: 14 },
  pravidla: { bezDiagnostikyHodin: 24, diagBezTreninkuHodin: 48, prestalDni: 3, premiumKonciDni: 7, registraceMinOtevreni: 20, registraceMinPodil: 20 },
  kampane: {
    "fb · 120250280402450491": "FB reklama: Herní systém (22. 11.)",
    "an · 120250280402450491": "FB reklama: Herní systém, Audience Network",
    "letak · dod-gymnazium-tyn": "Leták: den otevřených dveří Gymnázium Týn",
    facebook: "Facebook (příspěvek)",
    "přímo": "Přímo / neznámo",
  },
  emailyNaostro: false,
  segmenty: [],
};

const KLIC = "nastaveni";

export async function nactiNastaveni(): Promise<Nastaveni> {
  if (!supabaseAdmin) return VYCHOZI;
  const { data, error } = await supabaseAdmin.from("admin_nastaveni").select("hodnota").eq("klic", KLIC).maybeSingle();
  if (error || !data) return VYCHOZI;
  const h = data.hodnota as Partial<Nastaveni>;
  return { ...VYCHOZI, ...h, prahy: { ...VYCHOZI.prahy, ...h.prahy }, pravidla: { ...VYCHOZI.pravidla, ...h.pravidla }, rucne: { ...VYCHOZI.rucne, ...h.rucne }, kampane: { ...VYCHOZI.kampane, ...h.kampane } };
}

export async function ulozNastaveni(n: Nastaveni): Promise<void> {
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const { error } = await supabaseAdmin.from("admin_nastaveni").upsert({ klic: KLIC, hodnota: n, upraveno_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Lidský název zdroje: z tabulky kampaní, jinak sloučení podle začátku („fb · …“ → FB reklama). */
export function nazevZdroje(zdroj: string | null, kampane: Record<string, string>): string {
  if (!zdroj) return "neuvedeno (účet z doby před měřením)";
  if (kampane[zdroj]) return kampane[zdroj];
  const [typ, kampan] = zdroj.split(" · ");
  const typy: Record<string, string> = { fb: "FB reklama", an: "FB reklama (Audience Network)", facebook: "Facebook", instagram: "Instagram", letak: "Leták", vysledky: "Výsledky testu", email: "E-mail", web: "Web" };
  return typy[typ] ? `${typy[typ]}${kampan ? `: ${kampan}` : ""}` : zdroj;
}
