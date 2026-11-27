import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jeAdminEmail } from "@/lib/admin-auth";

// Routes that require a logged-in student session
const STUDENT_PROTECTED = ["/profil", "/vitej"];
// Routes that require a logged-in parent session
const PARENT_PROTECTED = ["/rodice/dashboard", "/rodice/propojeni", "/rodice/nastaveni"];
// Auth pages — redirect away if already logged in
const AUTH_PAGES = ["/prihlaseni", "/registrace"];

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  return response;
}

function matches(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStudentProtected = matches(pathname, STUDENT_PROTECTED);
  const isParentProtected = matches(pathname, PARENT_PROTECTED);
  const isAuthPage = matches(pathname, AUTH_PAGES);

  // Admin (stránky i rozhraní): žádná indexace vyhledávači a žádné veřejné cachování (admin 2.1, KO-10)
  if (matches(pathname, ["/admin", "/api/admin"])) {
    const hlavicky = (r: NextResponse) => {
      withSecurityHeaders(r);
      r.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      r.headers.set("Cache-Control", "private, no-store, max-age=0");
      return r;
    };
    // Rozhraní /api/admin si ověřují admina samy (Bearer token). Nový admin (/admin/novy) má data už na serveru,
    // proto ho proxy chrání přihlášením, admin e-mailem a druhým faktorem (SY-01). Starý admin je klientský.
    if (pathname.startsWith("/api/") || !matches(pathname, ["/admin/novy"])) return hlavicky(NextResponse.next());
    // E2E testy nového adminu: jen vývojový server s ADMIN2_E2E=1 a cookie admin2_e2e (vždy s demo daty)
    if (process.env.NODE_ENV === "development" && process.env.ADMIN2_E2E === "1" && request.cookies.get("admin2_e2e")?.value === "1") return hlavicky(NextResponse.next());
    let res = NextResponse.next({ request });
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cs) { cs.forEach(({ name, value }) => request.cookies.set(name, value)); res = NextResponse.next({ request }); cs.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
      },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      const cil = new URL("/prihlaseni", request.url);
      cil.searchParams.set("next", pathname);
      return hlavicky(NextResponse.redirect(cil));
    }
    if (!jeAdminEmail(user.email)) return hlavicky(NextResponse.redirect(new URL("/", request.url)));
    // Druhý faktor: kdo ho má zapnutý, musí mít ověřenou relaci (aal2). Výjimka: stránky ověření a nastavení faktoru.
    if ((user.factors ?? []).some((f) => f.status === "verified") && !matches(pathname, ["/admin/novy/overeni", "/admin/novy/zabezpeceni"])) {
      const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel !== "aal2") return hlavicky(NextResponse.redirect(new URL("/admin/novy/overeni", request.url)));
    }
    return hlavicky(res);
  }

  // Skip auth check for routes that don't need it — just add security headers
  if (!isStudentProtected && !isParentProtected && !isAuthPage) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Build a Supabase server client that can read and refresh the session cookie
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens back into both the request and the response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates and refreshes the session — do NOT add code between
  // createServerClient and this call (per Supabase SSR docs)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isStudentProtected) {
      const target = new URL("/prihlaseni", request.url);
      target.searchParams.set("next", pathname);
      return withSecurityHeaders(NextResponse.redirect(target));
    }
    if (isParentProtected) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/rodice/prihlaseni", request.url))
      );
    }
  }

  // Logged-in user visiting an auth page → send to training
  if (user && isAuthPage) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/trenink", request.url))
    );
  }

  return withSecurityHeaders(response);
}

export const config = {
  // Run on all paths except static assets and the auth callback (which handles token exchange)
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/icon|sw\\.js|icons/|auth/callback).*)",
  ],
};
