/**
 * Společné načítání dat pro admin (jen server). Admin 2.1 fáze A1:
 *  - Supabase vrátí na jeden dotaz nejvýš 1 000 řádků (i když se pošle .limit(50000)), proto se všechno
 *    čte po stránkách. Useknutá data byla příčinou „56 návštěvníků za 30 dní“ a „odeslali registraci 3“.
 *  - Kdo se nepočítá, se rozhoduje na jednom místě: testovací účty (app_metadata.testovaci) a admin.
 */
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase-admin";
import { jeAdminEmail } from "./admin-auth";

type Dotaz<T> = (od: number, do_: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Všechny řádky dotazu po stránkách po 1 000 (strop Supabase). Dotaz musí mít stabilní řazení (.order). */
export async function nactiVse<T>(dotaz: Dotaz<T>, max = 200_000): Promise<T[]> {
  const out: T[] = [];
  for (let od = 0; od < max; od += 1000) {
    const { data, error } = await dotaz(od, od + 999);
    if (error) throw new Error(error.message);
    const d = data ?? [];
    out.push(...d);
    if (d.length < 1000) break;
  }
  return out;
}

/** Všechny účty (auth.users) po stránkách. */
export async function vsechnyUcty(): Promise<User[]> {
  if (!supabaseAdmin) return [];
  const out: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const u = data?.users ?? [];
    out.push(...u);
    if (u.length < 1000) break;
  }
  return out;
}

/** Účet, který se nepočítá do žádného čísla: testovací účet nebo admin. */
export function jeVyloucenyUcet(u: Pick<User, "email" | "app_metadata">): boolean {
  return !!(u.app_metadata as Record<string, unknown> | undefined)?.testovaci || jeAdminEmail(u.email);
}

/** ID účtů, které se nepočítají (testovací + admin). */
export function vylouceneUcty(users: Pick<User, "id" | "email" | "app_metadata">[]): Set<string> {
  return new Set(users.filter(jeVyloucenyUcet).map((u) => u.id));
}
