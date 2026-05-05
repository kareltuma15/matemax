import HeaderClient from "@/components/HeaderClient";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFF" }}>
      <HeaderClient />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 pb-24">
        {children}
      </main>
      <footer
        className="text-center text-xs py-4 pb-20"
        style={{ color: "#94a3b8" }}
      >
        MateMax © 2026 · Matematika pro 9. třídu · CERMAT
      </footer>
      <BottomNav />
    </div>
  );
}
