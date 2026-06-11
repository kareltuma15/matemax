import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

// kind → název souboru v bucketu + sloupec v online_test_sessions
const KINDS: Record<string, { filename: string; column: string }> = {
  zadani: { filename: "zadani.pdf", column: "zadani_pdf_url" },
  arch: { filename: "zaznamovy-arch.pdf", column: "zaznamovy_arch_pdf_url" },
  rozbor: { filename: "rozbor.pdf", column: "rozbor_pdf_url" },
};

// POST — nahrání PDF (zadání / záznamový arch / rozbor) k termínu.
// FormData: file (PDF), kind ("zadani" | "arch" | "rozbor")
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const { id } = await params;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const kind = form.get("kind");
  const file = form.get("file");

  if (typeof kind !== "string" || !KINDS[kind]) {
    return NextResponse.json({ error: "Neplatný typ souboru (kind)" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chybí soubor" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Soubor musí být PDF" }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF je příliš velké (max 20 MB)" }, { status: 400 });
  }

  // Ověř, že termín existuje
  const { data: session } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Termín nenalezen" }, { status: 404 });

  const { filename, column } = KINDS[kind];
  const path = `${id}/${filename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("test-sessions")
    .upload(path, await file.arrayBuffer(), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("admin/testy upload error:", uploadError);
    return NextResponse.json({ error: "Upload selhal" }, { status: 500 });
  }

  // Bucket je privátní — ukládáme cestu, ne veřejnou URL.
  // Žák dostane signed URL přes API až v testovací místnosti (další kolo).
  const { data, error } = await supabaseAdmin
    .from("online_test_sessions")
    .update({ [column]: path })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("admin/testy upload DB error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
