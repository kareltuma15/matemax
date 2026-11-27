"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { oznacUpozorneniPrectena } from "@/app/(admin)/admin/novy/zpravy/akce";
import type { Upozorneni } from "@/lib/admin2/upozorneni";

/** Zvonek v liště (KO-12): seznam upozornění za 7 dní, nepřečtená s tečkou. Otevřením se označí jako přečtená. */
export default function Zvonek({ seznam, demo }: { seznam: Upozorneni[]; demo: boolean }) {
  const [otevreno, setOtevreno] = useState(false);
  const [precteno, setPrecteno] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nove = precteno ? 0 : seznam.filter((u) => u.nove).length;

  useEffect(() => {
    if (!otevreno) return;
    const zavri = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOtevreno(false);
    };
    document.addEventListener("mousedown", zavri);
    document.addEventListener("keydown", zavri);
    return () => { document.removeEventListener("mousedown", zavri); document.removeEventListener("keydown", zavri); };
  }, [otevreno]);

  const prepni = () => {
    const o = !otevreno;
    setOtevreno(o);
    if (o && nove && !demo) { setPrecteno(true); void oznacUpozorneniPrectena().catch(() => {}); }
  };

  return (
    <div className="a2-zvonek" ref={ref}>
      <button type="button" className="a2-ikbtn" aria-label={`Upozornění${nove ? `, nových ${nove}` : ""}`} aria-expanded={otevreno} onClick={prepni} data-testid="a2-zvonek">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        {nove > 0 && <span className="a2-odz">{nove}</span>}
      </button>
      {otevreno && (
        <div className="a2-upozorneni" role="dialog" aria-label="Upozornění" data-testid="a2-upozorneni">
          {seznam.length === 0 ? <span className="a2-s" style={{ padding: 8 }}>Za posledních 7 dní nic.</span>
            : seznam.map((u) => (
              <Link key={u.id} href={u.href} className={u.nove && !precteno ? "nove" : ""} onClick={() => setOtevreno(false)}>
                <i aria-hidden="true" />
                <span><span style={{ display: "block", fontWeight: u.nove ? 700 : 500 }}>{u.text}</span><span className="a2-s">{new Date(u.cas).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span></span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
