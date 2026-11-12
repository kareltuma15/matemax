"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import { STUDENT_ITEMS, jeAktivni } from "@/lib/navigace";

/** Spodní navigace žáka na telefonu (na počítači jsou stejné odkazy v horní liště). */
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
      className="app-chrome lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100"
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
