"use client";

import Link from "next/link";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
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
          onClick={unstable_retry}
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
