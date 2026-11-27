"use server";

/** Akce Učení (fáze B3): označení úlohy jako zkontrolované (s možností vrátit). */
import { refresh } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zapisAudit } from "@/lib/admin-audit";
import { vyzadujAdmina, jeE2e } from "@/lib/admin2/auth";

export async function zkontrolujUlohu(id: string, zkontrolovano: boolean): Promise<string | null> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const uloha = id.slice(0, 60);
  const { data } = await supabaseAdmin.from("admin_nastaveni").select("hodnota").eq("klic", "ulohy_zkontrolovano").maybeSingle();
  const h = { ...((data?.hodnota ?? {}) as Record<string, { cas: string }>) };
  const puvodni = h[uloha]?.cas ?? null;
  if (zkontrolovano) h[uloha] = { cas: new Date().toISOString() }; else delete h[uloha];
  const { error } = await supabaseAdmin.from("admin_nastaveni").upsert({ klic: "ulohy_zkontrolovano", hodnota: h, upraveno_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await zapisAudit({ adminId: admin.id, akce: "uloha_zkontrolovana", detail: { uloha, zkontrolovano } });
  refresh();
  return puvodni;
}
