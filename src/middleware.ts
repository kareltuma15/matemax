import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStudentProtected = matches(pathname, STUDENT_PROTECTED);
  const isParentProtected = matches(pathname, PARENT_PROTECTED);
  const isAuthPage = matches(pathname, AUTH_PAGES);

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
