"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Settings = {
  report_frequency: "weekly" | "twice" | "monthly";
  send_day: string;
  inactive_alert: boolean;
};

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Týdně" },
  { value: "twice", label: "Dvakrát týdně" },
  { value: "monthly", label: "Měsíčně" },
] as const;

const DAY_OPTIONS = [
  { value: "sunday", label: "Neděle 18:00" },
  { value: "monday", label: "Pondělí 8:00" },
  { value: "wednesday", label: "Středa 18:00" },
  { value: "friday", label: "Pátek 18:00" },
];

export default function RodiceNastaveni() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    report_frequency: "weekly",
    send_day: "sunday",
    inactive_alert: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/rodice/prihlaseni"); return; }
      setToken(session.access_token);

      try {
        const res = await fetch("/api/parent-settings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = (await res.json()) as Partial<Settings>;
          setSettings((prev) => ({ ...prev, ...json }));
        }
      } catch { /* use defaults */ }
      setLoading(false);
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);

    try {
      await fetch("/api/parent-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    if (!unlinkConfirm) { setUnlinkConfirm(true); return; }
    if (!token) return;
    setUnlinking(true);

    try {
      await fetch("/api/parent-unlink", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.replace("/rodice/propojeni");
    } finally {
      setUnlinking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#2E6DA4", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm mx-auto pt-4">

      {/* Header */}
      <div>
        <Link href="/rodice/dashboard" className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-4">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-extrabold" style={{ color: "#0D1B3E" }}>Nastavení reportů</h1>
        <p className="text-sm text-slate-500 mt-1">Přizpůsobte si, jak a kdy dostávat přehledy.</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">

        {/* Report frequency */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Frekvence reportů</p>
          <div className="flex flex-col gap-2">
            {FREQUENCY_OPTIONS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer py-1">
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    borderColor: settings.report_frequency === value ? "#2E6DA4" : "#cbd5e1",
                    background: settings.report_frequency === value ? "#2E6DA4" : "transparent",
                  }}
                  onClick={() => setSettings((s) => ({ ...s, report_frequency: value }))}
                >
                  {settings.report_frequency === value && (
                    <span className="w-2 h-2 rounded-full bg-white block" />
                  )}
                </div>
                <span className="text-sm text-slate-700">{label}</span>
                <input
                  type="radio"
                  name="frequency"
                  value={value}
                  checked={settings.report_frequency === value}
                  onChange={() => setSettings((s) => ({ ...s, report_frequency: value }))}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Send day */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Den odeslání</p>
          <div className="relative">
            <select
              value={settings.send_day}
              onChange={(e) => setSettings((s) => ({ ...s, send_day: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 appearance-none bg-white pr-10"
              style={{ color: "#0D1B3E" }}
            >
              {DAY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▾</span>
          </div>
        </div>

        {/* Inactive alert */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Upozornění na neaktivitu</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Upozornit mě, pokud dítě necvičí 2 dny v řadě
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, inactive_alert: !s.inactive_alert }))}
              className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
              style={{ background: settings.inactive_alert ? "#2E6DA4" : "#e2e8f0" }}
            >
              <span
                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                style={{ left: settings.inactive_alert ? "calc(100% - 26px)" : "2px" }}
              />
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl text-white font-extrabold text-base disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%)" }}
        >
          {saving ? "Ukládám…" : saved ? "✅ Uloženo" : "Uložit nastavení"}
        </button>
      </form>

      {/* Danger zone */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ border: "1px solid #fecaca", background: "#fff5f5" }}
      >
        <p className="text-sm font-bold text-red-700">Nebezpečná zóna</p>
        <p className="text-xs text-red-500 leading-relaxed">
          Zrušení propojení odstraní váš přístup k datům dítěte.
          Dítě zůstane ve svém účtu nedotčeno.
        </p>
        <button
          type="button"
          onClick={handleUnlink}
          disabled={unlinking}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all"
          style={
            unlinkConfirm
              ? { background: "#dc2626", color: "#fff" }
              : { background: "#fff", color: "#dc2626", border: "2px solid #dc2626" }
          }
        >
          {unlinking
            ? "Rušení…"
            : unlinkConfirm
              ? "⚠️ Opravdu zrušit propojení?"
              : "Zrušit propojení s dítětem"}
        </button>
        {unlinkConfirm && !unlinking && (
          <button
            type="button"
            onClick={() => setUnlinkConfirm(false)}
            className="text-xs text-slate-400 text-center"
          >
            Zrušit
          </button>
        )}
      </div>

    </div>
  );
}
