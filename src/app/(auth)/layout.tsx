export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#F8FAFF" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight" style={{ color: "#0D1B3E" }}>
            Mate<span style={{ color: "#2E6DA4" }}>Max</span>
          </span>
          <p className="text-xs text-slate-400 mt-1">Příprava na přijímačky z matematiky</p>
        </div>
        {children}
      </div>
    </div>
  );
}
