"use server";

/**
 * Akce Schránky a Zpráv (fáze B2). Každá akce: ověří admina, v e2e testech nic nezapíše, zapíše se do auditu.
 * Odpověď z adminu je nová e-mailová funkce: v testovacím režimu (výchozí) přijde na adresu admina s TEST v předmětu.
 */
import { refresh } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zapisAudit } from "@/lib/admin-audit";
import { vyzadujAdmina, jeE2e } from "@/lib/admin2/auth";
import { nactiNastaveni } from "@/lib/admin2/nastaveni";
import { esc, sestavHtml, sestavText, type ObsahEmailu } from "@/lib/emaily/sablona";
import { adresaOdpovedi, posliResend } from "@/lib/zpravy-log";
import { NAZVY, obsahEmailu, type EmailZaka } from "@/lib/emaily/katalog";
import { posliEmailZakovi } from "@/lib/emaily/odeslat";
import { pragueDateStr } from "@/lib/date";
import { vylouceniZLogu } from "@/lib/admin2/zpravy";

const db = () => { if (!supabaseAdmin) throw new Error("Chybí service role"); return supabaseAdmin; };
const OD = "Karel z MateMaxu <noreply@matematika-snadno.cz>";

export async function vyridPolozku(id: number, stav: "nove" | "vyrizeno"): Promise<"nove" | "vyrizeno"> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const { data: p } = await db().from("schranka").select("stav, user_id").eq("id", id).maybeSingle();
  if (!p) throw new Error("Položka nenalezena");
  const { error } = await db().from("schranka").update({ stav, vyrizeno_at: stav === "vyrizeno" ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw new Error(error.message);
  await zapisAudit({ adminId: admin.id, akce: "schranka_zmenena", cilUserId: (p.user_id as string | null) ?? null, detail: { id, stav } });
  refresh();
  return p.stav as "nove" | "vyrizeno";
}

/** Otevření zvonku: všechna dosavadní upozornění jsou přečtená. */
export async function oznacUpozorneniPrectena(): Promise<void> {
  await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  await db().from("admin_nastaveni").upsert({ klic: "upozorneni_precteno", hodnota: { cas: new Date().toISOString() }, upraveno_at: new Date().toISOString() });
}

/** Konec večerního kolečka: souhrn do auditu (podle něj admin pozná, jestli kolečko používáš a jak dlouho trvá). */
export async function dokonciKolecko(s: { hotovo: number; odlozeno: number; preskoceno: number; minut: number }): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  const cislo = (x: unknown) => Math.max(0, Math.min(500, Math.round(Number(x) || 0)));
  await zapisAudit({ adminId: admin.id, akce: "kolecko_dokonceno", detail: { hotovo: cislo(s.hotovo), odlozeno: cislo(s.odlozeno), preskoceno: cislo(s.preskoceno), minut: cislo(s.minut) } });
}

export async function polozkaNaUkol(id: number): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  const { data: p } = await db().from("schranka").select("druh, user_id, text, uloha_id").eq("id", id).maybeSingle();
  if (!p) throw new Error("Položka nenalezena");
  const nazev = p.druh === "chyba_ulohy" ? `Zkontrolovat úlohu ${p.uloha_id ?? ""}`.trim() : p.druh === "zpetna_vazba" ? "Zpětná vazba: " + String(p.text ?? "").slice(0, 60) : "Odpovědět: " + String(p.text ?? "").slice(0, 60);
  const { error } = await db().from("admin_ukoly").insert({ nazev: nazev.slice(0, 200), popis: String(p.text ?? "").slice(0, 4000) || null, zaci: p.user_id ? [p.user_id] : [], zdroj: `schranka:${id}`, tento_tyden: true });
  if (error) throw new Error(error.message);
  await db().from("schranka").update({ stav: "vyrizeno", vyrizeno_at: new Date().toISOString() }).eq("id", id);
  await zapisAudit({ adminId: admin.id, akce: "ukol_zmenen", cilUserId: (p.user_id as string | null) ?? null, detail: { akce: "ze_schranky", id } });
  refresh();
}

// ── Hromadné odeslání (ZP-12) ──

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STROP_RESEND_DEN = 100;
const MAX_NAJEDNOU = 50;

/** Testovací ukázka šablony na adresu admina (vždy, i při zapnutém ostrém režimu). */
export async function posliTestHromadne(sablona: EmailZaka, trida: 5 | 9, pocet: number): Promise<{ ok: boolean; zprava: string }> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  if (!(sablona in NAZVY)) throw new Error("Neznámá šablona");
  const o = obsahEmailu(sablona, { trida, dnes: pragueDateStr() });
  const t = { ...o, predmet: `TEST: ${o.predmet} (hromadně pro ${pocet} ${pocet === 1 ? "žáka" : "žáků"})` };
  const r = await posliResend({ from: "MateMax Admin (TEST) <noreply@matematika-snadno.cz>", to: admin.email!, subject: t.predmet, html: sestavHtml(t), text: sestavText(t), tags: [{ name: "email", value: "admin_test" }] }, { sablona: "admin_test", prijemceTyp: "admin", testovaci: true });
  await zapisAudit({ adminId: admin.id, akce: "email_odeslan_rucne", detail: { sablona, rezim: "test", hromadne: true, pocet } });
  return { ok: r.ok, zprava: r.ok ? "Ukázka přišla na tvou adresu." : "Ukázku se nepodařilo odeslat." };
}

export interface VysledekHromadne { odeslano: number; preskoceno: number; chyby: number; zprava: string }

/**
 * Ostré hromadné odeslání: jen se zapnutým ostrým režimem, po testu a potvrzení. Přeskočí odhlášené, bez e-mailu,
 * s vráceným e-mailem a ty, kdo stejnou šablonu dostali v posledních 7 dnech (ochrana proti dvojímu odeslání).
 * Najednou nejvýš 50 a nikdy přes denní strop Resendu.
 */
export async function odesliHromadne(userIds: string[], sablona: EmailZaka, potvrzeno: boolean): Promise<VysledekHromadne> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  if (!(sablona in NAZVY)) throw new Error("Neznámá šablona");
  const n = await nactiNastaveni();
  if (!n.emailyNaostro) throw new Error("Ostrý režim e-mailů je vypnutý (Systém → Nastavení). Zatím jde poslat jen test.");
  if (!potvrzeno) throw new Error("Potvrď odeslání.");
  const { count } = await db().from("zpravy").select("id", { count: "exact", head: true }).eq("kanal", "email").gte("odeslano_at", new Date(Date.now() - 86400000).toISOString());
  const zbyva = Math.max(0, STROP_RESEND_DEN - (count ?? 0) - 5); // 5 e-mailů rezerva na registrace a reset hesla
  const ids = [...new Set(userIds.filter((x) => UUID.test(x)))].slice(0, Math.min(MAX_NAJEDNOU, zbyva));
  if (!ids.length) throw new Error(zbyva === 0 ? "Dnešní strop Resendu je vyčerpaný, zkus to zítra." : "Nikdo vybraný.");
  const { nedavno, problem } = await vylouceniZLogu(ids, sablona);
  const dnes = pragueDateStr();
  let odeslano = 0, preskoceno = userIds.length - ids.length, chyby = 0;
  for (const id of ids) {
    if (nedavno.has(id) || problem.has(id)) { preskoceno++; continue; }
    const { data } = await db().auth.admin.getUserById(id);
    const u = data.user;
    if (!u?.email || (u.app_metadata as Record<string, { odhlaseno?: boolean }> | undefined)?.emaily?.odhlaseno) { preskoceno++; continue; }
    const r = await posliEmailZakovi(u, sablona, { trida: Number(u.user_metadata?.trida) === 5 ? 5 : 9, dnes });
    if (r.ok) odeslano++; else chyby++;
  }
  await zapisAudit({ adminId: admin.id, akce: "hromadne_odeslano", detail: { sablona, vybrano: userIds.length, odeslano, preskoceno, chyby } });
  refresh();
  return { odeslano, preskoceno, chyby, zprava: `Odesláno ${odeslano}, přeskočeno ${preskoceno}${chyby ? `, chyby ${chyby}` : ""}.${userIds.length > ids.length ? " Zbytek pošli zítra (strop Resendu)." : ""}` };
}

export interface VysledekOdpovedi { rezim: "test" | "ostry"; ok: boolean; zprava: string }

/** Odpověď na položku Schránky. Komu: odesílatel odpovědi, jinak e-mail žáka. */
export async function odpovez(id: number, text: string, potvrzeno: boolean): Promise<VysledekOdpovedi> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  const t = text.trim().slice(0, 4000);
  if (!t) throw new Error("Napiš text odpovědi.");
  const { data: p } = await db().from("schranka").select("druh, user_id, od, predmet").eq("id", id).maybeSingle();
  if (!p) throw new Error("Položka nenalezena");
  let komu = (p.od as string | null) ?? null;
  if (!komu && p.user_id) { const { data } = await db().auth.admin.getUserById(p.user_id as string); komu = data.user?.email ?? null; }
  if (!komu) throw new Error("Není komu odpovědět (žák nemá e-mail).");
  const predmet = (p.predmet ? (String(p.predmet).startsWith("Re:") ? String(p.predmet) : `Re: ${p.predmet}`) : "Odpověď z MateMaxu").slice(0, 120);
  const obsah: ObsahEmailu = { predmet, pre: t.slice(0, 90), nadpis: predmet.replace(/^Re:\s*/, ""), odstavce: t.split(/\n{2,}/).map((x) => esc(x).replace(/\n/g, "<br>")), img: "uvitani", bezOdhlaseni: true, pata: "Karel Tůma · MateMax. Na tento e-mail jde rovnou odpovědět." };
  const n = await nactiNastaveni();
  const naostro = n.emailyNaostro;
  if (naostro && !potvrzeno) throw new Error("Potvrď odeslání.");
  const o = naostro ? obsah : { ...obsah, predmet: `TEST: ${obsah.predmet} (pro ${p.druh === "odpoved" ? "odesílatele" : "žáka"})` };
  const r = await posliResend({ from: OD, to: naostro ? komu : admin.email!, replyTo: adresaOdpovedi(), subject: o.predmet, html: sestavHtml(o), text: sestavText(o), tags: [{ name: "email", value: "odpoved_admin" }] },
    { sablona: "odpoved_admin", prijemceTyp: naostro ? (p.druh === "odpoved" && p.user_id ? "zak" : "jiny") : "admin", userId: (p.user_id as string | null) ?? null, testovaci: !naostro });
  if (r.ok && naostro) await db().from("schranka").update({ stav: "vyrizeno", vyrizeno_at: new Date().toISOString(), detail: { odpovezeno: new Date().toISOString(), zprava_id: r.zpravaId } }).eq("id", id);
  await zapisAudit({ adminId: admin.id, akce: "email_odeslan_rucne", cilUserId: (p.user_id as string | null) ?? null, detail: { schranka: id, rezim: naostro ? "ostry" : "test" }, vysledek: r.ok ? "ok" : "chyba" });
  refresh();
  return { rezim: naostro ? "ostry" : "test", ok: r.ok, zprava: !r.ok ? `Odpověď se nepodařilo odeslat (${r.chyba ?? "Resend"}).` : naostro ? "Odpověď odešla a položka je vyřízená." : "Testovací režim: odpověď přišla na tvou adresu, nikomu jinému nic neodešlo." };
}
