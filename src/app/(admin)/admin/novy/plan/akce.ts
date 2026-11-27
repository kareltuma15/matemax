"use server";

/** Akce Plánu (fáze B4): vyhodnocení změny z kroniky (proč, co sledovat, kdy vyhodnotit). */
import { refresh } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zapisAudit } from "@/lib/admin-audit";
import { vyzadujAdmina, jeE2e } from "@/lib/admin2/auth";
import type { Experiment } from "@/lib/admin2/plan";

const SLEDOVANI = new Set(["dny_tydne", "aktivace", "navrat"]);

export async function ulozExperiment(klic: string, e: Experiment | null): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const k = klic.slice(0, 80);
  const { data } = await supabaseAdmin.from("admin_nastaveni").select("hodnota").eq("klic", "kronika_experimenty").maybeSingle();
  const h = { ...((data?.hodnota ?? {}) as Record<string, Experiment>) };
  if (e) {
    if (!SLEDOVANI.has(e.sledovat) || !/^\d{4}-\d{2}-\d{2}$/.test(e.vyhodnotit)) throw new Error("Neplatné údaje");
    h[k] = { proc: e.proc.trim().slice(0, 300), sledovat: e.sledovat, vyhodnotit: e.vyhodnotit };
  } else delete h[k];
  const { error } = await supabaseAdmin.from("admin_nastaveni").upsert({ klic: "kronika_experimenty", hodnota: h, upraveno_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await zapisAudit({ adminId: admin.id, akce: "nastaveni_zmeneno", detail: { kronika: k, smazano: !e } });
  refresh();
}
