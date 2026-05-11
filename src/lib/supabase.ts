import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Browser: cookie-based session (readable by middleware and server components).
// Server (API routes, SSR pass): vanilla client without session persistence —
// these callers do DB-only operations that don't need the user session.
export const supabase =
  url && key
    ? typeof window !== "undefined"
      ? createBrowserClient(url, key)
      : createClient(url, key, { auth: { persistSession: false } })
    : null;
