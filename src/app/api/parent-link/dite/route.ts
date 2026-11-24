import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { posliEmail, pozvankaRodice } from "@/lib/emaily/rodice";
import {
  uzivatelZPozadavku, novyToken, normEmail, platnyEmail, druhTokenu, propadla, pocetRodicu, jmenoDitete,
  MAX_RODICU, type LinkRow,
} from "@/lib/rodic-link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://matemax.matematika-snadno.cz";

export type StavRodice = "aktivni" | "ceka_na_tebe" | "ceka_na_rodice";
export interface RodicDitete { id: string; email: string; stav: StavRodice; stejny: boolean }

function stav(r: LinkRow): StavRodice {
  if (r.verified) return "aktivni";
  return druhTokenu(r.token) === "rodic" ? "ceka_na_rodice" : "ceka_na_tebe";
}

/** Dítě: komu chodí report a kdo žádá o propojení. */
export async function GET(req: NextRequest) {
  const user = await uzivatelZPozadavku(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  const { data } = await supabaseAdmin
    .from("parent_child_link").select("id, parent_email, child_user_id, verified, token, created_at, verified_at")
    .eq("child_user_id", user.id).order("created_at");
  const vlastni = normEmail(user.email);
  const rodice: RodicDitete[] = ((data ?? []) as LinkRow[])
    .filter((r) => !propadla(r))
    .map((r) => ({ id: r.id, email: r.parent_email, stav: stav(r), stejny: normEmail(r.parent_email) === vlastni }));
  return NextResponse.json({ email: user.email, rodice });
}

/**
 * Dítě: povolit / odmítnout žádost rodiče, zapnout report na vlastní (společný) e-mail,
 * pozvat rodiče s jiným e-mailem (rodič potvrdí odkazem v e-mailu), zrušit propojení.
 */
export async function POST(req: NextRequest) {
  const user = await uzivatelZPozadavku(req);
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  if (!rateLimit(`parent-link-dite:${user.id}`, 20, 3600_000)) {
    return NextResponse.json({ error: "Moc pokusů za sebou. Zkus to za chvíli." }, { status: 429 });
  }

  const telo = (await req.json().catch(() => ({}))) as { akce?: string; id?: string; email?: string };
  const tabulka = () => supabaseAdmin!.from("parent_child_link");

  if (telo.akce === "povolit" || telo.akce === "zrusit") {
    if (!telo.id) return NextResponse.json({ error: "Chybí žádost." }, { status: 400 });
    const { data: r } = await tabulka().select("*").eq("id", telo.id).eq("child_user_id", user.id).maybeSingle();
    const row = r as LinkRow | null;
    if (!row) return NextResponse.json({ error: "Žádost už neexistuje." }, { status: 404 });
    if (telo.akce === "zrusit") {
      await tabulka().delete().eq("id", row.id);
      return NextResponse.json({ ok: true });
    }
    if (row.verified) return NextResponse.json({ ok: true });
    if (druhTokenu(row.token) !== "dite" || propadla(row)) {
      return NextResponse.json({ error: "Tuhle žádost nejde povolit. Požádej rodiče, ať ji pošle znovu." }, { status: 400 });
    }
    await tabulka().update({ verified: true, verified_at: new Date().toISOString() }).eq("id", row.id);
    return NextResponse.json({ ok: true });
  }

  if (telo.akce === "stejny" || telo.akce === "pozvat") {
    const vlastni = normEmail(user.email);
    const email = telo.akce === "stejny" ? vlastni : normEmail(telo.email);
    if (!platnyEmail(email)) return NextResponse.json({ error: "Zadej platný e-mail rodiče." }, { status: 400 });
    const stejny = email === vlastni;

    const { data: ex } = await tabulka().select("*").eq("parent_email", email).eq("child_user_id", user.id).maybeSingle();
    const existujici = ex as LinkRow | null;
    if (existujici?.verified) return NextResponse.json({ ok: true });
    if (!existujici && (await pocetRodicu(user.id)) >= MAX_RODICU) {
      return NextResponse.json({ error: `Report může chodit nejvýš ${MAX_RODICU} rodičům. Nejdřív některého odeber.` }, { status: 400 });
    }
    if (!stejny && !rateLimit(`parent-pozvanka:${user.id}`, 5, 24 * 3600_000)) {
      return NextResponse.json({ error: "Dnes už jsi poslal(a) 5 pozvánek. Další půjde poslat zítra." }, { status: 429 });
    }

    const token = novyToken(stejny ? "stejny" : "rodic");
    const { error } = await tabulka().upsert(
      {
        parent_email: email,
        child_user_id: user.id,
        verified: stejny,
        verified_at: stejny ? new Date().toISOString() : null,
        token,
        created_at: new Date().toISOString(),
      },
      { onConflict: "parent_email,child_user_id" },
    );
    if (error) {
      console.error("[parent-link/dite] uložení selhalo:", error.message);
      return NextResponse.json({ error: "Nepodařilo se uložit. Zkus to znovu." }, { status: 500 });
    }
    if (!stejny) {
      const odeslano = await posliPozvanku(email, jmenoDitete(user), token.split(":")[1]);
      if (!odeslano) {
        await tabulka().delete().eq("parent_email", email).eq("child_user_id", user.id).eq("verified", false);
        return NextResponse.json({ error: "E-mail rodiči se nepodařilo odeslat. Zkontroluj adresu a zkus to znovu." }, { status: 502 });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });
}

/** E-mail rodiči: potvrzení odběru (společná šablona, src/lib/emaily/rodice.ts). Bez potvrzení nic dalšího nechodí. */
async function posliPozvanku(komu: string, jmeno: string, t: string): Promise<boolean> {
  return posliEmail(komu, pozvankaRodice(jmeno, `${APP_URL}/rodice/potvrdit?t=${encodeURIComponent(t)}`), "pozvanka");
}
