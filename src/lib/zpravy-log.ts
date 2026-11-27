import crypto from "crypto";
import type { CreateEmailOptions } from "resend";
import { supabaseAdmin } from "./supabase-admin";

/**
 * Log zpráv (admin 2.1, ZP-01). Každý e-mail přes Resend, push i vzkaz se zapíše do tabulky `zpravy`,
 * stavy z webhooků do `zpravy_stav`. Když tabulka ještě není (migrace 20261128_admin_b1), odeslání
 * proběhne beze změny a log se jen přeskočí: log nesmí nikdy zastavit odeslání.
 */

export type PrijemceTyp = "zak" | "rodic" | "admin" | "jiny";
export interface ZaznamZpravy {
  sablona: string;
  prijemceTyp: PrijemceTyp;
  userId?: string | null;
  testovaci?: boolean;
}

/** Adresa pro odpovědi. Po nastavení příjmu e-mailů na poddoméně (ODPOVEDI_ADRESA) chodí odpovědi do Schránky adminu. */
export function adresaOdpovedi(): string {
  return process.env.ODPOVEDI_ADRESA || "karel.tuma@matematika-snadno.cz";
}

/** Stavy zprávy a jejich pořadí: horší stav (vráceno, spam) přepíše lepší, lepší nikdy nespadne na horší. */
export const STAVY: Record<string, { nazev: string; rad: number; spatny?: boolean }> = {
  odeslano: { nazev: "Odesláno", rad: 1 },
  zpozdeno: { nazev: "Zpožděno", rad: 2 },
  doruceno: { nazev: "Doručeno", rad: 3 },
  zobrazeno: { nazev: "Zobrazeno", rad: 4 },
  otevreno: { nazev: "Otevřeno", rad: 4 },
  kliknuto: { nazev: "Kliknuto", rad: 5 },
  odpovezeno: { nazev: "Odpověděl", rad: 6 },
  selhalo: { nazev: "Neodešlo", rad: 9, spatny: true },
  vraceno: { nazev: "Vráceno", rad: 9, spatny: true },
  potlaceno: { nazev: "Potlačeno", rad: 9, spatny: true },
  spam: { nazev: "Označeno jako spam", rad: 10, spatny: true },
};

export function lepsiStav(stary: string, novy: string): string {
  const a = STAVY[stary], b = STAVY[novy];
  if (!b) return stary;
  if (!a) return novy;
  if (a.spatny && !b.spatny) return stary;
  return b.rad >= a.rad ? novy : stary;
}

function bezParametru(odkaz: string): string {
  try { const u = new URL(odkaz); return `${u.host}${u.pathname}`.slice(0, 300); } catch { return odkaz.split("?")[0].slice(0, 300); }
}

async function vlozZpravu(radek: Record<string, unknown>): Promise<void> {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin.from("zpravy").insert(radek);
  if (error && !/relation .*zpravy|schema cache/i.test(error.message)) console.warn("[zpravy] zápis selhal:", error.message);
}

/**
 * Odešle e-mail přes Resend a zapíše ho do logu. Vrací ok, ID u Resendu a ID v logu.
 * Do štítků přidá `z` = ID v logu, aby webhook zprávu našel, i kdyby dorazil dřív než zápis.
 */
export async function posliResend(email: CreateEmailOptions, z: ZaznamZpravy): Promise<{ ok: boolean; id?: string; zpravaId: string; chyba?: string }> {
  const zpravaId = crypto.randomUUID();
  const prijemce = (Array.isArray(email.to) ? email.to[0] : email.to) ?? null;
  if (!process.env.RESEND_API_KEY) return { ok: false, zpravaId, chyba: "RESEND_API_KEY chybí" };
  const tags = [...(email.tags ?? []).filter((t) => t.name !== "z"), { name: "z", value: zpravaId }];
  let id: string | undefined, chyba: string | undefined;
  try {
    const { Resend } = await import("resend");
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ ...email, tags } as CreateEmailOptions);
    if (error) chyba = error.message; else id = data?.id;
  } catch (e) {
    chyba = e instanceof Error ? e.message : String(e);
  }
  await vlozZpravu({
    id: zpravaId, kanal: "email", sluzba: "resend", sablona: z.sablona.slice(0, 60), predmet: (email.subject ?? "").slice(0, 300),
    prijemce_typ: z.prijemceTyp, user_id: z.userId ?? null, prijemce: prijemce?.slice(0, 320) ?? null, sluzba_id: id ?? null,
    stav: chyba ? "selhalo" : "odeslano", testovaci: !!z.testovaci, chyba: chyba?.slice(0, 500) ?? null,
  });
  return { ok: !chyba, id, zpravaId, chyba };
}

/** Zapíše odeslaný push (jeden řádek na odběr). Vrací ID, které jde do payloadu, aby service worker mohl nahlásit zobrazení a klik. */
export async function zapisPush(z: ZaznamZpravy & { predmet: string; ok: boolean; chyba?: string }, zpravaId: string = crypto.randomUUID()): Promise<string> {
  await vlozZpravu({
    id: zpravaId, kanal: "push", sluzba: "webpush", sablona: z.sablona.slice(0, 60), predmet: z.predmet.slice(0, 300),
    prijemce_typ: z.prijemceTyp, user_id: z.userId ?? null, stav: z.ok ? "odeslano" : "selhalo", testovaci: !!z.testovaci,
    chyba: z.chyba?.slice(0, 500) ?? null,
  });
  return zpravaId;
}

/**
 * Nový stav zprávy (z webhooku Resendu nebo z service workeru). Najde zprávu podle ID v logu, jinak podle ID u služby.
 * Vrací false, když zpráva v logu není (webhook se pak zkusí znovu).
 */
export async function zapisStav(kde: { zpravaId?: string | null; sluzbaId?: string | null }, stav: string, cas: string, detail?: string | null): Promise<boolean> {
  if (!supabaseAdmin) return false;
  let q = supabaseAdmin.from("zpravy").select("id, stav");
  if (kde.zpravaId && /^[0-9a-f-]{36}$/i.test(kde.zpravaId)) q = q.eq("id", kde.zpravaId);
  else if (kde.sluzbaId) q = q.eq("sluzba_id", kde.sluzbaId);
  else return false;
  const { data } = await q.maybeSingle();
  if (!data) return false;
  const d = stav === "kliknuto" && detail ? bezParametru(detail) : detail?.slice(0, 300) ?? null;
  await supabaseAdmin.from("zpravy_stav").insert({ zprava_id: data.id, stav, detail: d, cas });
  const novy = lepsiStav(data.stav as string, stav);
  if (novy !== data.stav) await supabaseAdmin.from("zpravy").update({ stav: novy, stav_at: cas }).eq("id", data.id);
  return true;
}

/**
 * Příchozí webhook proti duplicitám (SY-04). Vrátí „novy“, když se má zpracovat, „duplicita“, když už je zpracovaný.
 * Bez tabulky (před migrací) vrátí „novy“, ať webhook funguje jako dřív.
 */
export async function prijmiWebhook(zdroj: "resend" | "stripe", udalostId: string, typ: string, telo: unknown): Promise<"novy" | "duplicita"> {
  if (!supabaseAdmin || !udalostId) return "novy";
  const { data: byl } = await supabaseAdmin.from("webhooky").select("id, stav, pokusy").eq("zdroj", zdroj).eq("udalost_id", udalostId).maybeSingle();
  if (byl) {
    if (byl.stav === "zpracovano" || byl.stav === "ignorovano") return "duplicita";
    await supabaseAdmin.from("webhooky").update({ pokusy: (byl.pokusy as number) + 1 }).eq("id", byl.id);
    return "novy";
  }
  await supabaseAdmin.from("webhooky").insert({ zdroj, udalost_id: udalostId.slice(0, 120), typ: typ.slice(0, 80), telo });
  return "novy";
}

export async function dokonciWebhook(zdroj: "resend" | "stripe", udalostId: string, stav: "zpracovano" | "ignorovano" | "chyba", chyba?: string): Promise<void> {
  if (!supabaseAdmin || !udalostId) return;
  await supabaseAdmin.from("webhooky").update({ stav, chyba: chyba?.slice(0, 500) ?? null, zpracovano_at: new Date().toISOString() }).eq("zdroj", zdroj).eq("udalost_id", udalostId);
}
