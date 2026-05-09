"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STUDENT_ITEMS = [
  { href: "/",        icon: "🏠", label: "Domů" },
  { href: "/trenink", icon: "💪", label: "Trénink" },
  { href: "/vyzva",   icon: "🏆", label: "Výzva" },
  { href: "/profil",  icon: "👤", label: "Profil" },
];

const PARENT_ITEMS = [
  { href: "/rodice/dashboard",  icon: "📊", label: "Přehled" },
  { href: "/rodice/propojeni",  icon: "🔗", label: "Propojení" },
  { href: "/rodice/nastaveni",  icon: "⚙️", label: "Nastavení" },
  { href: "/",                  icon: "🏠", label: "Zpět" },
];

export default function BottomNav() {
  const pathname = usePathname();
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

  if (!loggedIn) return null;

  const items = isParentSection ? PARENT_ITEMS : STUDENT_ITEMS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {isParentSection && (
        <div className="w-full text-center text-[10px] font-semibold text-blue-600 bg-blue-50 py-1 border-b border-blue-100">
          👨‍👩‍👧 Rodičovský portál
        </div>
      )}
      <div className="max-w-2xl mx-auto flex">
        {items.map(({ href, icon, label }) => {
          const active = isParentSection
            ? pathname === href || (href !== "/" && pathname.startsWith(href))
            : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors"
              style={{ color: active ? "#0D1B3E" : "#94a3b8" }}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: active ? "#0D1B3E" : "#94a3b8" }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: "#0D1B3E" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
