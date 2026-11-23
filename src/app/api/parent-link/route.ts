import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  uzivatelZPozadavku, najdiUcetPodleEmailu, pocetRodicu, novyToken, normEmail, platnyEmail,
  MAX_RODICU,
} from "@/lib/rodic-link";

/**
 * Rodič požádá o propojení s dítětem podle e-mailu dítěte.
 * Propojení NEplatí hned: dítě ho musí povolit v appce (karta na Domově). Odpověď je vždy stejná,
 * ať účet s tím e-mailem existuje, nebo ne, takže se nedá zjišťovat, kdo má v MateMaxu účet.
 * (Dřív: propojení bylo ověřené okamžitě a 404 prozradilo, že e-mail nemá účet.)
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`parent-link:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Příliš mnoho pokusů. Zkuste to za pár minut." }, { status: 429 });
  }
  const user = await uzivatelZPozadavku(req);
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  if (!rateLimit(`parent-link-den:${user.id}`, 5, 24 * 3600_000)) {
    return NextResponse.json({ error: "Dnes jste odeslali už 5 žádostí. Další půjde poslat zítra." }, { status: 429 });
  }

  const { childEmail } = (await req.json().catch(() => ({}))) as { childEmail?: string };
  const email = normEmail(childEmail);
  if (!platnyEmail(email)) return NextResponse.json({ error: "Zadejte platný e-mail dítěte." }, { status: 400 });

  // Společný e-mail: rodič je přihlášený přímo účtem dítěte. Report se zapíná v profilu dítěte.
  if (email === normEmail(user.email)) {
    return NextResponse.json({ ok: true, stejnyEmail: true });
  }

  const odpoved = NextResponse.json({ ok: true });
  let dite;
  try { dite = await najdiUcetPodleEmailu(email); } catch (e) {
    console.error("[parent-link] hledání účtu selhalo:", e);
    return NextResponse.json({ error: "Žádost se nepodařilo odeslat. Zkuste to znovu." }, { status: 500 });
  }
  if (!dite) return odpoved;

  const { data: existujici } = await supabaseAdmin
    .from("parent_child_link").select("id, verified, created_at")
    .eq("parent_email", normEmail(user.email)).eq("child_user_id", dite.id).maybeSingle();
  if (existujici?.verified) return odpoved;
  if (!existujici && (await pocetRodicu(dite.id)) >= MAX_RODICU) return odpoved;

  const { error } = await supabaseAdmin.from("parent_child_link").upsert(
    {
      parent_email: normEmail(user.email),
      child_user_id: dite.id,
      verified: false,
      verified_at: null,
      token: novyToken("dite"),
      created_at: new Date().toISOString(),
    },
    { onConflict: "parent_email,child_user_id" },
  );
  // Chyba se jen zaloguje: jiná odpověď by prozradila, že účet existuje.
  if (error) console.error("[parent-link] uložení žádosti selhalo:", error.message);
  return odpoved;
}

