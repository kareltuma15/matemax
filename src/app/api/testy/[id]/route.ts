import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Kdy se co odemyká
const ARCH_UNLOCK_MS = 24 * 60 * 60 * 1000; // záznamový arch: 24h před startem
const ARCH_URL_TTL = 60 * 60 * 24;          // signed URL platí 24h
const ZADANI_URL_TTL = 60 * 60 * 4;         // zadání: 4h (test + rezerva)
const ROZBOR_URL_TTL = 60 * 60 * 24 * 7;    // rozbor: týden

export type TestRoomPhase =
  | "before"     // před oknem tisku archu (>24h do startu)
  | "prep"       // 24h okno: lze tisknout arch, čeká se na start
  | "live"       // test běží: zadání odemčeno
  | "upload"     // test skončil, ještě neodevzdáno
  | "submitted"  // odevzdáno, čeká na opravu
  | "results";   // opraveno — výsledky dostupné

export interface TestRoomSubmission {
  submitted_at: string | null;
  status: string;
  // Výsledky — jen když reviewed/sent
  body_celkem: number | null;
  body: Record<string, number | null>;
  komentar_celkovy: string | null;
  komentar_temy: Record<string, string> | null;
  silne_stranky: string | null;
  doporuceni: string | null;
}

export interface TestRoomData {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  price_czk: number;
  enrolled: boolean;
  phase: TestRoomPhase;
  serverNow: string;
  endsAt: string;
  archUrl: string | null;
  zadaniUrl: string | null;
  rozborUrl: string | null;
  submission: TestRoomSubmission | null;
}

// GET — detail testovací místnosti pro přihlášeného (a zaplaceného) žáka.
// Vyžaduje Bearer token. Odemyká PDF podle času a stavu přihlášky.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Termín
  const { data: session } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id, title, scheduled_at, duration_minutes, price_czk, is_published, zadani_pdf_url, zaznamovy_arch_pdf_url, rozbor_pdf_url")
    .eq("id", id)
    .maybeSingle();

  if (!session || !session.is_published) {
    return NextResponse.json({ error: "Termín nenalezen" }, { status: 404 });
  }

  // Přihláška (musí být zaplacená)
  const { data: enrollment } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("id, payment_status")
    .eq("session_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const enrolled = enrollment?.payment_status === "paid";
  if (!enrolled) {
    return NextResponse.json({ error: "Na tento termín nejsi přihlášen/a" }, { status: 403 });
  }

  // Submission (pokud existuje)
  const { data: sub } = await supabaseAdmin
    .from("online_test_submissions")
    .select("*")
    .eq("enrollment_id", enrollment!.id)
    .maybeSingle();

  // ── Časová logika ────────────────────────────────────────────────────────
  const now = Date.now();
  const startMs = new Date(session.scheduled_at).getTime();
  const endMs = startMs + session.duration_minutes * 60_000;

  const archOpen = now >= startMs - ARCH_UNLOCK_MS;
  const testStarted = now >= startMs;
  const testEnded = now >= endMs;

  const reviewed = sub?.status === "reviewed" || sub?.status === "sent";
  const submitted = !!sub?.submitted_at;

  let phase: TestRoomPhase;
  if (reviewed) phase = "results";
  else if (submitted) phase = "submitted";
  else if (testEnded) phase = "upload";
  else if (testStarted) phase = "live";
  else if (archOpen) phase = "prep";
  else phase = "before";

  // ── Signed URLs ──────────────────────────────────────────────────────────
  async function signed(path: string | null, ttl: number): Promise<string | null> {
    if (!path) return null;
    const { data } = await supabaseAdmin!.storage
      .from("test-sessions")
      .createSignedUrl(path, ttl);
    return data?.signedUrl ?? null;
  }

  // Arch: dostupný v přípravném okně i během testu
  const archUrl = archOpen ? await signed(session.zaznamovy_arch_pdf_url, ARCH_URL_TTL) : null;
  // Zadání: až od startu (nikdy ne dřív — nesmí uniknout)
  const zadaniUrl = testStarted ? await signed(session.zadani_pdf_url, ZADANI_URL_TTL) : null;
  // Rozbor: až když je test opravený
  const rozborUrl = reviewed ? await signed(session.rozbor_pdf_url, ROZBOR_URL_TTL) : null;

  const submission: TestRoomSubmission | null = sub
    ? {
        submitted_at: sub.submitted_at,
        status: sub.status,
        body_celkem: reviewed ? sub.body_celkem : null,
        body: reviewed
          ? {
              zlomky: sub.body_zlomky,
              vyrazy: sub.body_vyrazy,
              rovnice: sub.body_rovnice,
              geometrie: sub.body_geometrie,
              slovni_ulohy: sub.body_slovni_ulohy,
              grafy: sub.body_grafy,
              uhly: sub.body_uhly,
              konstrukce: sub.body_konstrukce,
              kombinovane: sub.body_kombinovane,
            }
          : {},
        komentar_celkovy: reviewed ? sub.komentar_celkovy : null,
        komentar_temy: reviewed ? sub.komentar_temy : null,
        silne_stranky: reviewed ? sub.silne_stranky : null,
        doporuceni: reviewed ? sub.doporuceni : null,
      }
    : null;

  const result: TestRoomData = {
    id: session.id,
    title: session.title,
    scheduled_at: session.scheduled_at,
    duration_minutes: session.duration_minutes,
    price_czk: session.price_czk,
    enrolled: true,
    phase,
    serverNow: new Date(now).toISOString(),
    endsAt: new Date(endMs).toISOString(),
    archUrl,
    zadaniUrl,
    rozborUrl,
    submission,
  };

  return NextResponse.json(result);
}
