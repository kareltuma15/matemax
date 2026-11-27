import { supabaseAdmin } from "./supabase-admin";
import { sablonaCesty } from "./mereni-plan";
import { upozorniAdmina } from "./admin-push";

/**
 * Zdraví systému (admin 2.1, SY-04): chyby z prohlížeče a ze serveru a běhy cronů.
 * Zápis nesmí nikdy shodit to, co se zapisuje. Před migrací 20261128_admin_b1 se tiše přeskočí.
 */

const tise = (e: { message: string } | null) => { if (e && !/relation .*(chyby|behy_cronu)|schema cache/i.test(e.message)) console.warn("[system-log]", e.message); };

/** Otisk chyby: stejná zpráva bez čísel a ID na stejném místě = stejná chyba. */
export function otiskChyby(zdroj: string, zprava: string, cesta?: string | null): string {
  const z = zprava.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "#").replace(/\d+/g, "#").slice(0, 120);
  return `${zdroj}:${cesta ?? ""}:${z}`.slice(0, 200);
}

export async function zapisChybu(c: { zdroj: "klient" | "server" | "cron" | "webhook"; zprava: string; cesta?: string | null; userId?: string | null; detail?: Record<string, unknown> }): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    const cesta = c.cesta ? sablonaCesty(c.cesta.split("?")[0]).slice(0, 200) : null;
    const zprava = c.zprava.slice(0, 500);
    const otisk = otiskChyby(c.zdroj, zprava, cesta);
    const { error } = await supabaseAdmin.from("chyby").insert({ zdroj: c.zdroj, otisk, zprava, cesta, user_id: c.userId ?? null, detail: c.detail ?? null });
    tise(error);
    // Nárůst: stejná chyba potřetí za 24 h → upozornění (jen jednou, při třetím výskytu)
    if (!error) { const { count } = await supabaseAdmin.from("chyby").select("id", { count: "exact", head: true }).eq("otisk", otisk).gte("cas", new Date(Date.now() - 86400000).toISOString()); if (count === 3) await upozorniAdmina("chyby", "Opakovaná chyba v appce", `${zprava.slice(0, 80)} (3× za den)`, "/admin/novy/nastaveni#zdravi"); }
  } catch { /* nikdy neshodit */ }
}

/**
 * Obalí běh cronu: zapíše začátek, konec, výsledek a chybu. Výsledek handleru vrátí beze změny.
 * Výsledek (JSON odpovědi) se uloží zkrácený, bez osobních údajů (crony vrací jen počty).
 */
export async function behCronu(uloha: string, handler: () => Promise<Response>): Promise<Response> {
  let id: number | null = null;
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from("behy_cronu").insert({ uloha }).select("id").single();
      tise(error);
      id = (data?.id as number | undefined) ?? null;
    } catch { id = null; }
  }
  const dokonci = async (ok: boolean, vysledek: unknown, chyba?: string) => {
    if (!supabaseAdmin || id === null) return;
    try { await supabaseAdmin.from("behy_cronu").update({ konec: new Date().toISOString(), ok, vysledek, chyba: chyba?.slice(0, 500) ?? null }).eq("id", id); } catch { /* nic */ }
  };
  try {
    const res = await handler();
    let vysledek: unknown = null;
    try { vysledek = await res.clone().json(); } catch { vysledek = null; }
    const ok = res.ok && !(vysledek && typeof vysledek === "object" && "error" in (vysledek as object));
    if (vysledek && JSON.stringify(vysledek).length > 2000) vysledek = { zkraceno: true };
    await dokonci(ok, vysledek, ok ? undefined : `HTTP ${res.status}`);
    if (!ok) { await zapisChybu({ zdroj: "cron", zprava: `Cron ${uloha} skončil chybou (HTTP ${res.status})`, cesta: `/api/cron/${uloha}` }); await upozorniAdmina("cron", "Automatická úloha selhala", uloha, "/admin/novy/nastaveni#zdravi"); }
    return res;
  } catch (e) {
    const zprava = e instanceof Error ? e.message : String(e);
    await dokonci(false, null, zprava);
    await zapisChybu({ zdroj: "cron", zprava: `Cron ${uloha}: ${zprava}`, cesta: `/api/cron/${uloha}` });
    await upozorniAdmina("cron", "Automatická úloha selhala", uloha, "/admin/novy/nastaveni#zdravi");
    throw e;
  }
}
