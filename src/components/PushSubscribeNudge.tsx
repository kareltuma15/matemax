"use client";
import { useState, useEffect } from "react";

const DISMISSED_KEY = "matemax-push-nudge-dismissed";

interface Props {
  streak: number;
  userId?: string;
}

export default function PushSubscribeNudge({ streak, userId }: Props) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") return; // already subscribed
    if (Notification.permission === "denied") return; // user denied
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (streak < 3) return; // only nudge users with a real streak
    setVisible(true);
  }, [streak]);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setVisible(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userId }),
      });
      setDone(true);
      setTimeout(() => setVisible(false), 2000);
    } catch {
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  if (done) {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
      >
        <span className="text-xl">✅</span>
        <p className="text-sm font-semibold text-green-700">
          Připomenutí zapnuta! Streak {streak} dní je v bezpečí. 🔥
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
    >
      <span className="text-2xl shrink-0">🔥</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-800">
          Chráň svůj streak {streak} dní
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Zapni připomenutí a nikdy nepřijď o svůj streak.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60"
          style={{ background: "#f59e0b", color: "white" }}
        >
          {loading ? "…" : "Zapnout"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-amber-400 hover:text-amber-600 p-1"
          aria-label="Zavřít"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
