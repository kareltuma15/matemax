import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { nastavOdhlaseni, overPodpis } from "@/lib/emaily/odeslat";

/**
 * Odhlášení z připomínek a novinek (uvítání, heslo, platby a testy chodí dál).
 * - POST ?u=&t= bez těla: „odhlásit jedním klikem“ přímo z Gmailu / Seznamu (hlavička List-Unsubscribe-Post).
 * - POST ?u=&t= s { odhlaseno: boolean }: stránka /emaily (odhlásit / znovu přihlásit).
 * Podpis t je HMAC z id účtu, cizí účet odhlásit nejde.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`emaily-odhlasit:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Příliš mnoho pokusů." }, { status: 429 });
  }
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!u || !overPodpis(u, t)) return NextResponse.json({ error: "Odkaz je neplatný." }, { status: 400 });
  let odhlaseno = true;
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const telo = (await req.json().catch(() => ({}))) as { odhlaseno?: boolean };
    if (typeof telo.odhlaseno === "boolean") odhlaseno = telo.odhlaseno;
  }
  const ok = await nastavOdhlaseni(u, odhlaseno);
  return ok ? NextResponse.json({ ok: true, odhlaseno }) : NextResponse.json({ error: "Nepodařilo se uložit." }, { status: 500 });
}
