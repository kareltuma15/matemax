"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Data {
  dni: number;
  mereniOd: string | null;
  souhrn: { navstevniku: number; stranek: number; novychUctu: number };
  poDnech: { den: string; navstevniku: number; stranek: number }[];
  zdroje: { k: string; n: number }[];
  stranky: { k: string; n: number }[];
  kliky: { k: string; n: number }[];
  zarizeni: { k: string; n: number }[];
  trychtyr: { krok: string; n: number }[];
}

function Seznam({ nadpis, polozky }: { nadpis: string; polozky: { k: string; n: number }[] }) {
  return (
    <div className="mm-karta p-4">
      <b className="text-sm" style={{ color: "#0D1B3E" }}>{nadpis}</b>
      {polozky.length === 0 ? <p className="text-sm mt-2" style={{ color: "#8A93AA" }}>Zatím nic.</p> : (
        <ul className="mt-2 flex flex-col gap-1">
          {polozky.map((x) => (
            <li key={x.k} className="flex justify-between gap-3 text-sm"><span className="truncate" style={{ color: "#33405F" }}>{x.k}</span><b className="tabular-nums" style={{ color: "#0D1B3E" }}>{x.n}</b></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Návštěvnost a trychtýř od návštěvy po platbu (jen pro admina). Data z měření bez cookies. */
export default function NavstevnostPage() {
  const [dni, setDni] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    let zruseno = false;
    (async () => {
      if (!supabase) { setChyba("Supabase není dostupné."); return; }
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setChyba("Přihlas se jako admin."); return; }
      const r = await fetch(`/api/admin/navstevnost?dni=${dni}`, { headers: { Authorization: `Bearer ${s.session.access_token}` } });
      const j = await r.json();
      if (zruseno) return;
      if (!r.ok) setChyba(j.error ?? "Chyba"); else { setChyba(null); setData(j); }
    })();
    return () => { zruseno = true; };
  }, [dni]);

  const max = Math.max(1, ...(data?.poDnech.map((d) => d.navstevniku) ?? [1]));
  const prvni = data?.trychtyr[0]?.n || 1;

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full mm-siroke" data-testid="navstevnost">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin" className="text-sm font-semibold mm-odkaz" style={{ color: "#4741B8" }}>← Admin</Link>
          <h1 className="text-[26px] font-extrabold" style={{ color: "#0D1B3E" }}>Návštěvnost a registrace</h1>
          <p className="text-sm" style={{ color: "#5F6982" }}>Měření bez cookies: unikátní návštěvník = stejné zařízení během jednoho dne.{data?.mereniOd ? ` Měří se od ${new Date(data.mereniOd).toLocaleDateString("cs-CZ")}.` : ""}</p>
        </div>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDni(d)} className="px-3 py-1.5 rounded-full text-sm font-bold" style={dni === d ? { background: "#0D1B3E", color: "#fff" } : { background: "#fff", color: "#0D1B3E", border: "1px solid #E4E6EF" }}>{d} dní</button>
          ))}
        </div>
      </div>

      {chyba && <p className="mm-karta p-4 text-sm" style={{ color: "#B4232F" }}>{chyba}</p>}
      {!data && !chyba && <div className="skeleton rounded-[20px]" style={{ height: 300 }} />}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[["Návštěvníků", data.souhrn.navstevniku], ["Zobrazených stránek", data.souhrn.stranek], ["Nových účtů", data.souhrn.novychUctu]].map(([l, v]) => (
              <div key={l as string} className="mm-karta p-4"><p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A93AA" }}>{l}</p><p className="text-3xl font-black tabular-nums" style={{ color: "#0D1B3E" }}>{v}</p></div>
            ))}
          </div>

          <div className="mm-karta p-4">
            <b className="text-sm" style={{ color: "#0D1B3E" }}>Návštěvníci po dnech</b>
            <div className="flex items-end gap-[3px] h-32 mt-3">
              {data.poDnech.map((d) => (
                <div key={d.den} className="flex-1 rounded-t" title={`${d.den}: ${d.navstevniku} návštěvníků, ${d.stranek} stránek`} style={{ height: `${Math.max(2, (d.navstevniku / max) * 100)}%`, background: d.navstevniku ? "#5B55D6" : "#E4E6EF" }} />
              ))}
            </div>
          </div>

          <div className="mm-karta p-4" data-testid="trychtyr">
            <b className="text-sm" style={{ color: "#0D1B3E" }}>Kde lidé odpadají (za {data.dni} dní)</b>
            <div className="flex flex-col gap-1.5 mt-3">
              {data.trychtyr.map((t, i) => {
                const pred = i > 0 ? data.trychtyr[i - 1].n : null;
                const ztrata = pred && pred > 0 ? Math.round((1 - t.n / pred) * 100) : null;
                return (
                  <div key={t.krok} className="grid grid-cols-[minmax(0,220px)_1fr_auto] gap-3 items-center text-sm">
                    <span style={{ color: "#33405F" }}>{t.krok}</span>
                    <span className="h-5 rounded-md" style={{ background: "#EEF0F6" }}>
                      <span className="block h-full rounded-md" style={{ width: `${Math.max(1, (t.n / prvni) * 100)}%`, background: i < 5 ? "#5B55D6" : i < 9 ? "#2E6DA4" : "#F5A623" }} />
                    </span>
                    <span className="tabular-nums w-24 text-right"><b style={{ color: "#0D1B3E" }}>{t.n}</b>{ztrata !== null && ztrata > 0 && <span className="ml-1.5 text-xs" style={{ color: "#B4232F" }}>−{ztrata} %</span>}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <Seznam nadpis="Odkud přišli" polozky={data.zdroje} />
            <Seznam nadpis="Nejnavštěvovanější stránky" polozky={data.stranky} />
            <Seznam nadpis="Prokliky (kam klikali)" polozky={data.kliky} />
            <Seznam nadpis="Zařízení" polozky={data.zarizeni} />
          </div>
        </>
      )}
    </div>
  );
}
