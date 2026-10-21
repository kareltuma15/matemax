import { NextResponse } from "next/server";

// Zdravotní kontrola pro hlídání dostupnosti (UptimeRobot apod.): 200 = aplikace běží a databáze odpovídá,
// 503 = aplikace běží, ale databáze ne. Nevrací žádná data uživatelů ani tajné hodnoty.
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function databaseOk(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    // Veřejně čitelná tabulka (publikované termíny online testů) — stačí jeden řádek, bez dat uživatelů.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/online_test_sessions?select=id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const started = Date.now();
  const db = await databaseOk();
  return NextResponse.json(
    {
      status: db ? "ok" : "degraded",
      db,
      ms: Date.now() - started,
      version: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null,
    },
    { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
