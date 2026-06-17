"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { loadProgress } from "@/lib/progress";
import type { Session } from "@supabase/supabase-js";
import { getSmartRedirect } from "@/lib/smart-redirect";

const LoggedInDashboard = dynamic(() => import("@/components/LoggedInDashboard"), {
  ssr: false,
  loading: () => null,
});

const DemoCard = dynamic(() => import("@/components/DemoCard"), { ssr: false });

// ─── DATA ────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "🎯",
    title: "Diagnostika",
    subtitle: "Zjistíme, kde stojíš",
    desc: "MateMax začne krátkým adaptivním testem (5 minut). Automaticky pozná, která témata ovládáš a kde máš mezery — a sestaví tréninkový plán přímo na míru.",
    color: "bg-blue-50 border-blue-200",
    accent: "text-blue-600",
  },
  {
    step: "02",
    icon: "🏋️",
    title: "Denní trénink",
    subtitle: "10 minut každý den stačí",
    desc: "Každý den dostaneš sadu příkladů seřazených od lehčích k těžším. Algoritmus sleduje tvé chyby a automaticky tě vrátí k tématům, kde se zasekáváš — dokud je neovládneš.",
    color: "bg-orange-50 border-orange-200",
    accent: "text-orange-600",
  },
  {
    step: "03",
    icon: "📊",
    title: "Týdenní report",
    subtitle: "Rodiče vědí, jak to jde",
    desc: "Každé pondělí ráno dostanou rodiče email s přehledem: kolik příkladů dítě zvládlo, jaký má streak, kde má mezery a co procvičovat příští týden. Bez zkoušení u večeře.",
    color: "bg-green-50 border-green-200",
    accent: "text-green-600",
  },
];

const PRICING = [
  {
    name: "Zdarma",
    price: "0 Kč",
    period: "",
    desc: "Pro vyzkoušení, bez závazku",
    highlight: false,
    features: [
      "✓ Diagnostický test",
      "✓ 3 témata (zlomky, rovnice, geometrie)",
      "✓ 10 příkladů denně",
      "✓ Základní statistiky",
      "✗ Týdenní report pro rodiče",
      "✗ Plná databáze 900+ příkladů (všechna témata)",
      "✗ CERMAT cvičné testy",
    ],
    cta: "Začít zdarma",
    ctaHref: "/vitej",
    ctaStyle: "border-2 border-[#2E6DA4] text-[#2E6DA4] hover:bg-blue-50",
  },
  {
    name: "Premium",
    price: "99 Kč",
    period: "/ měsíc",
    desc: "Plná příprava na přijímačky",
    highlight: true,
    badge: "Nejoblíbenější",
    features: [
      "✓ Všechna témata CERMAT (9 oblastí)",
      "✓ Neomezený počet příkladů",
      "✓ Adaptivní algoritmus",
      "✓ Týdenní report pro rodiče",
      "✓ 2 kompletní CERMAT cvičné testy",
      "✓ Streak systém + motivační odměny",
      "✓ Přístup na mobilu i počítači",
    ],
    cta: "Vyzkoušet Premium",
    ctaHref: "/registrace",
    ctaStyle: "bg-[#2E6DA4] text-white hover:bg-[#1e5a8a]",
  },
];

const FAQS = [
  {
    q: "Pro jaký věk je MateMax určen?",
    a: "Pro žáky 8. a 9. třídy, ideálně rok před přijímačkami. Obsah přesně odpovídá formátu CERMAT, který používá většina gymnázií a středních škol.",
  },
  {
    q: "Jak dlouho denně se má dítě učit?",
    a: "Stačí 10 minut. Algoritmus sám vybere 7 příkladů — seřazených podle toho, kde žák nejvíc potřebuje procvičit. Pravidelnost je důležitější než délka.",
  },
  {
    q: "Co když dítě udělá chybu? Jak algoritmus reaguje?",
    a: "Příklad se vrátí za 1–2 dny znovu. Přesně tak funguje SM-2 (spaced repetition) — opakování ve chvíli, kdy hrozí zapomenutí. Čím víc chyb, tím dřív se příklad vrátí.",
  },
  {
    q: "Mohu MateMax použít i bez přijímaček?",
    a: "Ano, pro kohokoliv kdo chce procvičovat matematiku. Databáze 900+ příkladů pokrývá 9 témat CERMAT přijímaček — zlomky, výrazy, rovnice, geometrie, slovní úlohy, grafy, konstrukce, úhly a souhrnné.",
  },
  {
    q: "Jak se liší MateMax od pracovního sešitu Matematika Snadno?",
    a: "Sešit je fyzická pomůcka — cheat sheety a příklady na papíře. MateMax je digitální trenér s adaptivním algoritmem, který sleduje pokrok a posílá rodičům týdenní report. Oba produkty se skvěle doplňují.",
  },
  {
    q: "Je přihlášení povinné?",
    a: "Ne, aplikace funguje i bez účtu — veškerý pokrok se uloží do prohlížeče. Registrace se vyplatí, pokud chceš trénovat na více zařízeních nebo nechceš přijít o statistiky při smazání dat prohlížeče.",
  },
  {
    q: "Funguje MateMax offline?",
    a: "Příklady a váš pokrok se ukládají lokálně, takže základní trénink funguje i bez připojení k internetu. Synchronizace s cloudem a týdenní report vyžadují internet.",
  },
  {
    q: "Jak rychle vidím výsledky?",
    a: "Po prvním tréninku algoritmus ihned ví, která témata procvičuješ nejhůř a příště je zařadí jako první. Viditelný pokrok v testech bývá znát po 2–3 týdnech pravidelného tréninku.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Syn se poprvé začal učit sám. Po dvou týdnech vidím zlepšení — a to jsem ho nemusela ani nutit.",
    name: "Petra K.",
    role: "maminka deváťáka",
    emoji: "👩",
    stars: 5,
  },
  {
    quote: "Konečně chápu zlomky! Vždycky mi to vůbec nešlo, ale tady mi algoritmus opakoval přesně ty příklady, kde jsem chyboval.",
    name: "Tomáš, 14 let",
    role: "žák 9. třídy",
    emoji: "🧑‍💻",
    stars: 5,
  },
  {
    quote: "Dcera procvičuje každý den 10 minut a my dostaneme přehled emailem. Přesně to, co jsme hledali.",
    name: "Jan H.",
    role: "tatínek osmačky",
    emoji: "👨",
    stars: 5,
  },
];

const COMPARISON = [
  { label: "Cena", matemax: "99 Kč/měsíc", doucovatel: "400 Kč/hod", sesit: "150 Kč" },
  { label: "Přizpůsobí se žákovi", matemax: true, doucovatel: true, sesit: false },
  { label: "Dostupný 24/7", matemax: true, doucovatel: false, sesit: true },
  { label: "Týdenní report rodičům", matemax: true, doucovatel: false, sesit: false },
  { label: "Sleduje pokrok", matemax: true, doucovatel: false, sesit: false },
  { label: "Gamifikace a streak", matemax: true, doucovatel: false, sesit: false },
];

const MATH_SYMBOLS = [
  { symbol: "π", top: "12%", left: "8%", size: "2rem", delay: "0s", opacity: 0.07 },
  { symbol: "√", top: "22%", left: "91%", size: "2.4rem", delay: "0.5s", opacity: 0.06 },
  { symbol: "∑", top: "65%", left: "5%", size: "1.8rem", delay: "1s", opacity: 0.07 },
  { symbol: "≈", top: "78%", left: "87%", size: "2rem", delay: "1.5s", opacity: 0.06 },
  { symbol: "∞", top: "42%", left: "95%", size: "1.6rem", delay: "0.3s", opacity: 0.05 },
  { symbol: "÷", top: "72%", left: "68%", size: "1.5rem", delay: "0.8s", opacity: 0.06 },
  { symbol: "×", top: "15%", left: "74%", size: "1.4rem", delay: "1.2s", opacity: 0.07 },
  { symbol: "²", top: "55%", left: "14%", size: "1.6rem", delay: "0.6s", opacity: 0.05 },
  { symbol: "³", top: "33%", left: "3%", size: "1.3rem", delay: "0.9s", opacity: 0.06 },
];

// ─── HOOKS ───────────────────────────────────────────────────────────────────

function useParallax() {
  useEffect(() => {
    const layer = document.querySelector<HTMLElement>(".hero-parallax-layer");
    if (!layer) return;
    const onScroll = () => {
      layer.style.transform = `translateY(${window.scrollY * 0.28}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

function useScrollReveal() {
  useEffect(() => {
    let raf1: number, raf2: number;
    let fallbackId: ReturnType<typeof setTimeout>;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(".scroll-reveal"));
        if (!els.length) return;
        // Immediately reveal elements in viewport (Safari IO unreliable on initial load)
        const vh = window.innerHeight || document.documentElement.clientHeight;
        els.forEach(el => { if (el.getBoundingClientRect().top < vh) el.classList.add("is-visible"); });
        // IO for below-fold elements, no negative rootMargin (causes Safari issues)
        const io = new IntersectionObserver(
          (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
          { threshold: 0 }
        );
        els.filter(el => !el.classList.contains("is-visible")).forEach(el => io.observe(el));
        // Safari fallback: force-reveal anything still hidden after 800ms
        fallbackId = setTimeout(() => {
          document.querySelectorAll<HTMLElement>(".scroll-reveal:not(.is-visible)").forEach(el => el.classList.add("is-visible"));
        }, 800);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(fallbackId);
    };
  }, []);
}

// ─── KOMPONENTY ──────────────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
      {children}
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border rounded-xl overflow-hidden"
      style={{ borderColor: open ? "#2E6DA4" : "#e5e7eb" }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors"
        style={{ background: open ? "#f0f7ff" : "#fff" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-semibold pr-4 text-[15px]" style={{ color: "#0D1B3E" }}>
          {q}
        </span>
        <span
          className="text-2xl flex-shrink-0 font-light transition-transform duration-200 select-none"
          style={{
            color: "#2E6DA4",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          className="px-6 pb-5 pt-1 text-sm leading-relaxed border-t"
          style={{ color: "#4b5563", borderColor: "#e0ecf8", background: "#f8fbff" }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

function CountUp({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1400;
          const startTime = performance.now();
          function tick(now: number) {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setCount(Math.round(eased * end));
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

function TiltCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rx = (-y / rect.height) * 8;
    const ry = (x / rect.width) * 8;
    e.currentTarget.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }
  function handleMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }
  return (
    <div
      className={className}
      style={{ ...style, transition: "transform 0.15s ease-out", transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

// ─── LANDING PAGE (HOSTÉ) ─────────────────────────────────────────────────────

export default function LandingPage() {
  const [diagDone, setDiagDone] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useScrollReveal();
  useParallax();

  useEffect(() => {
    const diag = localStorage.getItem("matemax-diag-done") === "1";
    setDiagDone(diag);

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session) {
          const p = loadProgress();
          setXp(p.xp);
          setStreak(p.streak);

          const params = new URLSearchParams(window.location.search);
          if (params.get("login") === "1") {
            window.history.replaceState({}, "", "/");
            const dest = getSmartRedirect("/");
            if (dest !== "/" && dest !== "/?comeback=1") {
              window.location.href = dest;
              return;
            }
          }
        }
        setSessionChecked(true);
      });
    } else {
      setSessionChecked(true);
    }
  }, []);

  if (sessionChecked && session) {
    return (
      <LoggedInDashboard session={session} xp={xp} streak={streak} diagDone={diagDone} />
    );
  }

  return (
    <div className="bg-white">

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b border-gray-100 shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.95)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: "#0D1B3E" }}>
              M²
            </div>
            <span className="font-bold text-base" style={{ color: "#0D1B3E" }}>MateMax</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#jak-to-funguje" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Jak to funguje
            </a>
            <a href="#pro-rodice" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Pro rodiče
            </a>
            <a href="#cena" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Ceník
            </a>
            <Link
              href="/prihlaseni"
              className="text-sm font-bold px-4 py-[6px] rounded-lg border-2 transition-colors hover:bg-blue-50"
              style={{ borderColor: "#2E6DA4", color: "#2E6DA4" }}
            >
              Přihlásit se
            </Link>
            <Link
              href={diagDone ? "/trenink" : "/vitej"}
              className="text-sm font-bold text-white px-4 py-2 rounded-lg transition-colors shadow-sm hover:shadow-md"
              style={{ background: "#2E6DA4" }}
            >
              {diagDone ? "Trénovat →" : "Začít zdarma"}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden hero-animated">
        {/* Parallax math symboly — pohybují se pomaleji než obsah */}
        <div className="hero-parallax-layer absolute inset-0">
          {MATH_SYMBOLS.map(({ symbol, top, left, size, delay, opacity }) => (
            <span
              key={`${symbol}-${top}`}
              className="float absolute select-none text-white font-black"
              style={{ top, left, fontSize: size, animationDelay: delay, opacity }}
            >
              {symbol}
            </span>
          ))}
        </div>

        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center relative z-10">
          <Badge>Nový produkt od Matematika Snadno</Badge>

          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Matematika, která{" "}
            <span style={{ color: "#00B4D8" }}>baví.</span>
            <br />
            Každý den trochu.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
            MateMax je adaptivní matematický trenér pro žáky 8. a 9. třídy.
            10 minut denně, chytrý algoritmus a týdenní report pro rodiče —
            příprava na přijímačky bez stresu a bez doučování.
          </p>

          <div className="mt-8 grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-3 max-w-xs sm:max-w-none mx-auto">
            {["Pro žáky 8. a 9. třídy", "Příklady ve stylu CERMAT", "Funguje na mobilu i PC", "Rodiče mají přehled"].map((tag) => (
              <span key={tag} className="text-sm bg-white/10 text-blue-100 px-4 py-2 rounded-full border border-white/20">
                ✓ {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vitej"
              className="btn-shimmer inline-block text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg"
              style={{ background: "#00B4D8" }}
            >
              Začít zdarma →
            </Link>
            <Link
              href="/cermat-test"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              Vyzkoušet CERMAT test →
            </Link>
          </div>

          {/* Social proof bar */}
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <div className="flex -space-x-2">
              {["🧑‍💻", "👩‍🎓", "🧒", "👦", "👧"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm"
                  style={{ borderColor: "#2E6DA4", background: "#1e3a6e", zIndex: 5 - i }}
                >
                  {emoji}
                </div>
              ))}
            </div>
            <p className="text-sm text-blue-200">
              Již <strong className="text-white">1 200+</strong> žáků procvičuje každý den
            </p>
          </div>

          <p className="mt-4 text-sm text-blue-300">
            Zdarma navždy pro 3 témata · Premium od 99 Kč/měsíc · Bez kreditní karty
          </p>
        </div>
      </section>

      {/* ── DEMO — dvousloupcový layout na desktopu ───────────────── */}
      <section className="py-12 scroll-reveal" style={{ background: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="md:grid md:grid-cols-2 md:gap-14 md:items-center">
            {/* Levý sloupec — text (jen desktop) */}
            <div className="hidden md:flex flex-col justify-center">
              <Badge>Vyzkoušej ihned</Badge>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
                Zkus si příklad hned.<br />
                <span style={{ color: "#2E6DA4" }}>Bez registrace.</span>
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {[
                  "Reálné příklady z CERMAT testů",
                  "Okamžitá zpětná vazba",
                  "Nápověda při každé chybě",
                  "3 témata zdarma: zlomky, rovnice, geometrie",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="font-bold flex-shrink-0" style={{ color: "#00B4D8" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-200">
                  🎓 Bez registrace · Žádná kreditní karta
                </span>
              </div>
            </div>

            {/* Pravý sloupec — DemoCard */}
            <div>
              <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 md:hidden">
                Zkus si příklad hned — bez registrace
              </p>
              <div className="max-w-sm mx-auto">
                <DemoCard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CO TĚ ČEKÁ ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <div className="text-center mb-10 scroll-reveal">
          <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>Co tě čeká</h2>
          <p className="text-gray-500 mt-2 text-sm">Tři nástroje, které tě naučí připravit se bez stresu.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: "🎯", title: "Diagnostický test", desc: "Zjisti kde máš mezery za 10 minut" },
            { icon: "💪", title: "Denní výzvy", desc: "Každý den nová výzva, každý den o krok blíž" },
            { icon: "📊", title: "Sledování pokroku", desc: "Vidíš přesně co umíš a co ne" },
          ].map(({ icon, title, desc }, i) => (
            <div
              key={title}
              className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center gap-3 card-hover scroll-reveal delay-${i + 1}`}
            >
              <span className="text-4xl">{icon}</span>
              <p className="text-base font-extrabold" style={{ color: "#0D1B3E" }}>{title}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ČÍSLA — count-up animace ─────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-200 scroll-reveal">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              <CountUp end={900} suffix="+" />
            </div>
            <div className="text-sm text-gray-500 mt-1">příkladů v databázi</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              <CountUp end={9} />
            </div>
            <div className="text-sm text-gray-500 mt-1">témat CERMAT</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              <CountUp end={10} suffix=" min" />
            </div>
            <div className="text-sm text-gray-500 mt-1">denně stačí</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>1×/týden</div>
            <div className="text-sm text-gray-500 mt-1">report pro rodiče</div>
          </div>
        </div>
      </section>

      {/* ── JAK TO FUNGUJE — step connectors ─────────────────────────── */}
      <section id="jak-to-funguje" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14 scroll-reveal">
          <Badge>Jak to funguje</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            Tři kroky k lepším výsledkům
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            MateMax se přizpůsobí každému žákovi individuálně. Žádné zbytečné opakování toho, co už umí.
          </p>
        </div>

        {/* Desktop: flex s šipkami */}
        <div className="hidden md:flex items-stretch gap-3">
          {HOW_IT_WORKS.map((item, i) => (
            <Fragment key={item.step}>
              <div className={`flex-1 relative border-2 rounded-2xl p-7 ${item.color} scroll-reveal delay-${i + 1}`}>
                <div className={`text-5xl font-black opacity-10 absolute top-4 right-6 ${item.accent}`}>
                  {item.step}
                </div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>{item.title}</h3>
                <p className={`text-sm font-semibold mt-1 mb-3 ${item.accent}`}>{item.subtitle}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="flex items-center justify-center w-7 shrink-0 text-gray-300">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              )}
            </Fragment>
          ))}
        </div>

        {/* Mobile: klasický grid */}
        <div className="md:hidden grid grid-cols-1 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className={`relative border-2 rounded-2xl p-7 ${item.color} scroll-reveal`}>
              <div className={`text-5xl font-black opacity-10 absolute top-4 right-6 ${item.accent}`}>
                {item.step}
              </div>
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>{item.title}</h3>
              <p className={`text-sm font-semibold mt-1 mb-3 ${item.accent}`}>{item.subtitle}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── APP MOCKUP — 3D tilt ─────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="scroll-reveal">
              <Badge>Ukázka aplikace</Badge>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
                Přehledné a jednoduché rozhraní
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Dítě vidí svůj denní cíl, aktuální streak a seznam příkladů k vyřešení.
                Žádné zbytečné tlačítka, žádný chaos — jen čisté procvičování.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {[
                  "Příklady seřazeny od lehčích k těžším",
                  "Okamžitá zpětná vazba po každé odpovědi",
                  "Vysvětlení správného postupu po chybě",
                  "Vizuální pokrok a streak motivace",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5" style={{ color: "#00B4D8" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/vitej"
                className="inline-block mt-8 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                style={{ background: "#0D1B3E" }}
              >
                Vyzkoušet zdarma →
              </Link>
            </div>

            <TiltCard
              className="rounded-2xl p-6 shadow-2xl scroll-reveal delay-1"
              style={{ background: "#0D1B3E" }}
            >
              <div className="rounded-xl p-4 mb-3" style={{ background: "#1e3a6e" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-sm">🧮 MateMax</span>
                  <span className="text-yellow-400 text-sm font-bold">🔥 7 dní</span>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "#0D1B3E" }}>
                  <div className="text-xs text-blue-300 mb-1">Dnešní úloha — Zlomky</div>
                  <div className="text-white text-lg font-bold">Vypočítej: ³⁄₄ + ⅙ = ?</div>
                </div>
              </div>
              {["11/12", "5/6", "7/12", "1/2"].map((ans, i) => (
                <div
                  key={ans}
                  className="mb-2 px-4 py-3 rounded-lg text-sm font-semibold"
                  style={{
                    background: i === 0 ? "#22c55e" : "rgba(255,255,255,0.1)",
                    color: i === 0 ? "#fff" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {String.fromCharCode(65 + i)}) {ans}
                </div>
              ))}
              <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <div className="text-green-400 text-xs font-semibold">✓ Správně! +10 XP</div>
                <div className="text-xs mt-1" style={{ color: "#93c5fd" }}>³⁄₄ = ⁹⁄₁₂, ⅙ = ²⁄₁₂ → ⁹⁄₁₂ + ²⁄₁₂ = ¹¹⁄₁₂</div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* ── PRO RODIČE ───────────────────────────────────────────────── */}
      <section id="pro-rodice" className="py-20" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #fff 100%)" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12 scroll-reveal">
            <Badge>Pro rodiče</Badge>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
              Vidíte přesně, jak se dítě připravuje
            </h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Bez zkoušení u večeře. Bez doučování. Každé pondělí ráno dostanete email s přehledem —
              víte kolik dítě cvičí, kde je silné a kde má mezery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: "📊",
                title: "Týdenní report emailem",
                desc: "Každé pondělí 8:00. Streak, úspěšnost, slabá místa, doporučení na další týden — vše na jedné stránce.",
                color: "#2E6DA4",
              },
              {
                icon: "🎯",
                title: "Přesná slabá místa",
                desc: "Místo \"jde to\" víte konkrétně: zlomky 78 %, slovní úlohy 42 %. Pomáháte tam, kde to opravdu potřebuje.",
                color: "#00B4D8",
              },
              {
                icon: "🔥",
                title: "Streak motivace",
                desc: "Dítě nechce přerušit sérii. Vy vidíte, kolik dní v řadě cvičí — bez napomínání, bez tlaku.",
                color: "#f97316",
              },
            ].map(({ icon, title, desc, color }, i) => (
              <div
                key={title}
                className={`bg-white rounded-2xl border border-blue-100 shadow-sm p-6 flex flex-col gap-3 card-hover scroll-reveal delay-${i + 1}`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `${color}15` }}
                >
                  {icon}
                </div>
                <p className="text-lg font-extrabold" style={{ color: "#0D1B3E" }}>{title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-8 flex flex-col md:flex-row items-center gap-6 scroll-reveal">
            <div className="flex-1 text-center md:text-left">
              <p className="text-xl font-extrabold mb-2" style={{ color: "#0D1B3E" }}>
                Propojte se s účtem svého dítěte
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Stačí 1 minuta — dítě potvrdí propojení v aplikaci a vy začnete dostávat reporty.
                Žádná složitá registrace, žádný účet navíc.
              </p>
            </div>
            <Link
              href="/rodice/prihlaseni"
              className="inline-block text-white font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-lg whitespace-nowrap"
              style={{ background: "#0D1B3E" }}
            >
              Otevřít rodičovský přehled →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12 scroll-reveal">
            <Badge>Co říkají uživatelé</Badge>
            <h2 className="mt-4 text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              Příprava, která skutečně funguje
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              MateMax používají stovky žáků a jejich rodičů každý den.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`bg-gray-50 rounded-2xl p-7 border border-slate-100 card-hover scroll-reveal delay-${i + 1}`}
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <span key={s} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">
                    {t.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#0D1B3E" }}>{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SROVNÁNÍ S ALTERNATIVAMI ──────────────────────────────────── */}
      <section className="py-16" style={{ background: "#f8fafc" }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10 scroll-reveal">
            <Badge>Srovnání</Badge>
            <h2 className="mt-4 text-2xl md:text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              MateMax vs. alternativy
            </h2>
            <p className="mt-3 text-gray-500 text-sm">Rodiče to srovnávají sami — tady to říkáme rovnou.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-reveal">
            {/* Hlavička */}
            <div className="grid grid-cols-4 text-xs font-bold uppercase tracking-wide" style={{ background: "#0D1B3E", color: "white" }}>
              <div className="p-4 col-span-1"></div>
              <div className="p-4 text-center" style={{ color: "#00B4D8" }}>MateMax</div>
              <div className="p-4 text-center text-blue-200">Doučovatel</div>
              <div className="p-4 text-center text-blue-200">Sešit</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-4 text-sm border-t border-gray-100"
                style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
              >
                <div className="p-4 font-medium text-gray-700">{row.label}</div>
                {[row.matemax, row.doucovatel, row.sesit].map((val, j) => (
                  <div key={j} className="p-4 text-center">
                    {typeof val === "boolean" ? (
                      val ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold" style={{ background: "#22c55e" }}>✓</span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold" style={{ background: "#e5e7eb", color: "#9ca3af" }}>✗</span>
                      )
                    ) : (
                      <span className={`font-semibold text-xs ${j === 0 ? "text-blue-700" : "text-gray-500"}`}>{val}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CENÍK ────────────────────────────────────────────────────── */}
      <section id="cena" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12 scroll-reveal">
          <Badge>Ceník</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            Začni zdarma, upgraduj kdykoliv
          </h2>
          <p className="mt-3 text-gray-500">Premium lze kdykoli zrušit. Žádné skryté poplatky.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {PRICING.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border-2 scroll-reveal delay-${i + 1} ${plan.highlight ? "shadow-xl" : "border-gray-200"}`}
              style={plan.highlight ? { borderColor: "#00B4D8", boxShadow: "0 20px 40px rgba(0,180,216,0.12)" } : {}}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-white text-xs font-bold px-4 py-1 rounded-full" style={{ background: "#00B4D8" }}>
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="text-lg font-bold" style={{ color: "#0D1B3E" }}>{plan.name}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>{plan.price}</span>
                {plan.period && <span className="text-gray-400 mb-1">{plan.period}</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className={`text-sm ${f.startsWith("✗") ? "text-gray-400" : "text-gray-700"}`}>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`mt-8 w-full block text-center font-bold py-3 rounded-xl transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          💳 Platba kartou nebo bankovním převodem · Faktura na firmu k dispozici
        </p>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12 scroll-reveal">
            <Badge>FAQ</Badge>
            <h2 className="mt-4 text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              Nejčastější otázky
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="py-20 text-center" style={{ background: "#0D1B3E" }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Přijímačky jsou za rohem.
            <br />
            <span style={{ color: "#00B4D8" }}>Začni dnes.</span>
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            10 minut denně. Adaptivní algoritmus. Rodiče s přehledem.{" "}
            <br className="hidden sm:block" />
            Příprava, která skutečně funguje.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vitej"
              className="btn-shimmer inline-block text-white font-bold text-lg px-10 py-4 rounded-xl"
              style={{ background: "#00B4D8" }}
            >
              Začít zdarma →
            </Link>
            <Link
              href="/cermat-test"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              🎯 CERMAT test →
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-400">
            Bez kreditní karty · Zrušení kdykoliv · Sešit a aplikace se skvěle doplňují
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 text-center py-5 text-xs text-gray-400">
        MateMax © 2026 · by Karel Tůma · Matematika Snadno
      </div>

    </div>
  );
}
