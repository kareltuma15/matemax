import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "karel.tuma15@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

/** Je e-mail adminem? Admin se nikam nepočítá (měření, statistiky, online). */
export function jeAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export type AdminAuthResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: 401 | 403; error: string };

// Verifies the Bearer token and checks the caller is in ADMIN_EMAILS.
export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await caller.auth.getUser();
  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // Druhý faktor (SY-01): kdo ho má zapnutý, musí mít relaci ověřenou kódem (aal2 v tokenu)
  if ((user.factors ?? []).some((f) => f.status === "verified")) {
    let aal: unknown = null;
    try { aal = JSON.parse(Buffer.from(authHeader.slice(7).split(".")[1] ?? "", "base64url").toString("utf8")).aal; } catch { aal = null; }
    if (aal !== "aal2") return { ok: false, status: 403, error: "Ověř druhý faktor (MateMax Admin → Ověření)." };
  }

  void zapisRoliAdmina(user.id);
  return { ok: true, userId: user.id, email: user.email ?? "" };
}

/** Role admina v tabulce admin_role (SY-01, model rolí pro fázi D). Zapisuje se jednou za běh serveru. */
const zapsaneRole = new Set<string>();
async function zapisRoliAdmina(userId: string): Promise<void> {
  if (zapsaneRole.has(userId)) return;
  zapsaneRole.add(userId);
  try {
    const { supabaseAdmin } = await import("./supabase-admin");
    if (!supabaseAdmin) return;
    const { error } = await supabaseAdmin.from("admin_role").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) zapsaneRole.delete(userId);
  } catch { zapsaneRole.delete(userId); }
}
