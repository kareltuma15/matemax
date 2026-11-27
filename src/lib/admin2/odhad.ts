/**
 * Odhad bodů žáka pro kartu (UC-09). Stejný výpočet jako týdenní report rodičům (src/lib/odhad-server.ts),
 * historie z pondělních reportů (app_metadata.odhad_tydny). Orientační, dokud není kalibrace s testy (fáze C).
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { odhadDitete, type OdhadDitete } from "@/lib/odhad-server";
import { pragueDateStr } from "@/lib/date";
import { posunDen } from "./metriky";
import type { Kontext } from "./data";
import type { Zak } from "./typy";

export async function odhadZaka(k: Kontext, z: Zak): Promise<OdhadDitete | null> {
  const dnes = pragueDateStr();
  if (k.demo) {
    const n = Number(z.id.slice(-2)) || 1;
    const temata = z.trida === 5
      ? [["p5_zlomky", "Zlomky", 3 + (n % 4), 8], ["p5_obsah", "Obsah a obvod", 5, 8], ["p5_slovni", "Slovní úlohy", 2 + (n % 3), 9]]
      : [["zlomky", "Zlomky", 2 + (n % 4), 6], ["vyrazy", "Výrazy", 5, 6], ["slovni_ulohy", "Slovní úlohy", 3 + (n % 5), 10], ["uhly", "Úhly", 1, 4]];
    const t = temata.map(([tema, label, body, max]) => ({ tema: String(tema), label: String(label), body: Number(body), max: Number(max) }));
    const celkem = t.reduce((s, x) => s + x.body, 0);
    return { trida: z.trida, celkem, max: z.trida === 5 ? 50 : 50, bezDat: false, cil: null, temata: t, nejvicBodu: { label: "Slovní úlohy", chybi: 5 }, tydny: [0, 1, 2, 3].map((i) => ({ d: posunDen(dnes, -7 * (4 - i)), b: Math.max(0, celkem - 4 + i) })), zmena: 1 };
  }
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.auth.admin.getUserById(z.id);
  if (!data.user) return null;
  try { return await odhadDitete(supabaseAdmin, data.user, dnes); } catch { return null; }
}
