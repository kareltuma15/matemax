import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { cistaOdpoved } from "@/lib/mereni-plan";
import { vlozDoSchranky } from "@/lib/schranka";

/**
 * Nahlášená chyba v úloze (úprava appky 8): uloží se do Schránky adminu (schranka, druh chyba_ulohy).
 * Bez přihlášení jde nahlásit taky (ukázky), jen bez žáka. Odpověď jen číslo nebo volba (cistaOdpoved), poznamka max 300 znaků.
 * Jedna úloha od jednoho žáka nejvýš jednou za den.
 */
const DUVODY = new Set(["spatny_vysledek", "nejasne_zadani", "chyba_obrazku", "jine"]);

export async function POST(req: NextRequest) {
  if (!rateLimit(`nahlasit:${clientIp(req)}`, 10, 60 * 60_000)) return NextResponse.json({ error: "Příliš mnoho hlášení, zkus to později." }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { uloha?: unknown; duvod?: unknown; poznamka?: unknown; odpoved?: unknown } | null;
  const uloha = typeof b?.uloha === "string" && /^[A-Za-z0-9_\-]{1,60}$/.test(b.uloha) ? b.uloha : null;
  const duvod = typeof b?.duvod === "string" && DUVODY.has(b.duvod) ? b.duvod : null;
  if (!uloha || !duvod) return NextResponse.json({ error: "Neplatné hlášení" }, { status: 400 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Nedostupné" }, { status: 503 });
  const poznamka = typeof b?.poznamka === "string" ? b.poznamka.trim().slice(0, 300) : "";
  const odpoved = typeof b?.odpoved === "string" ? cistaOdpoved(b.odpoved) : null;

  let userId: string | null = null;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data } = await sb.auth.getUser();
    userId = data.user?.id ?? null;
  }
  const den = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });
  const { chyba } = await vlozDoSchranky([{
    druh: "chyba_ulohy", user_id: userId, uloha_id: uloha, text: poznamka || null,
    // Proti duplicitám jen u přihlášených (žádná IP adresa se neukládá); anonymní hlášení hlídá rate limit
    detail: { duvod, ...(odpoved ? { odpoved } : {}) }, zdroj_id: userId ? `${userId}:${uloha}:${den}`.slice(0, 120) : null,
  }]);
  if (chyba) return NextResponse.json({ error: "Nepodařilo se uložit" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
