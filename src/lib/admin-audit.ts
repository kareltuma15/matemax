/**
 * Audit adminu (admin 2.1 fáze A1, SY-02): každá akce v adminu se zapíše do tabulky admin_audit
 * (kdy, co, u koho, výsledek). Záznamy nejde měnit ani mazat (trigger v databázi).
 * Zápis nikdy neshodí akci: když tabulka ještě není (migrace se pouští ručně), jen se zaloguje.
 */
import { supabaseAdmin } from "./supabase-admin";

export type AuditAkce =
  | "premium_udeleno" | "premium_odebrano" | "diagnostika_resetovana" | "testovaci_zmeneno"
  | "karta_otevrena" | "utrata_zapsana" | "poznamka_zapsana" | "email_odeslan_rucne" | "hodnoceni_ulozeno"
  | "export_ucty";

export async function zapisAudit(z: { adminId: string | null; akce: AuditAkce; cilUserId?: string | null; detail?: Record<string, unknown>; vysledek?: "ok" | "chyba" }): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    const { error } = await supabaseAdmin.from("admin_audit").insert({
      admin_id: z.adminId,
      akce: z.akce,
      cil_user_id: z.cilUserId ?? null,
      detail: z.detail ?? {},
      vysledek: z.vysledek ?? "ok",
    });
    if (error) console.warn("[audit]", z.akce, error.message);
  } catch (e) {
    console.warn("[audit]", z.akce, e instanceof Error ? e.message : e);
  }
}
