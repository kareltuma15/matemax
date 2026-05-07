import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Service-role client for server-side routes that need cross-user data access.
// Returns null if env vars are not set — callers must handle this gracefully.
export const supabaseAdmin =
  url && key
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;
