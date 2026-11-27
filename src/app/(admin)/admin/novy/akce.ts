"use server";

/**
 * Serverové akce nového adminu. Každá ověří admina (cookies + druhý faktor) a zapíše se do auditu.
 * Vratné akce vrací data pro „Zpět“ (KO-09), nevratné (smazání účtu) chtějí potvrzení jménem.
 * E-maily: výchozí testovací režim, vše jde na adresu admina s „TEST“ v předmětu (pravidla zadání).
 */
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zapisAudit } from "@/lib/admin-audit";
import { vyzadujAdmina, jeE2e } from "@/lib/admin2/auth";
import { nactiNastaveni, ulozNastaveni, type Nastaveni } from "@/lib/admin2/nastaveni";
import { obsahEmailu, type EmailZaka } from "@/lib/emaily/katalog";
import { sestavHtml, sestavText, esc, type ObsahEmailu } from "@/lib/emaily/sablona";
import { posliEmailZakovi } from "@/lib/emaily/odeslat";
import { pragueDateStr } from "@/lib/date";
import { chybaPrezdivky } from "@/lib/prezdivka";

const db = () => { if (!supabaseAdmin) throw new Error("Chybí service role"); return supabaseAdmin; };
const UUID = /^[0-9a-f-]{36}$/i;
const kontrolaId = (id: string) => { if (!UUID.test(id)) throw new Error("Neplatné ID žáka"); return id; };

// ── Režimy ──

export async function prepniRezim(rezim: "sdileni" | "demo", zapnout: boolean): Promise<void> {
  await vyzadujAdmina();
  const c = await cookies();
  const nazev = rezim === "sdileni" ? "admin_sdileni" : "admin_demo";
  if (zapnout) c.set(nazev, "1", { path: "/admin", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 90 });
  else c.delete({ name: nazev, path: "/admin" });
  refresh();
}

export async function zapisPouziti(sekce: string): Promise<void> {
  await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  await db().rpc("admin_pouziti_pricti", { p_sekce: sekce.slice(0, 40) });
}

// ── Doporučení (Odložit, Hotovo, Skrýt s důvodem, palec) ──

type StavD = { stav: "hotovo" | "odlozeno" | "skryto" | null; do_kdy: string | null; duvod: string | null } | null;

export async function nastavDoporuceni(klic: string, pravidlo: string, akce: "hotovo" | "zitra" | "tyden" | "skryt", duvod?: string): Promise<StavD> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const { data: puvodni } = await db().from("admin_doporuceni_stav").select("stav, do_kdy, duvod").eq("klic", klic).maybeSingle();
  const ted = Date.now();
  const doKdy = akce === "zitra" ? new Date(ted + 86400000) : akce === "tyden" ? new Date(ted + 7 * 86400000) : akce === "hotovo" ? new Date(ted + 3 * 86400000) : null;
  const { error } = await db().from("admin_doporuceni_stav").upsert({
    klic: klic.slice(0, 200), pravidlo: pravidlo.slice(0, 60),
    stav: akce === "hotovo" ? "hotovo" : akce === "skryt" ? "skryto" : "odlozeno",
    do_kdy: doKdy?.toISOString() ?? null, duvod: duvod?.slice(0, 300) ?? null, upraveno_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  await zapisAudit({ adminId: admin.id, akce: "doporuceni_zmeneno", detail: { pravidlo, akce, duvod: duvod ?? null } });
  refresh();
  return (puvodni as StavD) ?? null;
}

export async function vratDoporuceni(klic: string, pravidlo: string, puvodni: StavD): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  if (puvodni) await db().from("admin_doporuceni_stav").upsert({ klic, pravidlo, stav: puvodni.stav, do_kdy: puvodni.do_kdy, duvod: puvodni.duvod, upraveno_at: new Date().toISOString() });
  else await db().from("admin_doporuceni_stav").update({ stav: null, do_kdy: null, duvod: null }).eq("klic", klic);
  await zapisAudit({ adminId: admin.id, akce: "doporuceni_zmeneno", detail: { pravidlo, akce: "zpet" } });
  refresh();
}

export async function palecDoporuceni(klic: string, pravidlo: string, palec: 1 | -1): Promise<void> {
  await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  await db().from("admin_doporuceni_stav").upsert({ klic, pravidlo, palec, upraveno_at: new Date().toISOString() });
  refresh();
}

// ── Úkoly (plán týdne) ──

export async function pridejUkol(u: { nazev: string; popis?: string; zaci?: string[]; zdroj?: string; termin?: string | null; tentoTyden?: boolean }): Promise<number> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const nazev = u.nazev.trim().slice(0, 200);
  if (!nazev) throw new Error("Chybí název úkolu");
  const { data, error } = await db().from("admin_ukoly").insert({
    nazev, popis: u.popis?.slice(0, 4000) ?? null, zaci: (u.zaci ?? []).filter((x) => UUID.test(x)).slice(0, 200),
    zdroj: u.zdroj?.slice(0, 80) ?? "ručně", termin: u.termin && /^\d{4}-\d{2}-\d{2}$/.test(u.termin) ? u.termin : null, tento_tyden: u.tentoTyden ?? true,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await zapisAudit({ adminId: admin.id, akce: "ukol_zmenen", detail: { id: data.id, akce: "pridan", nazev } });
  refresh();
  return data.id as number;
}

export async function zmenUkol(id: number, zmena: { stav?: "novy" | "delam" | "hotovo" | "odlozeno"; tentoTyden?: boolean; poznamka?: string }): Promise<{ stav: string; tento_tyden: boolean; poznamka: string | null } | null> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const { data: puvodni } = await db().from("admin_ukoly").select("stav, tento_tyden, poznamka").eq("id", id).maybeSingle();
  const upd: Record<string, unknown> = {};
  if (zmena.stav) { upd.stav = zmena.stav; upd.hotovo_at = zmena.stav === "hotovo" ? new Date().toISOString() : null; }
  if (zmena.tentoTyden !== undefined) upd.tento_tyden = zmena.tentoTyden;
  if (zmena.poznamka !== undefined) upd.poznamka = zmena.poznamka.slice(0, 2000);
  const { error } = await db().from("admin_ukoly").update(upd).eq("id", id);
  if (error) throw new Error(error.message);
  await zapisAudit({ adminId: admin.id, akce: "ukol_zmenen", detail: { id, ...zmena } });
  refresh();
  return (puvodni as { stav: string; tento_tyden: boolean; poznamka: string | null }) ?? null;
}

// ── Poznámky a štítky u žáka ──

export async function pridejPoznamku(userId: string, text: string): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const t = text.trim().slice(0, 2000);
  if (!t) throw new Error("Prázdná poznámka");
  const { error } = await db().from("admin_poznamky").insert({ user_id: kontrolaId(userId), text: t });
  if (error) throw new Error(error.message);
  await zapisAudit({ adminId: admin.id, akce: "poznamka_zaka", cilUserId: userId });
  refresh();
}

export async function stitky(userIds: string[], stitek: string, pridat: boolean): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const s = stitek.trim().slice(0, 40);
  if (!s) throw new Error("Prázdný štítek");
  const ids = userIds.filter((x) => UUID.test(x)).slice(0, 500);
  if (pridat) await db().from("admin_stitky").upsert(ids.map((user_id) => ({ user_id, stitek: s })), { ignoreDuplicates: true });
  else await db().from("admin_stitky").delete().in("user_id", ids).eq("stitek", s);
  await zapisAudit({ adminId: admin.id, akce: "stitek_zmenen", detail: { stitek: s, pridat, pocet: ids.length } });
  refresh();
}

// ── Nastavení ──

export async function ulozNastaveniAdminu(n: Nastaveni): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const puvodni = await nactiNastaveni();
  await ulozNastaveni(n);
  await zapisAudit({ adminId: admin.id, akce: "nastaveni_zmeneno", detail: { emailyNaostro: n.emailyNaostro, zmena_ostreho_rezimu: puvodni.emailyNaostro !== n.emailyNaostro } });
  refresh();
}

export async function ulozSegment(nazev: string, dotaz: string): Promise<void> {
  await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const n = await nactiNastaveni();
  const seg = { nazev: nazev.trim().slice(0, 40), dotaz: dotaz.slice(0, 500) };
  if (!seg.nazev) throw new Error("Chybí název segmentu");
  await ulozNastaveni({ ...n, segmenty: [...n.segmenty.filter((s) => s.nazev !== seg.nazev), seg] });
  refresh();
}

// ── E-maily žákům (testovací režim je výchozí) ──

const TEST_OD = "MateMax Admin (TEST) <noreply@matematika-snadno.cz>";

async function posliTest(komu: string, obsah: ObsahEmailu, proKoho: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const { Resend } = await import("resend");
  const o = { ...obsah, predmet: `TEST: ${obsah.predmet} (pro ${proKoho})` };
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: TEST_OD, to: komu, subject: o.predmet, html: sestavHtml(o), text: sestavText(o), tags: [{ name: "email", value: "admin_test" }] });
  return !error;
}

export interface VysledekOdeslani { rezim: "test" | "ostry"; odeslano: number; preskoceno: number; chyby: number; zprava: string }

/**
 * Hromadné / jednotlivé odeslání šablony. V testovacím režimu přijde na adresu admina jeden ukázkový e-mail
 * za každou šablonu (s „TEST“ v předmětu) a nic žákům. Naostro jen když je v nastavení zapnuto, nejvýš 50
 * žákům najednou (strop Resend Free je 100 e-mailů denně), odhlášení se přeskočí.
 */
export async function posliSablonu(userIds: string[], sablona: EmailZaka, potvrzeno: boolean): Promise<VysledekOdeslani> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const n = await nactiNastaveni();
  const ids = [...new Set(userIds.filter((x) => UUID.test(x)))].slice(0, 50);
  if (!ids.length) throw new Error("Nikdo vybraný");
  const dnes = pragueDateStr();
  if (!n.emailyNaostro) {
    const { data } = await db().auth.admin.getUserById(ids[0]);
    const trida = Number(data.user?.user_metadata?.trida) === 5 ? 5 : 9;
    const ok = await posliTest(admin.email!, obsahEmailu(sablona, { trida, dnes }), `${ids.length} ${ids.length === 1 ? "žáka" : "žáků"}`);
    await zapisAudit({ adminId: admin.id, akce: "email_odeslan_rucne", detail: { sablona, rezim: "test", pocet: ids.length } });
    return { rezim: "test", odeslano: ok ? 1 : 0, preskoceno: 0, chyby: ok ? 0 : 1, zprava: ok ? `Testovací režim: ukázka přišla na tvou adresu. Žákům (${ids.length}) nic neodešlo.` : "Ukázku se nepodařilo odeslat (Resend)." };
  }
  if (!potvrzeno) throw new Error("Potvrď odeslání.");
  let odeslano = 0, preskoceno = 0, chyby = 0;
  for (const id of ids) {
    const { data } = await db().auth.admin.getUserById(id);
    const u = data.user;
    if (!u?.email || (u.app_metadata as Record<string, { odhlaseno?: boolean }> | undefined)?.emaily?.odhlaseno) { preskoceno++; continue; }
    const trida = Number(u.user_metadata?.trida) === 5 ? 5 : 9;
    const r = await posliEmailZakovi(u, sablona, { trida, dnes });
    if (r.ok) odeslano++; else chyby++;
    await zapisAudit({ adminId: admin.id, akce: "email_odeslan_rucne", cilUserId: id, detail: { sablona, rezim: "ostry", ok: r.ok }, vysledek: r.ok ? "ok" : "chyba" });
  }
  return { rezim: "ostry", odeslano, preskoceno, chyby, zprava: `Odesláno ${odeslano}, přeskočeno ${preskoceno} (odhlášení nebo bez e-mailu), chyby ${chyby}.` };
}

/** Vlastní text žákovi. V testovacím režimu přijde na adresu admina. */
export async function posliVlastni(userId: string, predmet: string, text: string, potvrzeno: boolean): Promise<VysledekOdeslani> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const n = await nactiNastaveni();
  kontrolaId(userId);
  const p = predmet.trim().slice(0, 120), t = text.trim().slice(0, 4000);
  if (!p || !t) throw new Error("Vyplň předmět a text.");
  const obsah: ObsahEmailu = { predmet: p, pre: t.slice(0, 90), nadpis: p, odstavce: t.split(/\n{2,}/).map((x) => esc(x).replace(/\n/g, "<br>")), img: "uvitani", pata: "Píše ti Karel z MateMaxu. Na e-mail můžeš rovnou odpovědět." };
  if (!n.emailyNaostro) {
    const ok = await posliTest(admin.email!, obsah, "1 žáka");
    await zapisAudit({ adminId: admin.id, akce: "email_odeslan_rucne", cilUserId: userId, detail: { vlastni: true, rezim: "test" } });
    return { rezim: "test", odeslano: ok ? 1 : 0, preskoceno: 0, chyby: ok ? 0 : 1, zprava: ok ? "Testovací režim: e-mail přišel na tvou adresu, žákovi nic neodešlo." : "E-mail se nepodařilo odeslat." };
  }
  if (!potvrzeno) throw new Error("Potvrď odeslání.");
  const { data } = await db().auth.admin.getUserById(userId);
  if (!data.user?.email) throw new Error("Žák nemá e-mail.");
  const { posliEmail } = await import("@/lib/emaily/rodice");
  const { odkazyUctu } = await import("@/lib/emaily/odeslat");
  const ok = await posliEmail(data.user.email, obsah, "vlastni_admin", odkazyUctu(userId), { userId });
  await zapisAudit({ adminId: admin.id, akce: "email_odeslan_rucne", cilUserId: userId, detail: { vlastni: true, rezim: "ostry" }, vysledek: ok ? "ok" : "chyba" });
  return { rezim: "ostry", odeslano: ok ? 1 : 0, preskoceno: 0, chyby: ok ? 0 : 1, zprava: ok ? "Odesláno žákovi." : "E-mail se nepodařilo odeslat." };
}

// ── Správa účtu žáka ──

export async function zmenTridu(userId: string, trida: 5 | 9): Promise<5 | 9> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const { data } = await db().auth.admin.getUserById(kontrolaId(userId));
  if (!data.user) throw new Error("Účet nenalezen");
  const puvodni = Number(data.user.user_metadata?.trida) === 5 ? 5 : 9;
  await db().auth.admin.updateUserById(userId, { user_metadata: { ...data.user.user_metadata, trida } });
  await zapisAudit({ adminId: admin.id, akce: "trida_zmenena", cilUserId: userId, detail: { z: puvodni, na: trida } });
  refresh();
  return puvodni;
}

/** Žebříček (SY-13): skrýt žáka ostatním, nebo vrátit. */
export async function skrytZebricek(userId: string, skryt: boolean): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  kontrolaId(userId);
  await db().from("weekly_leaderboard").update({ skryty: skryt }).eq("user_id", userId);
  const { data } = await db().auth.admin.getUserById(userId);
  if (data.user) await db().auth.admin.updateUserById(userId, { app_metadata: { ...data.user.app_metadata, zebricek_skryty: skryt } });
  await zapisAudit({ adminId: admin.id, akce: "zebricek_zmenen", cilUserId: userId, detail: { skryt } });
  refresh();
}

export async function zmenPrezdivku(userId: string, prezdivka: string): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const { data } = await db().auth.admin.getUserById(kontrolaId(userId));
  if (!data.user) throw new Error("Účet nenalezen");
  const m = data.user.user_metadata ?? {};
  const p = prezdivka.trim();
  const chyba = p ? chybaPrezdivky(p, [m.first_name, m.last_name]) : null;
  if (chyba) throw new Error(chyba);
  await db().auth.admin.updateUserById(userId, { user_metadata: { ...m, prezdivka: p || null } });
  await db().from("weekly_leaderboard").update({ nickname: p || "Žák" }).eq("user_id", userId);
  await zapisAudit({ adminId: admin.id, akce: "zebricek_zmenen", cilUserId: userId, detail: { prezdivka: p ? "změněna" : "výchozí" } });
  refresh();
}

/** Odkaz na nové heslo: e-mail žákovi posílá Supabase (šablona Reset Password). */
export async function posliResetHesla(userId: string, potvrzeno: boolean): Promise<string> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  if (!potvrzeno) throw new Error("Potvrď odeslání žákovi.");
  const { data } = await db().auth.admin.getUserById(kontrolaId(userId));
  if (!data.user?.email) throw new Error("Žák nemá e-mail.");
  const { createClient } = await import("@supabase/supabase-js");
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await anon.auth.resetPasswordForEmail(data.user.email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://matemax.matematika-snadno.cz"}/zapomenute-heslo` });
  await zapisAudit({ adminId: admin.id, akce: "reset_hesla_odeslan", cilUserId: userId, vysledek: error ? "chyba" : "ok" });
  if (error) throw new Error(error.message);
  return "Odkaz na nové heslo odešel žákovi.";
}

export async function deaktivujUcet(userId: string, deaktivovat: boolean): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  await db().auth.admin.updateUserById(kontrolaId(userId), { ban_duration: deaktivovat ? "876000h" : "none" });
  await zapisAudit({ adminId: admin.id, akce: "ucet_deaktivovan", cilUserId: userId, detail: { deaktivovat } });
  refresh();
}

/** Export dat žáka (GDPR): JSON se vším, co o něm appka má. */
export async function exportDatZaka(userId: string): Promise<string> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  kontrolaId(userId);
  const d = db();
  const [u, ...tabulky] = await Promise.all([
    d.auth.admin.getUserById(userId),
    ...["sessions", "procvicovani", "sm2_cards", "diagnostic_results", "user_premium", "user_xp", "user_sbirka", "user_onboarding", "odpovedi", "souhlasy", "vysledky_propojeni", "vysledky_testy", "user_feedback", "admin_poznamky", "admin_stitky"].map((t) => d.from(t).select("*").eq("user_id", userId).limit(5000)),
  ]);
  const nazvy = ["sessions", "procvicovani", "sm2_cards", "diagnostic_results", "user_premium", "user_xp", "user_sbirka", "user_onboarding", "odpovedi", "souhlasy", "vysledky_propojeni", "vysledky_testy", "user_feedback", "admin_poznamky", "admin_stitky"];
  const out: Record<string, unknown> = { exportovano: new Date().toISOString(), ucet: u.data.user ? { id: u.data.user.id, email: u.data.user.email, vytvoren: u.data.user.created_at, user_metadata: u.data.user.user_metadata } : null };
  tabulky.forEach((r, i) => { out[nazvy[i]] = (r as { data: unknown[] | null }).data ?? []; });
  await zapisAudit({ adminId: admin.id, akce: "export_ucty", cilUserId: userId, detail: { druh: "export_zaka" } });
  return JSON.stringify(out, null, 2);
}

/** Smazání účtu (nevratné): potvrzení napsáním „SMAZAT“. Data v tabulkách se smažou kaskádou. */
export async function smazUcet(userId: string, potvrzeni: string): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  if (potvrzeni.trim() !== "SMAZAT") throw new Error("Pro smazání napiš SMAZAT.");
  const { error } = await db().auth.admin.deleteUser(kontrolaId(userId));
  await zapisAudit({ adminId: admin.id, akce: "ucet_smazan", cilUserId: userId, vysledek: error ? "chyba" : "ok" });
  if (error) throw new Error(error.message);
}

// ── Premium a testovací účet (stejné jako starý admin, s auditem) ──

export async function nastavPremium(userId: string, udelit: boolean, doKdy: string | null): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  kontrolaId(userId);
  const { data: radek } = await db().from("user_premium").select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
  if (radek?.stripe_subscription_id) throw new Error("Žák platí přes Stripe: změň předplatné ve Stripe.");
  if (!udelit) {
    await db().from("user_premium").update({ is_premium: false, trial_expires_at: null }).eq("user_id", userId);
    await zapisAudit({ adminId: admin.id, akce: "premium_odebrano", cilUserId: userId });
  } else {
    let konec: string | null = null;
    if (doKdy) { if (!/^\d{4}-\d{2}-\d{2}$/.test(doKdy) || Date.parse(`${doKdy}T23:59:59Z`) <= Date.now()) throw new Error("Datum musí být v budoucnosti."); konec = new Date(`${doKdy}T23:59:59Z`).toISOString(); }
    await db().from("user_premium").upsert({ user_id: userId, is_premium: true, trial_expires_at: konec, trial_granted_by: `admin:${admin.email}` }, { onConflict: "user_id" });
    await zapisAudit({ adminId: admin.id, akce: "premium_udeleno", cilUserId: userId, detail: { do: konec } });
  }
  refresh();
}

export async function oznacTestovaci(userId: string, testovaci: boolean): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const { data } = await db().auth.admin.getUserById(kontrolaId(userId));
  if (!data.user) throw new Error("Účet nenalezen");
  await db().auth.admin.updateUserById(userId, { app_metadata: { ...data.user.app_metadata, testovaci } });
  await zapisAudit({ adminId: admin.id, akce: "testovaci_zmeneno", cilUserId: userId, detail: { testovaci } });
  refresh();
}

export async function resetDiagnostiky(userId: string): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  kontrolaId(userId);
  await db().from("diagnostic_results").delete().eq("user_id", userId);
  await db().from("user_onboarding").update({ current_state: "registered" }).eq("user_id", userId);
  await zapisAudit({ adminId: admin.id, akce: "diagnostika_resetovana", cilUserId: userId });
  refresh();
}
