import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TEST_TOPICS, TEST_MAX_POINTS } from "@/lib/online-test-topics";

const PHOTO_URL_TTL = 60 * 60 * 4; // 4h na prohlížení při opravě

export interface AdminSubmissionDetail {
  id: string;
  email: string;
  sessionId: string;
  sessionTitle: string;
  scheduledAt: string;
  submittedAt: string | null;
  status: string;
  photoUrls: string[];
  body: Record<string, number | null>;
  bodyCelkem: number | null;
  komentarCelkovy: string | null;
  komentarTemy: Record<string, string>;
  silneStranky: string | null;
  doporuceni: string | null;
  emailSentAt: string | null;
}

// Načte submission + navázaný enrollment/session. Sdíleno GET i PATCH.
async function loadContext(sid: string) {
  const { data: sub } = await supabaseAdmin!
    .from("online_test_submissions")
    .select("*")
    .eq("id", sid)
    .maybeSingle();
  if (!sub) return null;

  const { data: enrollment } = await supabaseAdmin!
    .from("online_test_enrollments")
    .select("id, user_id, session_id")
    .eq("id", sub.enrollment_id)
    .maybeSingle();
  if (!enrollment) return null;

  const { data: session } = await supabaseAdmin!
    .from("online_test_sessions")
    .select("id, title, scheduled_at")
    .eq("id", enrollment.session_id)
    .maybeSingle();
  if (!session) return null;

  return { sub, enrollment, session };
}

// GET — detail odevzdaného testu pro opravu (fotky přes signed URL)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sid: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const { sid } = await params;
  const ctx = await loadContext(sid);
  if (!ctx) return NextResponse.json({ error: "Odevzdání nenalezeno" }, { status: 404 });
  const { sub, enrollment, session } = ctx;

  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);
  const email = userRes?.user?.email ?? "(neznámý)";

  // Signed URL pro každou fotku
  const photoUrls: string[] = [];
  for (const path of (sub.photo_urls ?? []) as string[]) {
    const { data } = await supabaseAdmin.storage
      .from("submissions")
      .createSignedUrl(path, PHOTO_URL_TTL);
    if (data?.signedUrl) photoUrls.push(data.signedUrl);
  }

  const body: Record<string, number | null> = {};
  for (const t of TEST_TOPICS) body[t] = sub[`body_${t}`] ?? null;

  const result: AdminSubmissionDetail = {
    id: sub.id,
    email,
    sessionId: session.id,
    sessionTitle: session.title,
    scheduledAt: session.scheduled_at,
    submittedAt: sub.submitted_at,
    status: sub.status,
    photoUrls,
    body,
    bodyCelkem: sub.body_celkem,
    komentarCelkovy: sub.komentar_celkovy,
    komentarTemy: (sub.komentar_temy as Record<string, string>) ?? {},
    silneStranky: sub.silne_stranky,
    doporuceni: sub.doporuceni,
    emailSentAt: sub.email_sent_at,
  };

  return NextResponse.json(result);
}

// PATCH — uložení opravy (draft nebo finální)
// Body: { body: {tema: number|null}, body_celkem, komentar_temy, silne_stranky,
//         doporuceni, komentar_celkovy, markReviewed?: boolean }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sid: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const { sid } = await params;
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const update: Record<string, unknown> = {};

  // Body per téma — číslo v rozsahu 0..TEST_MAX_POINTS, nebo null (nevyplněno)
  if (payload.body && typeof payload.body === "object") {
    for (const t of TEST_TOPICS) {
      if (!(t in payload.body)) continue;
      const v = payload.body[t];
      if (v === null || v === "") { update[`body_${t}`] = null; continue; }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > TEST_MAX_POINTS) {
        return NextResponse.json({ error: `Neplatné body pro téma ${t}` }, { status: 400 });
      }
      update[`body_${t}`] = n;
    }
  }

  if ("body_celkem" in payload) {
    const v = payload.body_celkem;
    if (v === null || v === "") update.body_celkem = null;
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > TEST_MAX_POINTS) {
        return NextResponse.json({ error: "Neplatné celkové body" }, { status: 400 });
      }
      update.body_celkem = n;
    }
  }

  if (payload.komentar_temy && typeof payload.komentar_temy === "object") {
    // Jen známá témata, jen neprázdné stringy
    const clean: Record<string, string> = {};
    for (const t of TEST_TOPICS) {
      const c = payload.komentar_temy[t];
      if (typeof c === "string" && c.trim()) clean[t] = c.trim();
    }
    update.komentar_temy = clean;
  }

  for (const field of ["silne_stranky", "doporuceni", "komentar_celkovy"] as const) {
    if (field in payload) {
      const v = payload[field];
      update[field] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
  }

  if (payload.markReviewed === true) {
    update.status = "reviewed";
    update.reviewed_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("online_test_submissions")
    .update(update)
    .eq("id", sid)
    .select("id, status")
    .single();

  if (error) {
    console.error("admin submission PATCH error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission: data });
}
