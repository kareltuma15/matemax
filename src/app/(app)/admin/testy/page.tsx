"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { AdminTestSession } from "@/app/api/admin/testy/route";

const EMPTY_FORM = {
  title: "",
  date: "",
  time: "10:00",
  duration_minutes: 60,
  capacity: 30,
  price_czk: 390,
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Prague",
  });
}

function PdfUpload({
  label,
  uploaded,
  uploading,
  onUpload,
}: {
  label: string;
  uploaded: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-lg px-2 py-1 text-xs font-bold disabled:opacity-40"
        style={uploaded
          ? { background: "#dcfce7", color: "#16a34a" }
          : { background: "#e0e7ff", color: "#4338ca" }}
      >
        {uploading ? "…" : uploaded ? `✓ ${label}` : `↑ ${label}`}
      </button>
    </>
  );
}

export default function AdminTestyPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AdminTestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // "sessionId:kind"
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchSessions = useCallback(async (tok: string) => {
    const res = await fetch("/api/admin/testy", {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (res.status === 401 || res.status === 403) {
      setError("Přístup odepřen — nejsi admin.");
      return;
    }
    if (!res.ok) {
      setError("Chyba při načítání termínů.");
      return;
    }
    const j = await res.json();
    setSessions(j.sessions ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) { setError("Supabase není dostupné."); setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/prihlaseni"); return; }
      const tok = data.session.access_token;
      setToken(tok);
      try {
        await fetchSessions(tok);
      } catch {
        setError("Nepodařilo se načíst data.");
      } finally {
        setLoading(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || saving) return;
    if (!form.title.trim() || !form.date) { alert("Vyplň název a datum."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/testy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          scheduled_at: new Date(`${form.date}T${form.time}`).toISOString(),
          duration_minutes: Number(form.duration_minutes),
          capacity: Number(form.capacity),
          price_czk: Number(form.price_czk),
        }),
      });
      const j = await res.json();
      if (!res.ok) { alert("Chyba: " + (j.error ?? "neznámá")); return; }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchSessions(token);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(s: AdminTestSession) {
    if (!token || toggling) return;
    if (!s.is_published && (!s.zadani_pdf_url || !s.zaznamovy_arch_pdf_url)) {
      if (!confirm("Termín nemá nahraná obě PDF (zadání + arch). Opravdu publikovat?")) return;
    }
    setToggling(s.id);
    try {
      const res = await fetch(`/api/admin/testy/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_published: !s.is_published }),
      });
      const j = await res.json();
      if (!res.ok) { alert("Chyba: " + (j.error ?? "neznámá")); return; }
      setSessions((prev) =>
        prev.map((x) => x.id === s.id ? { ...x, is_published: j.session.is_published } : x)
      );
    } finally {
      setToggling(null);
    }
  }

  async function handleUpload(sessionId: string, kind: "zadani" | "arch" | "rozbor", file: File) {
    if (!token) return;
    const key = `${sessionId}:${kind}`;
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch(`/api/admin/testy/${sessionId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) { alert("Chyba: " + (j.error ?? "neznámá")); return; }
      setSessions((prev) => prev.map((x) => x.id === sessionId ? { ...x, ...j.session } : x));
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(s: AdminTestSession) {
    if (!token) return;
    if (!confirm(`Opravdu smazat termín „${s.title}"?`)) return;
    const res = await fetch(`/api/admin/testy/${s.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await res.json();
    if (!res.ok) { alert("Chyba: " + (j.error ?? "neznámá")); return; }
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 text-sm">Načítám termíny…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
        <div className="text-2xl mb-2">🔒</div>
        <div className="font-bold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#93c5fd" }}>Admin panel</div>
            <div className="text-2xl font-black text-white">Testy nanečisto</div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            {showForm ? "✕ Zavřít" : "+ Nový termín"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl p-5 flex flex-col gap-3"
          style={{ background: "#fff", border: "1px solid #e2e8f0" }}
        >
          <div className="font-bold" style={{ color: "#0D1B3E" }}>Nový termín</div>
          <input
            type="text"
            placeholder="Název — např. Test nanečisto #1 — září 2026"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg px-3 py-2 text-sm border outline-none"
            style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
              Datum
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
              Čas startu
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
              Délka (minuty)
              <input
                type="number"
                min={10}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
              Kapacita
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                className="rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "#64748b" }}>
              Cena (Kč)
              <input
                type="number"
                min={0}
                value={form.price_czk}
                onChange={(e) => setForm({ ...form, price_czk: Number(e.target.value) })}
                className="rounded-lg px-3 py-2 text-sm border outline-none"
                style={{ borderColor: "#cbd5e1", color: "#0D1B3E" }}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "#2E6DA4" }}
          >
            {saving ? "Ukládám…" : "Vytvořit termín"}
          </button>
        </form>
      )}

      {/* Sessions list */}
      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "#fff", border: "1px solid #e2e8f0" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold" style={{ color: "#0D1B3E" }}>{s.title}</div>
                <div className="text-xs" style={{ color: "#94a3b8" }}>
                  {formatDateTime(s.scheduled_at)} · {s.duration_minutes} min · {s.price_czk} Kč
                </div>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap"
                style={s.is_published
                  ? { background: "#dcfce7", color: "#16a34a" }
                  : { background: "#f1f5f9", color: "#94a3b8" }}
              >
                {s.is_published ? "● Zveřejněno" : "○ Skryto"}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="rounded-lg px-2 py-1 text-xs font-bold"
                style={{ background: "#eff6ff", color: "#2E6DA4" }}
              >
                👥 {s.paid_count} / {s.capacity}
              </span>
              <PdfUpload
                label="Zadání"
                uploaded={!!s.zadani_pdf_url}
                uploading={uploading === `${s.id}:zadani`}
                onUpload={(f) => handleUpload(s.id, "zadani", f)}
              />
              <PdfUpload
                label="Arch"
                uploaded={!!s.zaznamovy_arch_pdf_url}
                uploading={uploading === `${s.id}:arch`}
                onUpload={(f) => handleUpload(s.id, "arch", f)}
              />
              <PdfUpload
                label="Rozbor"
                uploaded={!!s.rozbor_pdf_url}
                uploading={uploading === `${s.id}:rozbor`}
                onUpload={(f) => handleUpload(s.id, "rozbor", f)}
              />
              <div className="ml-auto flex items-center gap-2">
                <Link
                  href={`/admin/testy/${s.id}/submissions`}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold"
                  style={{ background: "#f1f5f9", color: "#0D1B3E" }}
                >
                  📥 Odevzdané
                </Link>
                <button
                  onClick={() => handleTogglePublish(s)}
                  disabled={toggling === s.id}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                  style={s.is_published
                    ? { background: "#fef3c7", color: "#b45309" }
                    : { background: "#2E6DA4", color: "#fff" }}
                >
                  {toggling === s.id ? "…" : s.is_published ? "Skrýt" : "Publikovat"}
                </button>
                {s.paid_count === 0 && (
                  <button
                    onClick={() => handleDelete(s)}
                    className="rounded-lg px-2 py-1.5 text-xs font-bold"
                    style={{ background: "#fee2e2", color: "#dc2626" }}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="rounded-2xl p-8 text-center text-sm" style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#94a3b8" }}>
            Zatím žádné termíny. Vytvoř první přes „+ Nový termín".
          </div>
        )}
      </div>
    </div>
  );
}
