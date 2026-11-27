import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zapisStav } from "@/lib/zpravy-log";

/**
 * Service worker hlásí, že se push zobrazil nebo že na něj žák klepl (admin 2.1, ZP-05, úprava appky 9).
 * Tělo: { z: ID zprávy z payloadu, stav: "zobrazeno" | "kliknuto" }. Nic osobního se neposílá; ID je náhodné UUID.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`push-stav:${clientIp(req)}`, 30, 60_000)) return NextResponse.json({ ok: true });
  const b = (await req.json().catch(() => null)) as { z?: unknown; stav?: unknown } | null;
  const z = typeof b?.z === "string" && /^[0-9a-f-]{36}$/i.test(b.z) ? b.z : null;
  const stav = b?.stav === "zobrazeno" || b?.stav === "kliknuto" ? b.stav : null;
  if (!z || !stav || !supabaseAdmin) return NextResponse.json({ ok: true });
  // Jen push zprávy (webhook e-mailů má vlastní ověřenou cestu)
  const { data } = await supabaseAdmin.from("zpravy").select("kanal").eq("id", z).maybeSingle();
  if (data?.kanal === "push") await zapisStav({ zpravaId: z }, stav, new Date().toISOString());
  return NextResponse.json({ ok: true });
}
