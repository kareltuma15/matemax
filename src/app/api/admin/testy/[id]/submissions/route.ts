import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface AdminSubmissionRow {
  enrollmentId: string;
  submissionId: string | null;
  userId: string;
  email: string;
  submittedAt: string | null;
  status: "nezadano" | "submitted" | "reviewed" | "sent";
  bodyCelkem: number | null;
  photoCount: number;
}

export interface AdminSubmissionsResponse {
  session: { id: string; title: string; scheduled_at: string };
  rows: AdminSubmissionRow[];
}

// GET — seznam zaplacených přihlášek termínu + stav jejich odevzdání/opravy
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const { id } = await params;

  const { data: session } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id, title, scheduled_at")
    .eq("id", id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Termín nenalezen" }, { status: 404 });

  const { data: enrollments, error } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("id, user_id")
    .eq("session_id", id)
    .eq("payment_status", "paid");

  if (error) {
    console.error("admin submissions GET error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const enrollmentIds = (enrollments ?? []).map((e) => e.id);

  const subMap = new Map<string, {
    id: string; submitted_at: string | null; status: string;
    body_celkem: number | null; photo_urls: string[] | null;
  }>();
  if (enrollmentIds.length > 0) {
    const { data: subs } = await supabaseAdmin
      .from("online_test_submissions")
      .select("id, enrollment_id, submitted_at, status, body_celkem, photo_urls")
      .in("enrollment_id", enrollmentIds);
    for (const s of subs ?? []) subMap.set(s.enrollment_id as string, s);
  }

  // Emaily žáků
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>();
  for (const u of authData?.users ?? []) emailMap.set(u.id, u.email ?? "(bez emailu)");

  const rows: AdminSubmissionRow[] = (enrollments ?? []).map((e) => {
    const s = subMap.get(e.id);
    return {
      enrollmentId: e.id,
      submissionId: s?.id ?? null,
      userId: e.user_id,
      email: emailMap.get(e.user_id) ?? "(neznámý)",
      submittedAt: s?.submitted_at ?? null,
      status: !s?.submitted_at ? "nezadano" : (s.status as "submitted" | "reviewed" | "sent"),
      bodyCelkem: s?.body_celkem ?? null,
      photoCount: s?.photo_urls?.length ?? 0,
    };
  });

  // Odevzdané nahoru, pak podle času odevzdání
  rows.sort((a, b) => {
    if (!!a.submittedAt !== !!b.submittedAt) return a.submittedAt ? -1 : 1;
    if (a.submittedAt && b.submittedAt) return a.submittedAt.localeCompare(b.submittedAt);
    return a.email.localeCompare(b.email);
  });

  const result: AdminSubmissionsResponse = { session, rows };
  return NextResponse.json(result);
}
