import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSubmissionReceived } from "@/lib/online-test-emails";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB / foto
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

// POST — žák nahraje fotky vyplněného záznamového archu.
// FormData: photo (0..N souborů, klíč se opakuje).
// Vytvoří / doplní submission, uploadne do bucketu `submissions`.
export async function POST(
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

  // Termín + čas
  const { data: session } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id, scheduled_at, is_published")
    .eq("id", id)
    .maybeSingle();
  if (!session || !session.is_published) {
    return NextResponse.json({ error: "Termín nenalezen" }, { status: 404 });
  }
  if (Date.now() < new Date(session.scheduled_at).getTime()) {
    return NextResponse.json({ error: "Test ještě nezačal" }, { status: 400 });
  }

  // Zaplacená přihláška
  const { data: enrollment } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("id, payment_status")
    .eq("session_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (enrollment?.payment_status !== "paid") {
    return NextResponse.json({ error: "Na tento termín nejsi přihlášen/a" }, { status: 403 });
  }

  // Nesmí odevzdat dvakrát (submission už má submitted_at)
  const { data: existing } = await supabaseAdmin
    .from("online_test_submissions")
    .select("id, submitted_at")
    .eq("enrollment_id", enrollment.id)
    .maybeSingle();
  if (existing?.submitted_at) {
    return NextResponse.json({ error: "Arch už jsi odevzdal/a" }, { status: 409 });
  }

  // Soubory
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const files = form.getAll("photo").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Nahraj alespoň jednu fotku archu" }, { status: 400 });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximálně ${MAX_PHOTOS} fotek` }, { status: 400 });
  }
  for (const f of files) {
    if (!ALLOWED_TYPES.has(f.type)) {
      return NextResponse.json({ error: "Fotky musí být JPG, PNG, WEBP nebo HEIC" }, { status: 400 });
    }
    if (f.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Jedna z fotek je příliš velká (max 12 MB)" }, { status: 400 });
    }
  }

  // Submission row (potřebujeme id pro cestu v bucketu)
  let submissionId = existing?.id as string | undefined;
  if (!submissionId) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from("online_test_submissions")
      .insert({ enrollment_id: enrollment.id })
      .select("id")
      .single();
    if (createErr || !created) {
      console.error("submit: create submission failed", createErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    submissionId = created.id;
  }

  // Upload fotek
  const photoPaths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = EXT[f.type] ?? "jpg";
    const path = `${submissionId}/foto-${i + 1}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("submissions")
      .upload(path, await f.arrayBuffer(), { contentType: f.type, upsert: true });
    if (upErr) {
      console.error("submit: upload failed", path, upErr);
      return NextResponse.json({ error: "Nahrání fotek selhalo, zkus to znovu" }, { status: 500 });
    }
    photoPaths.push(path);
  }

  const { error: updErr } = await supabaseAdmin
    .from("online_test_submissions")
    .update({
      photo_urls: photoPaths,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    })
    .eq("id", submissionId);
  if (updErr) {
    console.error("submit: update submission failed", updErr);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Potvrzení „arch přijat" — arch je odevzdaný, případné selhání emailu
  // nesmí žákovi vrátit chybu.
  const { data: sessionRow } = await supabaseAdmin
    .from("online_test_sessions")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const jmeno =
    (typeof meta.first_name === "string" && meta.first_name) ||
    (typeof meta.full_name === "string" && meta.full_name.split(" ")[0]) ||
    (user.email ?? "").split("@")[0];
  if (user.email && sessionRow) {
    await sendSubmissionReceived({
      to: user.email,
      jmeno,
      title: sessionRow.title,
      sessionId: id,
      photoCount: photoPaths.length,
    });
  }

  return NextResponse.json({ ok: true, photos: photoPaths.length });
}
