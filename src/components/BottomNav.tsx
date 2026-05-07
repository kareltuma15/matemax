"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ITEMS = [
  { href: "/",        icon: "🏠", label: "Domů" },
  { href: "/trenink", icon: "💪", label: "Trénink" },
  { href: "/vyzva",   icon: "🏆", label: "Výzva" },
  { href: "/profil",  icon: "👤", label: "Profil" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-2xl mx-auto flex">
        {ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href;
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
