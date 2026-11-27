"use server";

/** Přizpůsobení dlaždic na Dnes (DN-06): pořadí a skryté dlaždice v admin_nastaveni.dlazdice. */
import { refresh } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zapisAudit } from "@/lib/admin-audit";
import { vyzadujAdmina, jeE2e } from "@/lib/admin2/auth";

const IDS = new Set(["pravidelni", "novi", "aktivovani", "platici", "testy"]);

export async function ulozDlazdice(poradi: string[], skryte: string[]): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const p = poradi.filter((x) => IDS.has(x)), s = skryte.filter((x) => IDS.has(x));
  if (s.length >= IDS.size) throw new Error("Aspoň jedno číslo musí zůstat");
  await supabaseAdmin.from("admin_nastaveni").upsert({ klic: "dlazdice", hodnota: { poradi: p, skryte: s }, upraveno_at: new Date().toISOString() });
  await zapisAudit({ adminId: admin.id, akce: "nastaveni_zmeneno", detail: { dlazdice: p, skryte: s } });
  refresh();
}
