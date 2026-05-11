"use client";

import Link from "next/link";

export default function AuthError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6" style={{ background: "#F8FAFF", color: "#0D1B3E" }}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-bold mb-2">Chyba přihlášení</h2>
        <p className="text-slate-500 text-sm mb-5">
          Nastala neočekávaná chyba. Zkus to znovu.
          {error.digest && (
            <span className="block mt-1 text-xs text-slate-400">Kód: {error.digest}</span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={unstable_retry}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: "#1a3a6e" }}
          >
            Zkusit znovu
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600"
          >
            Zpět domů
          </Link>
        </div>
      </div>
    </div>
  );
}
