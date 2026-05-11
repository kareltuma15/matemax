import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "#F8FAFF", color: "#0D1B3E" }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
        style={{ background: "#e8f0fe" }}
      >
        🔍
      </div>
      <h1 className="text-5xl font-black mb-2" style={{ color: "#0D1B3E" }}>
        404
      </h1>
      <h2 className="text-xl font-bold mb-3">Stránka nenalezena</h2>
      <p className="text-slate-500 text-sm mb-8 max-w-xs">
        Tato stránka neexistuje nebo byla přesunuta. Zkontroluj adresu nebo se vrať na hlavní
        stránku.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
          style={{ background: "#0D1B3E" }}
        >
          Domů
        </Link>
        <Link
          href="/trenink"
          className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600"
        >
          Na trénink
        </Link>
      </div>
    </div>
  );
}
