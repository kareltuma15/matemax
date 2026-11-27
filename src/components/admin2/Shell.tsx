"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Hledani from "./Hledani";
import Zvonek from "./Zvonek";
import type { Upozorneni } from "@/lib/admin2/upozorneni";
import { ToastProvider } from "./Toast";
import { prepniRezim, zapisPouziti } from "@/app/(admin)/admin/novy/akce";

/**
 * Vlastní rozvržení adminu (KO-01 až KO-03): na mobilu spodní lišta Dnes · Žáci · Zprávy · Plán · Více,
 * na desktopu levý panel se všemi sekcemi. Nahoře název sekce nebo drobečky, hledání (Ctrl+K)
 * a přepínač režimu sdílení. Filtry z adresy (období, třída, zdroj) se přenášejí mezi sekcemi.
 */
export interface Sekce { klic: string; nazev: string; href: string; odznak?: number; pozn?: string; mobil?: boolean }

export const SEKCE: Sekce[] = [
  { klic: "dnes", nazev: "Dnes", href: "/admin/novy", mobil: true },
  { klic: "zaci", nazev: "Žáci", href: "/admin/novy/zaci", mobil: true },
  { klic: "zpravy", nazev: "Zprávy", href: "/admin/novy/zpravy", mobil: true },
  { klic: "plan", nazev: "Plán", href: "/admin/novy/plan", mobil: true },
  { klic: "uceni", nazev: "Učení", href: "/admin/novy/uceni" },
  { klic: "obsah", nazev: "Obsah", href: "/admin/obsah", pozn: "starý vzhled" },
  { klic: "hlas", nazev: "Hlas", href: "/admin/novy/hlas", pozn: "fáze C" },
  { klic: "chovani", nazev: "Chování", href: "/admin/navstevnost", pozn: "starý vzhled" },
  { klic: "rust", nazev: "Růst", href: "/admin/analytika", pozn: "starý vzhled" },
  { klic: "testy", nazev: "Testy", href: "/admin/testy", pozn: "starý vzhled" },
  { klic: "system", nazev: "Systém", href: "/admin/novy/nastaveni" },
];

const IKONY: Record<string, React.ReactNode> = {
  dnes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  zaci: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.7 3.1 2.4 3.5 5.2" /></svg>,
  zpravy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 13l8.5-6.5" /></svg>,
  plan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 9l2 2 4-4M8 15h8" /></svg>,
  vice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>,
};

const FILTRY = ["obdobi", "od", "do", "trida", "zdroj"];

export default function Shell({ sekce, titulek, drobky, odznaky, sdileni, demo, upozorneni = [], children }: {
  sekce: string; titulek: string; drobky?: { nazev: string; href: string }[]; odznaky: Record<string, number>; sdileni: boolean; demo: boolean; upozorneni?: Upozorneni[]; children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const router = useRouter();
  const [hledani, setHledani] = useState(false);
  const [vice, setVice] = useState(false);
  const [pending, start] = useTransition();

  // Filtry platí napříč sekcemi (KO-06): přidají se k odkazům nového adminu
  const q = new URLSearchParams();
  for (const k of FILTRY) { const v = sp.get(k); if (v) q.set(k, v); }
  const sFiltry = (href: string) => (href.startsWith("/admin/novy") && q.toString() ? `${href}?${q}` : href);

  useEffect(() => {
    const kl = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setHledani(true); } };
    window.addEventListener("keydown", kl);
    return () => window.removeEventListener("keydown", kl);
  }, []);
  // Admin se učí: které sekce Karel otevírá (jednou za načtení stránky)
  useEffect(() => { void zapisPouziti(sekce).catch(() => {}); }, [sekce]);

  const aktivni = (s: Sekce) => s.klic === sekce;
  const odkaz = (s: Sekce, mobil = false) => (
    <Link key={s.klic} href={sFiltry(s.href)} className={mobil ? undefined : "a2-odkaz"} aria-current={aktivni(s) ? "page" : undefined} onClick={() => setVice(false)} data-testid={`a2-nav-${s.klic}`}>
      {mobil && IKONY[s.klic]}
      <span>{s.nazev}</span>
      {!mobil && s.pozn && !odznaky[s.klic] && <small>{s.pozn}</small>}
      {(odznaky[s.klic] ?? 0) > 0 && <span className="a2-odz">{odznaky[s.klic]}</span>}
    </Link>
  );

  return (
    <ToastProvider>
      <div className="a2" data-testid="admin2">
        <div className="a2-ramec">
          <nav className="a2-bok" aria-label="Sekce adminu">
            <span className="a2-logo"><i>M²</i>MateMax Admin</span>
            {SEKCE.map((s) => odkaz(s))}
            <span style={{ flex: 1 }} />
            <Link href="/admin" className="a2-odkaz"><span>Starý admin</span><small>do přepnutí</small></Link>
          </nav>
          <div className="a2-hlavni">
            <header className="a2-lista">
              {drobky?.length ? (
                <nav className="a2-drobky" aria-label="Drobečková navigace">
                  {drobky.map((d) => (
                    <span key={d.href} className="a2-radek" style={{ gap: 6, flexWrap: "nowrap" }}>
                      {/* Zpět na seznam se stejnými filtry (KO-05): adresu si pamatuje seznam žáků */}
                      <Link href={d.href} onClick={(e) => { try { const ulozeno = sessionStorage.getItem("admin2-seznam"); if (ulozeno && ulozeno.startsWith(d.href)) { e.preventDefault(); router.push(ulozeno); } } catch { /* nic */ } }}>← {d.nazev}</Link>
                      <span aria-hidden="true">›</span>
                    </span>
                  ))}
                  <b>{titulek}</b>
                </nav>
              ) : <h1>{titulek}</h1>}
              <button type="button" className="a2-ikbtn a2-hledat-btn" onClick={() => setHledani(true)} aria-label="Hledat (Ctrl+K)" data-testid="a2-hledat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <span className="hidden lg:inline">Hledat</span><kbd>Ctrl K</kbd>
              </button>
              <Zvonek seznam={upozorneni} demo={demo} />
              <button type="button" className="a2-ikbtn" aria-pressed={sdileni} disabled={pending} onClick={() => start(() => prepniRezim("sdileni", !sdileni))} title="Režim sdílení: skryje jména, e-maily a ID" data-testid="a2-sdileni">
                {sdileni ? "Sdílení ✓" : "Sdílení"}
              </button>
            </header>
            {demo && (
              <div className="a2-obsah" style={{ paddingBottom: 0 }}>
                <div className="a2-banner demo" data-testid="a2-demo-banner"><span><b>Demo data.</b> Vymyšlení žáci pro ukázky a screenshoty, nic se nečte z databáze.</span><button type="button" className="a2-btn a2-sek a2-male" onClick={() => start(() => prepniRezim("demo", false))}>Vypnout demo</button></div>
              </div>
            )}
            <main className="a2-obsah" key={pathname}>{children}</main>
          </div>
        </div>

        <nav className="a2-spodni" aria-label="Hlavní sekce">
          {SEKCE.filter((s) => s.mobil).map((s) => odkaz(s, true))}
          <button type="button" onClick={() => setVice(true)} aria-expanded={vice} aria-current={!SEKCE.find((s) => s.klic === sekce)?.mobil ? "page" : undefined} data-testid="a2-nav-vice">
            {IKONY.vice}<span>Více</span>
            {SEKCE.filter((s) => !s.mobil).some((s) => (odznaky[s.klic] ?? 0) > 0) && <span className="a2-odz">•</span>}
          </button>
        </nav>
        {vice && (
          <>
            <div className="a2-zavoj" onClick={() => setVice(false)} />
            <div className="a2-vice" role="dialog" aria-label="Další sekce">
              {SEKCE.filter((s) => !s.mobil).map((s) => odkaz(s))}
              <Link href="/admin" className="a2-odkaz"><span>Starý admin</span></Link>
            </div>
          </>
        )}
        <Hledani otevreno={hledani} zavri={() => setHledani(false)} />
      </div>
    </ToastProvider>
  );
}
