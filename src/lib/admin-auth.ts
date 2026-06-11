import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "karel.tuma15@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

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

  return { ok: true, userId: user.id, email: user.email ?? "" };
}
