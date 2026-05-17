import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/trenink";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Pokud jde o novou registraci přes Google OAuth, pošleme uvítací email
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isNewUser = Date.now() - new Date(user.created_at).getTime() < 60_000;
        if (isNewUser) {
          const fullName = (user.user_metadata?.full_name as string | undefined)
            ?? (user.user_metadata?.name as string | undefined)
            ?? "";
          const firstName = fullName.split(" ")[0] ?? "";
          fetch(`${origin}/api/welcome-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, firstName }),
          }).catch(() => {});
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/prihlaseni?error=auth_callback_failed`);
}
