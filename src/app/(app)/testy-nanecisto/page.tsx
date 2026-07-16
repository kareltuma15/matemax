"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PublicTestSession } from "@/app/api/testy/route";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });
}

function PaymentBanner() {
  const searchParams = useSearchParams();
  const platba = searchParams.get("platba");
  if (platba === "ok") {
    return (
      <div className="rounded-2xl p-4 text-sm font-bold" style={{ background: "#dcfce7", color: "#16a34a" }}>
        ✅ Platba proběhla! Jsi přihlášen/a na test. Instrukce ti přijdou emailem.
      </div>
    );
  }
  if (platba === "zrusena") {
    return (
      <div className="rounded-2xl p-4 text-sm font-bold" style={{ background: "#fef3c7", color: "#b45309" }}>
        Platba byla zrušena. Přihlásit se můžeš kdykoli, dokud je volná kapacita.
      </div>
    );
  }
  return null;
}

export default function TestyNanecistoPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<PublicTestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let headers: Record<string, string> = {};
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setLoggedIn(true);
            headers = { Authorization: `Bearer ${data.session.access_token}` };
          }
        }
        const res = await fetch("/api/testy", { headers });
        if (!res.ok) { setError("Nepodařilo se načíst termíny."); return; }
        const j = await res.json();
        setSessions(j.sessions ?? []);
      } catch {
        setError("Nepodařilo se načíst termíny.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleEnroll(sessionId: string) {
    if (!loggedIn) {
      router.push("/prihlaseni?next=/testy-nanecisto");
      return;
    }
    if (!supabase || checkingOut) return;
    setCheckingOut(sessionId);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.push("/prihlaseni?next=/testy-nanecisto"); return; }
      const res = await fetch("/api/stripe/test-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      const j = await res.json();
      if (!res.ok) { alert(j.error ?? "Něco se pokazilo, zkus to znovu."); return; }
      if (j.url) window.location.href = j.url;
    } finally {
      setCheckingOut(null);
    }
  }

  // Proběhlé termíny vrací API jen ty, na které je žák přihlášen
  const mine = sessions.filter((s) => s.past);
  const upcoming = sessions.filter((s) => !s.past);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#93c5fd" }}>
          Online z domova
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Testy nanečisto</h1>
        <p className="text-sm" style={{ color: "#cbd5e1" }}>
          Vyzkoušej si přijímačky jako v ostrém termínu — stáhneš zadání, vyplníš
          záznamový arch a do 48 hodin dostaneš osobní zpětnou vazbu od Karla,
          téma po tématu.
        </p>
      </div>

      <Suspense fallback={null}>
        <PaymentBanner />
      </Suspense>

      {/* Jak to funguje */}
      <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>Jak to probíhá</div>
        <ol className="text-sm flex flex-col gap-1" style={{ color: "#64748b" }}>
          <li>1️⃣ Přihlásíš se na termín a vytiskneš si záznamový arch</li>
          <li>2️⃣ V čas startu se ti odemkne zadání (PDF)</li>
          <li>3️⃣ Počítáš na papír — přesně jako u CERMATu</li>
          <li>4️⃣ Po skončení nahraješ fotky archu</li>
          <li>5️⃣ Do 48 hodin ti přijde osobní hodnocení od Karla</li>
        </ol>
      </div>

      {/* Termíny */}
      {loading && (
        <div className="flex items-center justify-center min-h-32">
          <div className="text-slate-400 text-sm">Načítám termíny…</div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl p-6 text-center text-sm font-bold text-red-600" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
          {error}
        </div>
      )}

      {/* Tvoje proběhlé testy — sem se chodí nahrát arch a pro výsledky */}
      {mine.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
            Tvoje testy
          </div>
          {mine.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: "#fff", border: "2px solid #16a34a" }}
            >
              <div>
                <div className="font-bold" style={{ color: "#0D1B3E" }}>{s.title}</div>
                <div className="text-sm capitalize" style={{ color: "#64748b" }}>
                  Proběhl {formatDate(s.scheduled_at)}
                </div>
              </div>
              <Link
                href={`/test/${s.id}`}
                className="rounded-xl px-4 py-2.5 text-center text-sm font-bold block"
                style={{ background: "#16a34a", color: "#fff" }}
              >
                Otevřít testovou místnost →
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && upcoming.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
          <div className="text-3xl mb-2">📅</div>
          <div className="font-bold mb-1" style={{ color: "#0D1B3E" }}>Žádné vypsané termíny</div>
          <div className="text-sm" style={{ color: "#94a3b8" }}>
            Nové termíny vypisujeme průběžně — mrkni sem zase brzy.
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-3">
          {mine.length > 0 && (
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>
              Vypsané termíny
            </div>
          )}
          {upcoming.map((s) => {
            const full = s.remaining === 0;
            return (
              <div
                key={s.id}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "#fff", border: s.enrolled ? "2px solid #16a34a" : "1px solid #e2e8f0" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold" style={{ color: "#0D1B3E" }}>{s.title}</div>
                    <div className="text-sm capitalize" style={{ color: "#64748b" }}>
                      {formatDate(s.scheduled_at)}
                    </div>
                    <div className="text-sm" style={{ color: "#64748b" }}>
                      start v {formatTime(s.scheduled_at)} · {s.duration_minutes} minut
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black" style={{ color: "#0D1B3E" }}>{s.price_czk} Kč</div>
                    <div className="text-xs font-bold" style={{ color: full ? "#dc2626" : "#16a34a" }}>
                      {full ? "Obsazeno" : `Zbývá ${s.remaining} míst`}
                    </div>
                  </div>
                </div>

                {s.enrolled ? (
                  <Link
                    href={`/test/${s.id}`}
                    className="rounded-xl px-4 py-2.5 text-center text-sm font-bold block"
                    style={{ background: "#16a34a", color: "#fff" }}
                  >
                    Přihlášen ✅ · Otevřít testovou místnost →
                  </Link>
                ) : (
                  <button
                    onClick={() => handleEnroll(s.id)}
                    disabled={full || checkingOut === s.id}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: "#2E6DA4" }}
                  >
                    {checkingOut === s.id ? "Přesměrovávám na platbu…" : full ? "Termín je plný" : "Přihlásit se"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
