import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { obsahEmailu, ukazkovaData, NAZVY, KDY, PRIPOMINKY, type EmailZaka } from "@/lib/emaily/katalog";
import { sestavHtml } from "@/lib/emaily/sablona";
import { denniBeh } from "@/lib/emaily/denni-beh";

/**
 * Admin → E-maily: náhledy všech e-mailů (ukázková data, pro 5. i 9. třídu), kdo by je dnes dostal (nanečisto,
 * nic se neposílá) a co naposledy odešlo.
 */
const PORADI: EmailZaka[] = ["uvitani", "nezacal", "plan", "styska", "spi"];
const UKAZKA_ODKAZY = { nastaveni: "#nastaveni", odhlasit: "#odhlasit" };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Chybí service role" }, { status: 500 });

  const dnes = pragueDateStr();
  const nahledy = PORADI.flatMap((id) => ([9, 5] as const).map((trida) => {
    const obsah = obsahEmailu(id, ukazkovaData(trida, dnes));
    return { id, trida, nazev: NAZVY[id], kdy: KDY[id], pripominka: PRIPOMINKY.includes(id), predmet: obsah.predmet, pre: obsah.pre, html: sestavHtml(obsah, UKAZKA_ODKAZY) };
  }));

  let dnesBy: { trida: 5 | 9; posle: EmailZaka; email: string }[] = [];
  let chybaBehu: string | null = null;
  try {
    dnesBy = (await denniBeh(true)).polozky.map(({ trida, posle, email }) => ({ trida, posle, email }));
  } catch (e) { chybaBehu = e instanceof Error ? e.message : String(e); }

  const { data: ev } = await supabaseAdmin.from("analytics_events")
    .select("created_at, user_id, properties").eq("event_name", "email_odeslan")
    .order("created_at", { ascending: false }).limit(50);

  return NextResponse.json({ dnes, nahledy, dnesBy, chybaBehu, odeslane: ev ?? [] });
}
