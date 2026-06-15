"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STUDENT_ITEMS = [
  { href: "/",                icon: "🏠", label: "Domů" },
  { href: "/trenink",         icon: "💪", label: "Trénink" },
  { href: "/vyzva",           icon: "🏆", label: "Výzva" },
  { href: "/testy-nanecisto", icon: "📝", label: "Testy" },
  { href: "/profil",          icon: "👤", label: "Profil" },
];

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
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-2xl mx-auto flex px-2 py-1">
        {STUDENT_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all rounded-xl py-1.5 press-scale"
              style={
                active
                  ? { background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.1)", color: "#0D1B3E" }
                  : { color: "#94a3b8" }
              }
            >
              <span className="text-xl leading-none">{icon}</span>
              <span
                className="text-[10px] font-bold leading-none"
                style={{ color: active ? "#0D1B3E" : "#94a3b8" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
