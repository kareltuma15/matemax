"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { AdminSubmissionDetail } from "@/app/api/admin/submissions/[sid]/route";
import { TEST_TOPICS, TEST_TOPIC_LABELS, TEST_MAX_POINTS, type TestTopic } from "@/lib/online-test-topics";

const ICONS = ["✅", "⚠️", "❌"] as const;
type Icon = (typeof ICONS)[number];

// komentar_temy ukládá ikonu jako prefix textu ("✅ perfektní").
// Ve formuláři je držíme zvlášť, při ukládání zase spojíme.
function splitComment(raw: string | undefined): { icon: Icon | null; text: string } {
  if (!raw) return { icon: null, text: "" };
  for (const ic of ICONS) {
    if (raw.startsWith(ic)) return { icon: ic, text: raw.slice(ic.length).trim() };
  }
  return { icon: null, text: raw };
}

type TopicForm = { points: string; icon: Icon | null; text: string };

const emptyTopic = (): TopicForm => ({ points: "", icon: null, text: "" });

export default function GradingForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topics, setTopics] = useState<Record<string, TopicForm>>({});
  const [silne, setSilne] = useState("");
  const [doporuceni, setDoporuceni] = useState("");
  const [celkovy, setCelkovy] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setError("Supabase není dostupné."); setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: sess }) => {
      if (!sess.session) { router.replace("/prihlaseni"); return; }
      const tok = sess.session.access_token;
      setToken(tok);
      try {
        const res = await fetch(`/api/admin/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (res.status === 401 || res.status === 403) { setError("Přístup odepřen — nejsi admin."); return; }
        if (!res.ok) { setError("Odevzdání nenalezeno."); return; }
        const d = (await res.json()) as AdminSubmissionDetail;
        setDetail(d);
        setSentAt(d.emailSentAt);

        const init: Record<string, TopicForm> = {};
        for (const t of TEST_TOPICS) {
          const { icon, text } = splitComment(d.komentarTemy[t]);
          init[t] = {
            points: d.body[t] !== null && d.body[t] !== undefined ? String(d.body[t]) : "",
            icon, text,
          };
        }
        setTopics(init);
        setSilne(d.silneStranky ?? "");
        setDoporuceni(d.doporuceni ?? "");
        setCelkovy(d.komentarCelkovy ?? "");
      } catch {
        setError("Nepodařilo se načíst data.");
      } finally {
        setLoading(false);
      }
    });
  }, [submissionId, router]);

  // Celkem = součet vyplněných témat (odvozené, ne ručně)
  const total = TEST_TOPICS.reduce((sum, t) => {
    const v = parseFloat(topics[t]?.points ?? "");
    return Number.isFinite(v) ? sum + v : sum;
  }, 0);
  const totalRounded = Math.round(total * 10) / 10;

  const setTopic = (t: TestTopic, patch: Partial<TopicForm>) =>
    setTopics((prev) => ({ ...prev, [t]: { ...(prev[t] ?? emptyTopic()), ...patch } }));

  const buildPayload = useCallback((markReviewed: boolean) => {
    const body: Record<string, number | null> = {};
    const komentar_temy: Record<string, string> = {};
    for (const t of TEST_TOPICS) {
      const f = topics[t] ?? emptyTopic();
      const v = parseFloat(f.points);
      body[t] = Number.isFinite(v) ? v : null;
      const combined = [f.icon, f.text.trim()].filter(Boolean).join(" ").trim();
      if (combined) komentar_temy[t] = combined;
    }
    return {
      body,
      body_celkem: totalRounded,
      komentar_temy,
      silne_stranky: silne,
      doporuceni,
      komentar_celkovy: celkovy,
      markReviewed,
    };
  }, [topics, totalRounded, silne, doporuceni, celkovy]);

  async function save(markReviewed: boolean): Promise<boolean> {
    if (!token || saving) return false;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildPayload(markReviewed)),
      });
      const j = await res.json();
      if (!res.ok) { alert("Chyba: " + (j.error ?? "neznámá")); return false; }
      setSavedAt(new Date().toLocaleTimeString("cs-CZ"));
      if (markReviewed && detail) setDetail({ ...detail, status: "reviewed" });
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEmail() {
    if (!token || sending) return;
    if (!confirm("Uložit opravu a odeslat žákovi email se zpětnou vazbou?")) return;
    setSending(true);
    try {
      // Nejdřív ulož + označ jako opravené, pak odešli
      const ok = await save(true);
      if (!ok) return;
      const res = await fetch(`/api/admin/submissions/${submissionId}/send-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) { alert("Email se nepodařilo odeslat: " + (j.error ?? "neznámá chyba")); return; }
      setSentAt(new Date().toISOString());
      alert("Email odeslán ✅");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-64"><div className="text-slate-400 text-sm">Načítám odevzdaný test…</div></div>;
  }
  if (error || !detail) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <div className="text-2xl mb-2">🔒</div>
        <div className="font-bold text-red-600">{error ?? "Nenalezeno"}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#93c5fd" }}>Oprava testu</div>
        <div className="text-lg font-black text-white truncate">{detail.email}</div>
        <div className="text-sm mt-1" style={{ color: "#cbd5e1" }}>{detail.sessionTitle}</div>
      </div>

      {sentAt && (
        <div className="rounded-2xl p-3 text-sm font-bold text-center" style={{ background: "#dcfce7", color: "#16a34a" }}>
          ✅ Zpětná vazba už byla odeslána
        </div>
      )}

      {/* Fotky archu */}
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>
          📸 Záznamový arch ({detail.photoUrls.length} fotek)
        </div>
        {detail.photoUrls.length === 0 ? (
          <div className="text-sm" style={{ color: "#94a3b8" }}>Žádné fotky.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {detail.photoUrls.map((u, i) => (
              <button key={i} onClick={() => setZoom(u)} className="rounded-lg overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`arch ${i + 1}`} className="w-full h-40 object-cover" />
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px]" style={{ color: "#94a3b8" }}>Klikni na fotku pro zvětšení.</p>
      </div>

      {/* Body per téma */}
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>Body po tématech</div>
          <div className="text-sm font-black" style={{ color: totalRounded > TEST_MAX_POINTS ? "#dc2626" : "#2E6DA4" }}>
            Celkem {totalRounded} / {TEST_MAX_POINTS}
          </div>
        </div>
        {totalRounded > TEST_MAX_POINTS && (
          <div className="text-xs font-bold text-red-600">Součet přesahuje {TEST_MAX_POINTS} bodů — zkontroluj body.</div>
        )}

        {TEST_TOPICS.map((t) => {
          const f = topics[t] ?? emptyTopic();
          return (
            <div key={t} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "#f8fafc" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold flex-1" style={{ color: "#0D1B3E" }}>{TEST_TOPIC_LABELS[t]}</span>
                <input
                  type="number" min={0} max={TEST_MAX_POINTS} step={0.5}
                  placeholder="—"
                  value={f.points}
                  onChange={(e) => setTopic(t, { points: e.target.value })}
                  className="rounded-lg px-2 py-1 text-sm border outline-none w-16 text-center"
                  style={{ borderColor: "#cbd5e1", color: "#0D1B3E", background: "#fff" }}
                />
                <span className="text-xs" style={{ color: "#94a3b8" }}>b</span>
                <div className="flex gap-1">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setTopic(t, { icon: f.icon === ic ? null : ic })}
                      className="w-7 h-7 rounded-lg text-sm"
                      style={{
                        background: f.icon === ic ? "#2E6DA4" : "#fff",
                        border: "1px solid #cbd5e1",
                        opacity: f.icon === ic ? 1 : 0.45,
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Komentář k tématu…"
                value={f.text}
                onChange={(e) => setTopic(t, { text: e.target.value })}
                className="rounded-lg px-2 py-1.5 text-sm border outline-none"
                style={{ borderColor: "#e2e8f0", color: "#0D1B3E", background: "#fff" }}
              />
            </div>
          );
        })}
      </div>

      {/* Souhrn */}
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>Celkové hodnocení</div>
        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
          💪 Silné stránky
          <textarea
            rows={2} value={silne} onChange={(e) => setSilne(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border outline-none resize-y"
            style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
          🎯 Do příště dotrénovat
          <textarea
            rows={2} value={doporuceni} onChange={(e) => setDoporuceni(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border outline-none resize-y"
            style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
          💬 Celkový komentář
          <textarea
            rows={3} value={celkovy} onChange={(e) => setCelkovy(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border outline-none resize-y"
            style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
          />
        </label>
      </div>

      {/* Akce */}
      <div className="flex flex-col gap-2">
        {savedAt && <div className="text-xs text-center" style={{ color: "#94a3b8" }}>Uloženo v {savedAt}</div>}
        <div className="flex gap-2">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40"
            style={{ background: "#e0e7ff", color: "#4338ca" }}
          >
            {saving ? "Ukládám…" : "💾 Uložit draft"}
          </button>
          <button
            onClick={handleSendEmail}
            disabled={saving || sending}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "#16a34a" }}
          >
            {sending ? "Odesílám…" : sentAt ? "📧 Odeslat znovu" : "📧 Odeslat výsledky"}
          </button>
        </div>
        <p className="text-[11px] text-center" style={{ color: "#94a3b8" }}>
          Odesláním se test označí jako opravený a žák uvidí výsledky v aplikaci.
        </p>
      </div>

      <Link href={`/admin/testy/${detail.sessionId}/submissions`} className="text-sm font-bold text-center py-2" style={{ color: "#94a3b8" }}>
        ← Zpět na odevzdané
      </Link>

      {/* Lightbox */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="arch detail" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
