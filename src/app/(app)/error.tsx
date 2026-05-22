"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error.message, error.digest);
    fetch("/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "react_error_boundary",
        message: error.message ?? "Unknown render error",
        stack: error.stack?.slice(0, 800),
        digest: error.digest,
        url: window.location.href,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
      style={{ color: "#0D1B3E" }}
    >
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold mb-2">Něco se pokazilo</h2>
      <p className="text-slate-500 text-sm mb-6 max-w-xs">
        Nastala neočekávaná chyba. Zkus to znovu nebo se vrať na hlavní stránku.
        {error.digest && (
          <span className="block mt-1 text-xs text-slate-400">Kód: {error.digest}</span>
        )}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
          style={{ background: "#1a3a6e" }}
        >
          Zkusit znovu
        </button>
        <Link
          href="/trenink"
          className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600"
        >
          Zpět na trénink
        </Link>
      </div>
    </div>
  );
}
