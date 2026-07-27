import HeaderClient from "@/components/HeaderClient";
import BottomNav from "@/components/BottomNav";
import AppMain from "@/components/AppMain";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "#F8FAFF" }}>
      <HeaderClient />
      <AppMain>{children}</AppMain>
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
