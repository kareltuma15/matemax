"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSbirka } from "@/lib/use-sbirka";
import { localDateStr } from "@/lib/date";
import { usePremium } from "@/lib/premium";
import { domovHexika, pokojHexika, nasazena, etapaHexika, slotyHexika, SADA_EVENT, SADY } from "@/lib/sbirka";
import { nasazeneVybaveni } from "@/lib/vybaveni";
import { dnesniTrenink } from "@/lib/dnesni-trenink";
import { loadProgress } from "@/lib/progress";
import type { Domov3D, KouzloDomova } from "@/lib/hexik3d/domovy";
import type { Trida } from "@/types";

const klicKouzel = (id: string) => `matemax-domov-kouzla-${id}`;
const nactiObjevena = (id: string): string[] => { try { return JSON.parse(localStorage.getItem(klicKouzel(id)) ?? "[]") as string[]; } catch { return []; } };

const dni = (n: number) => (n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní");

/**
 * Hexíkův pokojíček ve 3D (Karel 20. 11. 2026). Ťuknutí na věc = Hexík k ní dojde a udělá kouzlo,
 * ťuknutí na podlahu = dojde tam. Tabule vede do tréninku, skříň do šatníku (krátký přechod, ťuknutí
 * ho přeskočí). Počítadlo objevených kouzel, bublina s popisem, celá obrazovka.
 *
 * `hero`: úvodní obrázek sekce Hexík. Ukáže se vždy (bez pokoje ze sady základní pokojíček), s tlačítkem
 * Trénovat v popředí a obsahem `pod` (pruh s úrovní). Bez WebGL ukáže `zalozni`.
 * Bez `hero` (Domov, profil): karta jen u pokoje ze sady.
 */
export default function DomovHexika({ trida, odkaz = true, hero = false, pod, zalozni, onSatnik }: {
  trida: Trida; odkaz?: boolean; hero?: boolean; pod?: ReactNode; zalozni?: ReactNode; onSatnik?: () => void;
}) {
  const { stav, nacteno } = useSbirka();
  const { isPremium } = usePremium();
  const domov = !nacteno ? null : hero ? pokojHexika(stav, trida) : domovHexika(stav, trida);
  const podoba = nasazena(stav, trida, "podoba").klic;
  const etapa = etapaHexika(stav.maxOdhad[trida]);
  const sloty = slotyHexika(stav, trida);
  const slotyKlic = JSON.stringify(sloty);
  const vybaveni = nasazeneVybaveni(stav);
  const vybKlic = domov?.id === "zakladni-pokojicek" ? JSON.stringify(vybaveni) : "";
  const plocha = useRef<HTMLDivElement>(null);
  const inst = useRef<Domov3D | null>(null);
  // Tabule svítí, dokud dnes nebyl dokončený trénink
  const dnesHotovo = stav.denniOdemcena === localDateStr();
  const posledni = useRef({ podoba, etapa, sloty, isPremium, dnesHotovo, vybaveni, onSatnik });
  useEffect(() => { posledni.current = { podoba, etapa, sloty, isPremium, dnesHotovo, vybaveni, onSatnik }; });
  const router = useRouter();
  const [pruchod, setPruchod] = useState<{ k: "trenink" | "satnik"; href: string } | null>(null);
  const [bez3D, setBez3D] = useState(false);
  const [cela, setCela] = useState(false);
  const [kouzla, setKouzla] = useState<KouzloDomova[]>([]);
  const [objevena, setObjevena] = useState<string[]>([]);
  const [bublina, setBublina] = useState<{ text: string; nove: boolean; id: number } | null>(null);
  const [hrefTreninku, setHrefTreninku] = useState("/trenink");
  const domovId = domov?.id ?? null;

  useEffect(() => {
    if (!domovId || !plocha.current) return;
    let zruseno = false;
    let canvas: HTMLCanvasElement | null = null;
    setObjevena(nactiObjevena(domovId));
    Promise.all([import("@/lib/hexik3d/domovy"), import("@/lib/hexik3d/scena"), import("@/lib/hexik3d/studio")]).then(async ([dm, { umi3D }, { slabeZarizeni }]) => {
      if (zruseno || !plocha.current) return;
      if (!umi3D() || !dm.jeHotovyDomov(domovId)) { setBez3D(true); return; }
      const seznam = await dm.kouzlaDomova(domovId);
      if (zruseno || !plocha.current) return;
      setKouzla(seznam);
      canvas = document.createElement("canvas");
      canvas.className = "block w-full h-full";
      canvas.style.cursor = "grab";
      canvas.style.touchAction = "pan-y";
      plocha.current.appendChild(canvas);
      const p = posledni.current;
      const dnes = dnesniTrenink(trida, p.isPremium);
      const serie = loadProgress().streak ?? 0;
      const tabule = [
        "Dnešní plán",
        dnes ? (dnes.nazevDovednosti ?? dnes.nazevTematu) : "Trénink podle tebe",
        serie > 0 ? `🔥 série ${serie} ${dni(serie)}` : "🔥 začni sérii ještě dnes",
      ];
      const href = dnes?.href ?? "/trenink";
      setHrefTreninku(href);
      const popis = new Map(seznam.map((k) => [k.klic, k.popis]));
      try {
        inst.current = await dm.vytvorDomov(canvas, domovId, {
          podoba: p.podoba, etapa: p.etapa, sloty: p.sloty, tabule, lehce: slabeZarizeni(), tabuleSviti: !p.dnesHotovo, vybaveni: p.vybaveni,
          onPruchod: (k) => setPruchod({ k, href: k === "trenink" ? href : "/sbirka?tab=satnik" }),
          onKouzlo: (k) => {
            if (!popis.has(k)) return;
            const pred = nactiObjevena(domovId);
            const nove = !pred.includes(k);
            const po = nove ? [...pred, k] : pred;
            if (nove) { try { localStorage.setItem(klicKouzel(domovId), JSON.stringify(po)); } catch { /* soukromé okno */ } }
            setObjevena(po);
            const vse = nove && po.length === seznam.length;
            if (vse) inst.current?.oslava();
            setBublina({ text: vse ? `Všech ${seznam.length} kouzel objeveno! 🎉` : popis.get(k) ?? "", nove, id: Date.now() });
          },
        });
        if (zruseno) { inst.current.znic(); inst.current = null; }
      } catch {
        canvas.remove(); canvas = null; setBez3D(true);
      }
    }).catch(() => setBez3D(true));
    const naSadu = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: string[] }>).detail?.ids ?? [];
      if (SADY[trida].some((sd) => ids.includes(sd.id) && sd.domov.id === domovId)) inst.current?.oslava();
    };
    window.addEventListener(SADA_EVENT, naSadu);
    return () => {
      zruseno = true;
      window.removeEventListener(SADA_EVENT, naSadu);
      inst.current?.znic(); inst.current = null;
      canvas?.remove();
    };
  }, [domovId, trida, vybKlic]);

  useEffect(() => { inst.current?.nastav(podoba, etapa, sloty); }, [podoba, etapa, slotyKlic]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bublina) return;
    const t = setTimeout(() => setBublina(null), 2800);
    return () => clearTimeout(t);
  }, [bublina]);

  // Průchod: kamera letí za Hexíkem, po 1,2 s se otevře trénink nebo šatník (v sekci Hexík jen přepne záložku)
  const dokonciPruchod = (p: { k: "trenink" | "satnik"; href: string }) => {
    const naSatnik = posledni.current.onSatnik;
    if (p.k === "satnik" && naSatnik) { setPruchod(null); setCela(false); inst.current?.zpet(); naSatnik(); return; }
    router.push(p.href);
  };
  useEffect(() => {
    if (!pruchod) return;
    const t = setTimeout(() => dokonciPruchod(pruchod), 1200);
    return () => clearTimeout(t);
  }, [pruchod]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inst.current?.rezim(cela);
    const canvas = plocha.current?.querySelector("canvas");
    if (canvas) canvas.style.touchAction = cela ? "none" : "pan-y";
    if (!cela) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setCela(false); };
    window.addEventListener("keydown", esc);
    const puvodni = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = puvodni; };
  }, [cela]);

  if (!domov) return null;
  if (bez3D) return hero ? <>{zalozni}{pod}</> : null;
  const ikona = SADY[trida].find((sd) => sd.domov.id === domov.id)?.ikona ?? "🏠";
  const vyska = hero ? "min(58vh, 480px)" : "clamp(300px, 64vw, 460px)";
  return (
    <section
      className={cela ? "fixed inset-0 z-[90] flex flex-col" : hero ? "rounded-3xl overflow-hidden" : "mm-karta overflow-hidden p-0"}
      style={cela ? { background: "#1B1236" } : hero ? { background: "#0D1B3E", boxShadow: "0 14px 30px rgba(13,27,62,.22)" } : undefined}
      data-testid={hero ? "hexik-pokoj" : "domov-hexika"} data-domov={domov.id}
    >
      <div ref={plocha} className={`relative w-full ${cela ? "flex-1 min-h-0" : ""}`} style={cela ? { background: "#1B1236" } : { height: vyska, minHeight: 300, background: "#1B1236" }}>
        {kouzla.length > 0 && (
          <span className="absolute top-3 left-3 z-10 text-xs font-extrabold px-2.5 py-1 rounded-full pointer-events-none" style={{ background: "rgba(13,27,62,.72)", color: "#FFE7A8", backdropFilter: "blur(4px)" }} data-testid="domov-pocitadlo">
            ✨ {objevena.length} / {kouzla.length} kouzel
          </span>
        )}
        <button
          type="button"
          onClick={() => setCela((c) => !c)}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-xl grid place-items-center text-lg font-black"
          style={{ background: "rgba(13,27,62,.72)", color: "#fff", backdropFilter: "blur(4px)" }}
          aria-label={cela ? "Zavřít celou obrazovku" : "Celá obrazovka"}
          data-testid="domov-cela"
        >
          {cela ? "✕" : "⤢"}
        </button>
        {hero && (
          <Link href={hrefTreninku} className="mm-tlacitko absolute left-1/2 -translate-x-1/2 bottom-4 z-10 rounded-2xl px-8 py-3 text-lg font-black" style={{ background: "#F5A623", color: "#0D1B3E", boxShadow: "0 8px 20px rgba(0,0,0,.35)" }} data-testid="pokoj-trenovat">
            Trénovat
          </Link>
        )}
        {bublina && (
          <div key={bublina.id} className={`absolute left-1/2 -translate-x-1/2 ${hero ? "bottom-20" : "bottom-3"} z-10 max-w-[92%] rounded-2xl px-4 py-2.5 text-sm font-extrabold text-center fade-in-up`} style={{ background: "rgba(255,255,255,.95)", color: "#0D1B3E", boxShadow: "0 8px 24px rgba(0,0,0,.25)" }} data-testid="domov-bublina">
            {bublina.nove && <span style={{ color: "#B7791F" }}>Nové kouzlo! </span>}{bublina.text}
          </div>
        )}
        {pruchod && (
          <button type="button" onClick={() => dokonciPruchod(pruchod)} className="absolute inset-0 z-20 domov-pruchod grid place-items-center" aria-label={pruchod.k === "trenink" ? "Otevřít trénink" : "Otevřít šatník"} data-testid="domov-pruchod">
            <span className="domov-pruchod-text text-white text-lg font-black">{pruchod.k === "trenink" ? "Jdeme trénovat →" : "Do šatníku →"}</span>
          </button>
        )}
      </div>
      {hero && !cela && pod}
      {!hero && (
        <div className={`flex items-center gap-3 px-4 py-3 ${cela ? "text-white" : ""}`}>
          <span className="text-2xl" aria-hidden="true">{ikona}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black leading-tight" style={{ color: cela ? "#fff" : "#0D1B3E" }}>Hexík bydlí: {domov.nazev}</p>
            <p className="text-xs" style={{ color: cela ? "#C9C7F5" : "#5F6982" }}>Ťukni na věc a Hexík ji udělá. Ťukni na podlahu a dojde tam. Táhni pro otočení.</p>
          </div>
          {odkaz && !cela && <Link href="/sbirka" className="text-sm font-extrabold shrink-0" style={{ color: "#2E6DA4" }}>Pokojíček</Link>}
        </div>
      )}
    </section>
  );
}
