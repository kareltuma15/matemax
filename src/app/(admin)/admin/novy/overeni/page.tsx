import { redirect } from "next/navigation";
import { OvereniFaktoru } from "@/components/admin2/DruhyFaktor";
import { stavAdmina } from "@/lib/admin2/auth";

/** Ověření druhého faktoru po přihlášení (relace aal1 → aal2). Bez rozvržení adminu. */
export const metadata = { title: "Ověření · MateMax Admin" };

export default async function Overeni() {
  const s = await stavAdmina(true);
  if (s.ok && (!s.maFaktor || s.aal2)) redirect("/admin/novy");
  return (
    <div className="a2" style={{ display: "grid", placeItems: "center", padding: "40px 16px" }}>
      <OvereniFaktoru />
    </div>
  );
}
