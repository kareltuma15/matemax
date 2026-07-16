"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { TestRoomData } from "@/app/api/testy/[id]/route";
import { TEST_TOPICS, TEST_TOPIC_LABELS, TEST_MAX_POINTS } from "@/lib/online-test-topics";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/Prague",
  });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("cs-CZ", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
  });
}

function Countdown({ label, targetMs, nowMs }: { label: string; targetMs: number; nowMs: number }) {
  const diff = Math.max(0, targetMs - nowMs);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const parts: [number, string][] = d > 0
    ? [[d, "dní"], [h, "h"], [m, "min"]]
    : [[h, "h"], [m, "min"], [s, "s"]];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>{label}</div>
      <div className="flex items-end gap-2">
        {parts.map(([v, u], i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-3xl font-black tabular-nums" style={{ color: "#0D1B3E" }}>
              {String(v).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-bold" style={{ color: "#94a3b8" }}>{u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Velký časovač během testu (mm:ss, červený pod 10 minut)
function LiveTimer({ endMs, nowMs }: { endMs: number; nowMs: number }) {
  const diff = Math.max(0, endMs - nowMs);
  const totalMin = Math.floor(diff / 60_000);
  const sec = Math.floor((diff % 60_000) / 1000);
  const danger = diff <= 10 * 60_000;
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: danger ? "#fef2f2" : "#f0f9ff", border: `2px solid ${danger ? "#fca5a5" : "#bae6fd"}` }}
    >
      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: danger ? "#dc2626" : "#0369a1" }}>
        {danger ? "⏰ Zbývá málo času" : "Zbývající čas"}
      </div>
      <div className="text-5xl font-black tabular-nums" style={{ color: danger ? "#dc2626" : "#0D1B3E" }}>
        {String(totalMin).padStart(2, "0")}:{String(sec).padStart(2, "0")}
      </div>
    </div>
  );
}

function PdfButton({ href, children, tone = "primary" }: { href: string; children: React.ReactNode; tone?: "primary" | "ghost" }) {
  const style = tone === "primary"
    ? { background: "#2E6DA4", color: "#fff" }
    : { background: "#eff6ff", color: "#2E6DA4" };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl px-4 py-3 text-sm font-bold text-center block"
      style={style}
    >
      {children}
    </a>
  );
}

export default function TestRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<TestRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const offsetRef = useRef(0); // serverNow - clientNow

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!supabase) { setError("Přihlaš se prosím."); setLoading(false); return; }
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { router.replace(`/prihlaseni?next=/test/${sessionId}`); return; }
    try {
      const res = await fetch(`/api/testy/${sessionId}`, {
        headers: { Authorization: `Bearer ${sess.session.access_token}` },
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Nepodařilo se načíst test."); return; }
      const room = j as TestRoomData;
      offsetRef.current = new Date(room.serverNow).getTime() - Date.now();
      setData(room);
      setNowMs(Date.now() + offsetRef.current);
    } catch {
      setError("Nepodařilo se načíst test.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => { load(); }, [load]);

  // Tikající hodiny (synchronizované se serverem)
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now() + offsetRef.current), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-přechod mezi fázemi při překročení času (bez refetche URL — jen fáze)
  const startMs = data ? new Date(data.scheduled_at).getTime() : 0;
  const endMs = data ? new Date(data.endsAt).getTime() : 0;

  // Když časovač doběhne do startu nebo konce, načteme znovu (kvůli signed URL zadání)
  const prevCrossedStart = useRef(false);
  useEffect(() => {
    if (!data) return;
    if (data.phase === "prep" && nowMs >= startMs && !prevCrossedStart.current) {
      prevCrossedStart.current = true;
      load(); // odemkne zadání
    }
  }, [nowMs, startMs, data, load]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setUploadError(null);
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming].slice(0, 10));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!supabase || files.length === 0 || submitting) return;
    setSubmitting(true);
    setUploadError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { router.replace("/prihlaseni"); return; }
      const fd = new FormData();
      for (const f of files) fd.append("photo", f);
      const res = await fetch(`/api/testy/${sessionId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sess.session.access_token}` },
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) { setUploadError(j.error ?? "Odeslání selhalo."); return; }
      setFiles([]);
      await load(); // přejde do fáze "submitted"
    } catch {
      setUploadError("Odeslání selhalo, zkus to znovu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-64"><div className="text-slate-400 text-sm">Načítám testovací místnost…</div></div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #fca5a5" }}>
          <div className="text-2xl mb-2">🔒</div>
          <div className="font-bold text-red-600 mb-3">{error ?? "Test nenalezen"}</div>
          <Link href="/testy-nanecisto" className="text-sm font-bold" style={{ color: "#2E6DA4" }}>
            ← Zpět na termíny
          </Link>
        </div>
      </div>
    );
  }

  const { phase } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#93c5fd" }}>
          Testovací místnost
        </div>
        <h1 className="text-xl font-black text-white mb-2">{data.title}</h1>
        <div className="text-sm capitalize" style={{ color: "#cbd5e1" }}>
          {fmtDate(data.scheduled_at)} · start {fmtTime(data.scheduled_at)} · {data.duration_minutes} min
        </div>
      </div>

      {/* ── BEFORE: >24h do startu ─────────────────────────────────── */}
      {phase === "before" && (
        <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
          <Countdown label="Do startu testu" targetMs={startMs} nowMs={nowMs} />
          <p className="text-sm text-center" style={{ color: "#64748b" }}>
            Záznamový arch ke stažení a tisku se ti tady odemkne <strong>24 hodin před startem</strong>.
            Připrav si pero a pravítko.
          </p>
        </div>
      )}

      {/* ── PREP: 24h okno, arch ke stažení ────────────────────────── */}
      {phase === "prep" && (
        <>
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
            <Countdown label="Test začne za" targetMs={startMs} nowMs={nowMs} />
          </div>
          <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
            <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>1️⃣ Priprav se</div>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Vytiskni si záznamový arch a měj po ruce pero a pravítko. V čas startu se ti
              tady odemkne zadání.
            </p>
            {data.archUrl
              ? <PdfButton href={data.archUrl}>🖨️ Stáhnout záznamový arch (PDF)</PdfButton>
              : <div className="text-sm text-center rounded-xl px-4 py-3" style={{ background: "#fef3c7", color: "#b45309" }}>Arch zatím není nahraný — mrkni sem později.</div>}
          </div>
        </>
      )}

      {/* ── LIVE: test běží ────────────────────────────────────────── */}
      {phase === "live" && (
        <>
          <LiveTimer endMs={endMs} nowMs={nowMs} />
          <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
            <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>Test probíhá — hodně štěstí! ✏️</div>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Počítej na papír přesně jako u CERMATu. Až budeš hotový/á (nebo vyprší čas),
              nahraješ tady fotky vyplněného archu.
            </p>
            {data.zadaniUrl
              ? <PdfButton href={data.zadaniUrl}>📄 Stáhnout zadání (PDF)</PdfButton>
              : <div className="text-sm text-center rounded-xl px-4 py-3" style={{ background: "#fef2f2", color: "#dc2626" }}>Zadání není k dispozici — kontaktuj Karla.</div>}
            {data.archUrl && (
              <PdfButton href={data.archUrl} tone="ghost">🖨️ Znovu stáhnout arch</PdfButton>
            )}
          </div>
          <UploadBox
            files={files} onAdd={addFiles} onRemove={removeFile}
            onSubmit={handleSubmit} submitting={submitting} error={uploadError}
            inputRef={fileInputRef} earlyHint
          />
        </>
      )}

      {/* ── UPLOAD: čas vypršel, ještě neodevzdáno ─────────────────── */}
      {phase === "upload" && (
        <>
          <div className="rounded-2xl p-5 text-center" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
            <div className="text-2xl mb-1">⏱️</div>
            <div className="font-bold" style={{ color: "#b45309" }}>Čas vypršel</div>
            <p className="text-sm mt-1" style={{ color: "#92400e" }}>Nahraj fotky vyplněného archu — Karel ti do 48 hodin pošle hodnocení.</p>
          </div>
          <UploadBox
            files={files} onAdd={addFiles} onRemove={removeFile}
            onSubmit={handleSubmit} submitting={submitting} error={uploadError}
            inputRef={fileInputRef}
          />
        </>
      )}

      {/* ── SUBMITTED: odevzdáno, čeká na opravu ───────────────────── */}
      {phase === "submitted" && (
        <div className="rounded-2xl p-8 text-center flex flex-col items-center gap-3" style={{ background: "#fff", border: "2px solid #16a34a" }}>
          <div className="text-4xl">✅</div>
          <div className="font-black text-lg" style={{ color: "#0D1B3E" }}>Arch odevzdán!</div>
          <p className="text-sm" style={{ color: "#64748b" }}>
            Karel tvůj test opraví ručně a do <strong>48 hodin</strong> ti sem i emailem přijde
            osobní hodnocení — téma po tématu.
          </p>
          {data.submission?.submitted_at && (
            <div className="text-xs" style={{ color: "#94a3b8" }}>
              Odevzdáno {fmtDate(data.submission.submitted_at)} v {fmtTime(data.submission.submitted_at)}
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS: opraveno ──────────────────────────────────────── */}
      {phase === "results" && data.submission && (
        <Results submission={data.submission} rozborUrl={data.rozborUrl} />
      )}

      <Link href="/testy-nanecisto" className="text-sm font-bold text-center py-2" style={{ color: "#94a3b8" }}>
        ← Zpět na termíny
      </Link>
    </div>
  );
}

function UploadBox({
  files, onAdd, onRemove, onSubmit, submitting, error, inputRef, earlyHint,
}: {
  files: File[];
  onAdd: (l: FileList | null) => void;
  onRemove: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  earlyHint?: boolean;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
      <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>
        📸 Nahrát fotky záznamového archu
      </div>
      {earlyHint && (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          Hotový/á dřív? Můžeš odevzdat i teď. Jinak počkej do konce času.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => { onAdd(e.target.files); e.target.value = ""; }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="rounded-xl px-4 py-3 text-sm font-bold border-2 border-dashed"
        style={{ borderColor: "#cbd5e1", color: "#2E6DA4", background: "#f8fafc" }}
      >
        + Přidat fotku (nebo vyfotit)
      </button>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt={`arch ${i + 1}`} className="w-full h-24 object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
                style={{ background: "rgba(220,38,38,0.9)" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-sm font-bold text-red-600">{error}</div>}

      <button
        onClick={onSubmit}
        disabled={files.length === 0 || submitting}
        className="rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
        style={{ background: "#16a34a" }}
      >
        {submitting ? "Odesílám…" : `Odevzdat arch${files.length > 0 ? ` (${files.length})` : ""}`}
      </button>
      <p className="text-[11px] text-center" style={{ color: "#94a3b8" }}>
        Odevzdat můžeš jen jednou — zkontroluj, že jsou fotky ostré a čitelné.
      </p>
    </div>
  );
}

function Results({
  submission, rozborUrl,
}: {
  submission: NonNullable<TestRoomData["submission"]>;
  rozborUrl: string | null;
}) {
  const total = submission.body_celkem;
  const pct = total !== null ? Math.round((total / TEST_MAX_POINTS) * 100) : null;
  const color = pct === null ? "#64748b" : pct >= 70 ? "#16a34a" : pct >= 45 ? "#d97706" : "#dc2626";

  const topicRows = TEST_TOPICS
    .map((key) => ({ key, points: submission.body[key], comment: submission.komentar_temy?.[key] }))
    .filter((r) => (r.points !== null && r.points !== undefined) || !!r.comment);

  return (
    <div className="flex flex-col gap-4">
      {/* Skóre */}
      <div className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>Výsledek</div>
        {total !== null ? (
          <>
            <div className="text-5xl font-black" style={{ color }}>{total}<span className="text-2xl" style={{ color: "#94a3b8" }}> / {TEST_MAX_POINTS}</span></div>
            {pct !== null && <div className="text-sm font-bold mt-1" style={{ color }}>{pct} %</div>}
          </>
        ) : (
          <div className="text-lg font-bold" style={{ color: "#64748b" }}>Hodnocení připraveno</div>
        )}
      </div>

      {/* Per téma */}
      {topicRows.length > 0 && (
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
          <div className="font-bold text-sm" style={{ color: "#0D1B3E" }}>Rozbor po tématech</div>
          <div className="flex flex-col gap-2">
            {topicRows.map((r) => (
              <div key={r.key} className="rounded-xl p-3" style={{ background: "#f8fafc" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: "#0D1B3E" }}>{TEST_TOPIC_LABELS[r.key]}</span>
                  {r.points !== null && r.points !== undefined && (
                    <span className="text-sm font-black" style={{ color: "#2E6DA4" }}>{r.points} b</span>
                  )}
                </div>
                {r.comment && <div className="text-sm mt-1" style={{ color: "#64748b" }}>{r.comment}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Silné stránky */}
      {submission.silne_stranky && (
        <div className="rounded-2xl p-5" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div className="font-bold text-sm mb-1" style={{ color: "#15803d" }}>💪 Silné stránky</div>
          <div className="text-sm" style={{ color: "#166534" }}>{submission.silne_stranky}</div>
        </div>
      )}

      {/* Doporučení */}
      {submission.doporuceni && (
        <div className="rounded-2xl p-5" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <div className="font-bold text-sm mb-1" style={{ color: "#1d4ed8" }}>🎯 Do příště dotrénovat</div>
          <div className="text-sm" style={{ color: "#1e40af" }}>{submission.doporuceni}</div>
        </div>
      )}

      {/* Celkový komentář */}
      {submission.komentar_celkovy && (
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
          <div className="font-bold text-sm mb-1" style={{ color: "#0D1B3E" }}>Komentář od Karla</div>
          <div className="text-sm whitespace-pre-line" style={{ color: "#64748b" }}>{submission.komentar_celkovy}</div>
        </div>
      )}

      {rozborUrl && <PdfButton href={rozborUrl}>📘 Stáhnout rozbor testu (PDF)</PdfButton>}
    </div>
  );
}
