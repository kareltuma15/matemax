/**
 * Záloha Sbírky na server (tabulka user_sbirka, migrace 20261116_user_sbirka.sql).
 * Dokud Karel migraci nespustí, zápis tiše selže (tabulka neexistuje) a appka jede jen z prohlížeče.
 */
import { supabase } from "./supabase";
import { reportDbError } from "./db-error";
import { nactiSbirku, ulozSbirku, slucSbirku, vychoziStav, type SbirkaStav } from "./sbirka";

const CHYBI_TABULKA = new Set(["PGRST205", "42P01"]);

function hlasChybu(kde: string, error: { message?: string; code?: string } | null) {
  if (!error || CHYBI_TABULKA.has(error.code ?? "")) return;
  reportDbError(kde, error);
}

export async function zalohujSbirku(userId: string, s: SbirkaStav = nactiSbirku()): Promise<void> {
  // Prázdný stav (např. po odhlášení) nikdy nepřepíše zálohu na serveru.
  if (!supabase || !s.t) return;
  const { error } = await supabase
    .from("user_sbirka")
    .upsert({ user_id: userId, state: s, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  hlasChybu("user_sbirka.upsert", error);
}

/** Po přihlášení: sloučí zálohu se stavem v prohlížeči a výsledek uloží na obě místa. */
export async function obnovSbirku(userId: string): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from("user_sbirka").select("state").eq("user_id", userId).maybeSingle();
  if (error) { hlasChybu("user_sbirka.select", error); return; }
  const lokal = nactiSbirku();
  const server = data?.state as Partial<SbirkaStav> | undefined;
  const slouceno = server ? slucSbirku(lokal, { ...vychoziStav(), ...server }) : lokal;
  ulozSbirku(slouceno);
  if (slouceno.t > 0) await zalohujSbirku(userId, slouceno);
}
