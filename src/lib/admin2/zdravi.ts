/**
 * Zdraví systému, základ z fáze B2 (SY-04): chyby za 24 h seskupené podle otisku, poslední běh každé automatické úlohy,
 * webhooky za 7 dní a e-maily za 24 h proti stropu Resend Free. Plné Zdraví (limity tarifů, zálohy) přijde v B4.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface ChybaSkupina { otisk: string; zprava: string; cesta: string | null; zdroj: string; pocet: number; posledni: string; zaku: number }
export interface BehUlohy { uloha: string; zacatek: string; konec: string | null; ok: boolean | null; vysledek: Record<string, unknown> | null; chyba: string | null }
export interface Zdravi { chyby: ChybaSkupina[]; behy: BehUlohy[]; webhooky: { zdroj: string; stav: string; pocet: number }[]; emaily24h: number; chybi: boolean }

/** Lidské názvy automatických úloh (cronů). */
export const NAZVY_ULOH: Record<string, string> = {
  "emaily-zakum": "Připomínky žákům (16:00)", "emaily-zakum-nanecisto": "Připomínky nanečisto (kontrola z adminu)", "daily-push": "Push připomínky a připomínky testů",
  "weekly-parent-report": "Týdenní přehled rodičům (po 7:00)", "tydenni-analytika": "Týdenní report analytiky (po 7:00)", "test-reminders": "Připomínky testů (ručně)", "admin-souhrn": "Denní souhrn pro Karla (každou hodinu, posílá v nastavenou)",
};

// ── Limity tarifů (SY-05) a zálohy (SY-06) ──

/** Limity ověřené v aktuálních cenících 27. 11. 2026 (supabase.com/pricing, resend.com/pricing). Vercel Pro má limity daleko nad provozem appky. */
export const LIMITY = { resendDen: 100, resendMesic: 3000, supabaseDbMb: 500, supabaseMau: 50000 } as const;

export interface Limit { nazev: string; hodnota: number | null; limit: number; jednotka: string; poznamka?: string }
export interface StavLimitu { limity: Limit[]; zaloha: { cas: string; tabulek: number; radku: number } | null; dniOdZalohy: number | null }

export async function nactiLimity(demo: boolean, zaci: { posledni_prihlaseni: string | null }[]): Promise<StavLimitu> {
  const ted = Date.now();
  const mau = zaci.filter((z) => z.posledni_prihlaseni && ted - Date.parse(z.posledni_prihlaseni) < 30 * 86400000).length;
  if (demo || !supabaseAdmin) return { limity: [{ nazev: "Resend: e-maily za 24 h", hodnota: 6, limit: LIMITY.resendDen, jednotka: "" }, { nazev: "Resend: e-maily za 30 dní", hodnota: 212, limit: LIMITY.resendMesic, jednotka: "" }, { nazev: "Supabase: databáze", hodnota: 41, limit: LIMITY.supabaseDbMb, jednotka: "MB" }, { nazev: "Supabase: aktivní uživatelé za 30 dní", hodnota: mau, limit: LIMITY.supabaseMau, jednotka: "" }], zaloha: { cas: new Date(ted - 9 * 86400000).toISOString(), tabulek: 40, radku: 3000 }, dniOdZalohy: 9 };
  const [den, mesic, db, zal] = await Promise.all([
    supabaseAdmin.from("zpravy").select("id", { count: "exact", head: true }).eq("kanal", "email").gte("odeslano_at", new Date(ted - 86400000).toISOString()),
    supabaseAdmin.from("zpravy").select("id", { count: "exact", head: true }).eq("kanal", "email").gte("odeslano_at", new Date(ted - 30 * 86400000).toISOString()),
    supabaseAdmin.rpc("admin_velikost_db"),
    supabaseAdmin.from("admin_nastaveni").select("hodnota").eq("klic", "posledni_zaloha").maybeSingle(),
  ]);
  const zaloha = (zal.data?.hodnota ?? null) as StavLimitu["zaloha"];
  return {
    limity: [
      { nazev: "Resend: e-maily za 24 h", hodnota: den.count ?? null, limit: LIMITY.resendDen, jednotka: "", poznamka: "z logu zpráv od 27. 11. (registrace a reset hesla posílá Supabase zvlášť)" },
      { nazev: "Resend: e-maily za 30 dní", hodnota: mesic.count ?? null, limit: LIMITY.resendMesic, jednotka: "", poznamka: "log zpráv běží od 27. 11." },
      { nazev: "Supabase: databáze", hodnota: db.error ? null : Math.round(Number(db.data) / 1024 / 1024), limit: LIMITY.supabaseDbMb, jednotka: "MB", poznamka: db.error ? "chybí migrace 20261128_admin_b4" : undefined },
      { nazev: "Supabase: aktivní uživatelé za 30 dní", hodnota: mau, limit: LIMITY.supabaseMau, jednotka: "", poznamka: "přihlášení žáci, bez testovacích" },
    ],
    zaloha, dniOdZalohy: zaloha ? Math.floor((ted - Date.parse(zaloha.cas)) / 86400000) : null,
  };
}

export async function nactiZdravi(demo: boolean): Promise<Zdravi> {
  const prazdne: Zdravi = { chyby: [], behy: [], webhooky: [], emaily24h: 0, chybi: false };
  if (demo || !supabaseAdmin) return prazdne;
  const ted = Date.now();
  const [c, b, w, e] = await Promise.all([
    supabaseAdmin.from("chyby").select("otisk, zprava, cesta, zdroj, user_id, cas").gte("cas", new Date(ted - 86400000).toISOString()).order("cas", { ascending: false }).limit(1000),
    supabaseAdmin.from("behy_cronu").select("uloha, zacatek, konec, ok, vysledek, chyba").gte("zacatek", new Date(ted - 14 * 86400000).toISOString()).order("zacatek", { ascending: false }).limit(300),
    supabaseAdmin.from("webhooky").select("zdroj, stav").gte("prijato_at", new Date(ted - 7 * 86400000).toISOString()).limit(5000),
    supabaseAdmin.from("zpravy").select("id", { count: "exact", head: true }).eq("kanal", "email").gte("odeslano_at", new Date(ted - 86400000).toISOString()),
  ]);
  if (c.error && /relation|schema cache/i.test(c.error.message)) return { ...prazdne, chybi: true };
  const skupiny = new Map<string, ChybaSkupina & { lide: Set<string> }>();
  for (const r of (c.data ?? []) as { otisk: string; zprava: string; cesta: string | null; zdroj: string; user_id: string | null; cas: string }[]) {
    const s = skupiny.get(r.otisk) ?? { otisk: r.otisk, zprava: r.zprava, cesta: r.cesta, zdroj: r.zdroj, pocet: 0, posledni: r.cas, zaku: 0, lide: new Set<string>() };
    s.pocet++; if (r.user_id) s.lide.add(r.user_id);
    skupiny.set(r.otisk, s);
  }
  const chyby = [...skupiny.values()].map(({ lide, ...s }) => ({ ...s, zaku: lide.size })).sort((a, b) => b.pocet - a.pocet);
  const posledni = new Map<string, BehUlohy>();
  for (const r of (b.data ?? []) as BehUlohy[]) if (!posledni.has(r.uloha)) posledni.set(r.uloha, r);
  const wm = new Map<string, number>();
  for (const r of (w.data ?? []) as { zdroj: string; stav: string }[]) wm.set(`${r.zdroj}|${r.stav}`, (wm.get(`${r.zdroj}|${r.stav}`) ?? 0) + 1);
  return {
    chyby, behy: [...posledni.values()].sort((a, b) => a.uloha.localeCompare(b.uloha)),
    webhooky: [...wm].map(([k, pocet]) => { const [zdroj, stav] = k.split("|"); return { zdroj, stav, pocet }; }),
    emaily24h: e.count ?? 0, chybi: false,
  };
}
