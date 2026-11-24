"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/** Admin → E-maily (Karel 24. 11. 2026): náhled každého e-mailu, kdo by ho dnes dostal, co naposledy odešlo. */
interface Nahled { id: string; trida: 5 | 9; nazev: string; kdy: string; pripominka: boolean; predmet: string; pre: string; html: string }
interface Data {
  dnes: string;
  nahledy: Nahled[];
  dnesBy: { trida: 5 | 9; posle: string; email: string }[];
  chybaBehu: string | null;
  odeslane: { created_at: string; user_id: string | null; properties: { e?: string; trida?: number } }[];
}

export default function AdminEmaily() {
  const [data, setData] = useState<Data | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [vybrany, setVybrany] = useState("uvitani");
  const [trida, setTrida] = useState<5 | 9>(9);

  useEffect(() => {
    (async () => {
      if (!supabase) { setChyba("Supabase není dostupné."); return; }
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setChyba("Přihlas se jako admin."); return; }
      const r = await fetch("/api/admin/emaily", { headers: { Authorization: `Bearer ${s.session.access_token}` }, cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setChyba((j as { error?: string }).error ?? "Chyba");
      else setData(j as Data);
    })();
  }, []);

  if (chyba) return <div className="p-6 text-sm" style={{ color: "#B4232F" }}>{chyba}</div>;
  if (!data) return <div className="p-6 text-sm text-slate-500">Načítám…</div>;

  const typy = data.nahledy.filter((n) => n.trida === 9);
  const nahled = data.nahledy.find((n) => n.id === vybrany && n.trida === trida);
  const nazev = (id?: string) => data.nahledy.find((n) => n.id === id)?.nazev ?? id ?? "?";

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full" data-testid="admin-emaily">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-black" style={{ color: "#0D1B3E" }}>E-maily</h1>
        <Link href="/admin" className="text-sm font-bold underline" style={{ color: "#2E6DA4" }}>← Admin</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
        <div className="flex flex-col gap-2">
          {typy.map((n) => (
            <button key={n.id} type="button" onClick={() => setVybrany(n.id)} className="mm-karta p-3 text-left flex flex-col gap-0.5" style={{ border: vybrany === n.id ? "2px solid #5B55D6" : undefined }} data-testid={`admin-email-${n.id}`}>
              <b className="text-sm" style={{ color: "#0D1B3E" }}>{n.nazev}</b>
              <span className="text-xs" style={{ color: "#5F6982" }}>{n.kdy}</span>
              <span className="text-[11px] font-bold" style={{ color: n.pripominka ? "#9A6200" : "#14753A" }}>{n.pripominka ? "Připomínka · lze odhlásit · strop 2 týdně" : "Servisní · chodí vždy"}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex gap-2">
            {([9, 5] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTrida(t)} className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: trida === t ? "#0D1B3E" : "#fff", color: trida === t ? "#fff" : "#0D1B3E", border: "1px solid #E4E6EF" }}>{t}. třída</button>
            ))}
          </div>
          {nahled && (
            <div className="mm-karta p-3 flex flex-col gap-2 min-w-0">
              <p className="text-sm break-words"><b>Předmět:</b> {nahled.predmet}</p>
              <p className="text-xs break-words" style={{ color: "#5F6982" }}><b>Náhled ve schránce:</b> {nahled.pre}</p>
              <iframe title={`Náhled e-mailu ${nahled.nazev}`} srcDoc={nahled.html} className="w-full rounded-xl border border-slate-200" style={{ height: 900, background: "#F3F5FA" }} data-testid="admin-email-nahled" />
              <p className="text-[11px]" style={{ color: "#8A93AA" }}>Náhled s ukázkovými daty (odhad 24 z 50, série 6 dní, 340 krystalů). Skutečný e-mail má data žáka.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="mm-karta p-4 flex flex-col gap-2 min-w-0" data-testid="admin-emaily-dnes">
          <b style={{ color: "#0D1B3E" }}>Kdo by dnes v 16:00 dostal připomínku</b>
          {data.chybaBehu && <p className="text-sm" style={{ color: "#B4232F" }}>{data.chybaBehu}</p>}
          {data.dnesBy.length === 0 ? <p className="text-sm" style={{ color: "#5F6982" }}>Dnes nikdo.</p> : (
            <ul className="text-sm flex flex-col gap-1">
              {data.dnesBy.map((p) => <li key={p.email} className="break-words"><b>{nazev(p.posle)}</b> · {p.trida}. tř. · {p.email}</li>)}
            </ul>
          )}
        </div>
        <div className="mm-karta p-4 flex flex-col gap-2 min-w-0">
          <b style={{ color: "#0D1B3E" }}>Naposledy odesláno</b>
          {data.odeslane.length === 0 ? <p className="text-sm" style={{ color: "#5F6982" }}>Zatím nic.</p> : (
            <ul className="text-sm flex flex-col gap-1">
              {data.odeslane.map((o, i) => (
                <li key={i}>{new Date(o.created_at).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })} · <b>{nazev(o.properties?.e)}</b>{o.properties?.trida ? ` · ${o.properties.trida}. tř.` : ""}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
