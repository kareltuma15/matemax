import HeaderClient from "@/components/HeaderClient";
import BottomNav from "@/components/BottomNav";
import AppMain from "@/components/AppMain";
import AppFooter from "@/components/AppFooter";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "#F8FAFF" }}>
      <HeaderClient />
      <AppMain>{children}</AppMain>
      <AppFooter />
      <BottomNav />
    </div>
  );
}
