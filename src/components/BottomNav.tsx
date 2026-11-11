"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Spodní navigace žáka, stejná pro 5. i 9. třídu. Položka svítí i na podstránkách
 * (např. Testy na diagnostice, Trénink na výzvě a rychlém módu).
 */
const STUDENT_ITEMS = [
  { href: "/",        label: "Domů",    ikona: "M3 11l9-7l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z", sekce: [] as string[] },
  { href: "/trenink", label: "Trénink", ikona: "M4 19h16M6 15V9M10 15V5M14 15v-4M18 15V7", sekce: ["/vyzva", "/rychly-mod", "/studijni-plan"] },
  { href: "/testy",   label: "Testy",   ikona: "M7 3h10v18H7ZM10 8h4M10 12h4M10 16h2", sekce: ["/diagnostika", "/cermat-test", "/testy-nanecisto", "/test"] },
  { href: "/profil",  label: "Profil",  ikona: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0", sekce: [] as string[] },
];

function jeAktivni(pathname: string, href: string, sekce: string[]): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...sekce].some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const PARENT_NAV_ITEMS = [
  { href: "/rodice/dashboard",  icon: "📊", label: "Přehled" },
  { href: "/rodice/propojeni",  icon: "🔗", label: "Propojení" },
  { href: "/rodice/nastaveni",  icon: "⚙️", label: "Nastavení" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const isParentSection = pathname.startsWith("/rodice");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoggedIn(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleParentSignOut() {
    if (supabase) await supabase.auth.signOut();
    try { localStorage.removeItem("matemax-trida"); } catch { /* soukromé okno */ }
    router.push("/");
  }

  if (!loggedIn) return null;

  if (isParentSection) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          background: "#064E3B",
          borderColor: "#065f46",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="max-w-2xl mx-auto flex px-2 py-1">
          {PARENT_NAV_ITEMS.map(({ href, icon, label }) => {
            const active = pathname === href || pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all press-scale"
                style={
                  active
                    ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
                    : { color: "#6ee7b7" }
                }
              >
                <span className="text-xl leading-none">{icon}</span>
                <span className="text-[10px] font-bold leading-none" style={{ color: active ? "#fff" : "#6ee7b7" }}>
                  {label}
                </span>
              </Link>
            );
          })}
          {/* Sign-out button */}
          <button
            type="button"
            onClick={handleParentSignOut}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all press-scale"
            style={{ color: "#6ee7b7" }}
          >
            <span className="text-xl leading-none">🚪</span>
            <span className="text-[10px] font-bold leading-none" style={{ color: "#6ee7b7" }}>Odhlásit</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="app-chrome fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-xl mx-auto grid grid-cols-4 gap-1 px-1.5 pt-1.5 pb-2">
        {STUDENT_ITEMS.map(({ href, label, ikona, sekce }) => {
          const active = jeAktivni(pathname, href, sekce);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold press-scale"
              style={active ? { background: "#EEF0F8", color: "#0D1B3E" } : { color: "#8A93AA" }}
            >
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={ikona} />
              </svg>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
