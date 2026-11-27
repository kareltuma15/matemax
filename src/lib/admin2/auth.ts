/**
 * Ochrana nového adminu na serveru (SY-01): přihlášení přes cookies relace, admin e-mail a druhý faktor.
 * Když má admin ověřený TOTP faktor (Supabase MFA, zdarma), musí mít relace úroveň aal2.
 * Používá layout adminu, serverové akce i proxy.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { jeAdminEmail } from "@/lib/admin-auth";

export type StavAdmina =
  | { ok: true; user: User; maFaktor: boolean; aal2: boolean }
  | { ok: false; duvod: "neprihlasen" | "neni_admin" | "overit_faktor" };

export async function supabaseZCookies() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(cs) { try { cs.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* v server komponentě nejde zapisovat, obnoví proxy */ } },
    },
  });
}

/** Zjistí, jestli je přihlášený admin a jestli prošel druhým faktorem. `bezFaktoru` = stránka nastavení faktoru. */
export async function stavAdmina(bezFaktoru = false): Promise<StavAdmina> {
  if (await jeE2e()) return { ok: true, user: { id: "00000000-0000-4000-8000-0000000000e2", email: "admin-e2e@example.invalid", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-27T00:00:00Z" } as User, maFaktor: true, aal2: true };
  const sb = await supabaseZCookies();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, duvod: "neprihlasen" };
  if (!jeAdminEmail(user.email)) return { ok: false, duvod: "neni_admin" };
  const maFaktor = (user.factors ?? []).some((f) => f.status === "verified");
  let aal2 = false;
  if (maFaktor) {
    const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    aal2 = data?.currentLevel === "aal2";
    if (!aal2 && !bezFaktoru) return { ok: false, duvod: "overit_faktor" };
  }
  return { ok: true, user, maFaktor, aal2 };
}

/** Pro serverové akce: vyhodí chybu, když volající není ověřený admin. */
export async function vyzadujAdmina(): Promise<User> {
  const s = await stavAdmina();
  if (!s.ok) throw new Error(s.duvod === "overit_faktor" ? "Ověř druhý faktor." : "Přístup jen pro admina.");
  return s.user;
}

/** E2E testy nového adminu: jen vývojový server s ADMIN2_E2E=1 a cookie admin2_e2e. Vždy s demo daty, nikdy na produkci. */
export async function jeE2e(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development" || process.env.ADMIN2_E2E !== "1") return false;
  return (await cookies()).get("admin2_e2e")?.value === "1";
}
