"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { AdminSubmissionsResponse, AdminSubmissionRow } from "@/app/api/admin/testy/[id]/submissions/route";
import { TEST_MAX_POINTS } from "@/lib/online-test-topics";

const STATUS_STYLE: Record<AdminSubmissionRow["status"], { label: string; bg: string; color: string }> = {
  nezadano:  { label: "Neodevzdáno", bg: "#f1f5f9", color: "#94a3b8" },
  submitted: { label: "K opravě",    bg: "#fef3c7", color: "#b45309" },
  reviewed:  { label: "Opraveno",    bg: "#dbeafe", color: "#1d4ed8" },
  sent:      { label: "Odesláno",    bg: "#dcfce7", color: "#16a34a" },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("cs-CZ", {
    dateStyle: "short", timeStyle: "short", timeZone: "Europe/Prague",
  });
}

export default function SubmissionsList({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<AdminSubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setError("Supabase není dostupné."); setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: sess }) => {
      if (!sess.session) { router.replace("/prihlaseni"); return; }
      try {
        const res = await fetch(`/api/admin/testy/${sessionId}/submissions`, {
          headers: { Authorization: `Bearer ${sess.session.access_token}` },
        });
        if (res.status === 401 || res.status === 403) { setError("Přístup odepřen — nejsi admin."); return; }
        if (!res.ok) { setError("Chyba při načítání."); return; }
        setData(await res.json());
      } catch {
        setError("Nepodařilo se načíst data.");
      } finally {
        setLoading(false);
      }
    });
  }, [sessionId, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-64"><div className="text-slate-400 text-sm">Načítám odevzdané testy…</div></div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <div className="text-2xl mb-2">🔒</div>
        <div className="font-bold text-red-600">{error ?? "Nenalezeno"}</div>
      </div>
    );
  }

  const toReview = data.rows.filter((r) => r.status === "submitted").length;
  const submittedCount = data.rows.filter((r) => r.submittedAt).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#93c5fd" }}>
          Odevzdané testy
        </div>
        <div className="text-xl font-black text-white">{data.session.title}</div>
        <div className="text-sm mt-1" style={{ color: "#cbd5e1" }}>
          {fmt(data.session.scheduled_at)} · odevzdalo {submittedCount} z {data.rows.length}
          {toReview > 0 && ` · ${toReview} čeká na opravu`}
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2">
        {data.rows.map((r) => {
          const st = STATUS_STYLE[r.status];
          const clickable = !!r.submissionId && !!r.submittedAt;
          const inner = (
            <div
              className="rounded-2xl p-4 flex items-center justify-between gap-3"
              style={{ background: "#fff", border: "1px solid #e2e8f0" }}
            >
              <div className="min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: "#0D1B3E" }}>{r.email}</div>
                <div className="text-xs" style={{ color: "#94a3b8" }}>
                  {r.submittedAt ? `Odevzdáno ${fmt(r.submittedAt)} · ${r.photoCount} fotek` : "Zatím neodevzdal/a"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.bodyCelkem !== null && (
                  <span className="text-sm font-black" style={{ color: "#2E6DA4" }}>
                    {r.bodyCelkem}/{TEST_MAX_POINTS}
                  </span>
                )}
                <span className="rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
                {clickable && <span style={{ color: "#cbd5e1" }}>›</span>}
              </div>
            </div>
          );
          return clickable
            ? <Link key={r.enrollmentId} href={`/admin/submissions/${r.submissionId}`}>{inner}</Link>
            : <div key={r.enrollmentId}>{inner}</div>;
        })}

        {data.rows.length === 0 && (
          <div className="rounded-2xl p-8 text-center text-sm" style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#94a3b8" }}>
            Na tento termín zatím nikdo není přihlášen.
          </div>
        )}
      </div>

      <Link href="/admin/testy" className="text-sm font-bold text-center py-2" style={{ color: "#94a3b8" }}>
        ← Zpět na termíny
      </Link>
    </div>
  );
}
