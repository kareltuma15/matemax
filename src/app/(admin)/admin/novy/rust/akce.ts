"use server";

/** Akce Růstu (fáze B4): lidský název kampaně pro generátor odkazů (RU-03), ukládá se do nastavení adminu (kampane). */
import { refresh } from "next/cache";
import { zapisAudit } from "@/lib/admin-audit";
import { vyzadujAdmina, jeE2e } from "@/lib/admin2/auth";
import { nactiNastaveni, ulozNastaveni } from "@/lib/admin2/nastaveni";

export async function ulozKampan(kod: string, nazev: string): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  const k = kod.trim().toLowerCase().replace(/[^a-z0-9·\- ]/g, "").slice(0, 80);
  const n = nazev.trim().slice(0, 80);
  if (!k || !n) throw new Error("Chybí kód nebo název kampaně");
  const nast = await nactiNastaveni();
  await ulozNastaveni({ ...nast, kampane: { ...nast.kampane, [k]: n } });
  await zapisAudit({ adminId: admin.id, akce: "nastaveni_zmeneno", detail: { kampan: k } });
  refresh();
}
