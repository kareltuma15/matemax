"use client";

import { useState, useEffect } from "react";
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

// â”€â”€â”€ DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "đźŽŻ",
    title: "Diagnostika",
    subtitle: "ZjistĂ­me, kde stojĂ­Ĺˇ",
    desc: "MateMax zaÄŤne krĂˇtkĂ˝m adaptivnĂ­m testem (5 minut). Automaticky poznĂˇ, kterĂˇ tĂ©mata ovlĂˇdĂˇĹˇ a kde mĂˇĹˇ mezery â€” a sestavĂ­ trĂ©ninkovĂ˝ plĂˇn pĹ™Ă­mo na mĂ­ru.",
    color: "bg-blue-50 border-blue-200",
    accent: "text-blue-600",
  },
  {
    step: "02",
    icon: "đźŹ‹ď¸Ź",
    title: "DennĂ­ trĂ©nink",
    subtitle: "10 minut kaĹľdĂ˝ den staÄŤĂ­",
    desc: "KaĹľdĂ˝ den dostaneĹˇ sadu pĹ™Ă­kladĹŻ seĹ™azenĂ˝ch od lehÄŤĂ­ch k tÄ›ĹľĹˇĂ­m. Algoritmus sleduje tvĂ© chyby a automaticky tÄ› vrĂˇtĂ­ k tĂ©matĹŻm, kde se zasekĂˇvĂˇĹˇ â€” dokud je neovlĂˇdneĹˇ.",
    color: "bg-orange-50 border-orange-200",
    accent: "text-orange-600",
  },
  {
    step: "03",
    icon: "đź“Š",
    title: "TĂ˝dennĂ­ report",
    subtitle: "RodiÄŤe vÄ›dĂ­, jak to jde",
    desc: "KaĹľdĂ© pondÄ›lĂ­ rĂˇno dostanou rodiÄŤe email s pĹ™ehledem: kolik pĹ™Ă­kladĹŻ dĂ­tÄ› zvlĂˇdlo, jakĂ˝ mĂˇ streak, kde mĂˇ mezery a co procviÄŤovat pĹ™Ă­ĹˇtĂ­ tĂ˝den. Bez zkouĹˇenĂ­ u veÄŤeĹ™e.",
    color: "bg-green-50 border-green-200",
    accent: "text-green-600",
  },
];

const PRICING = [
  {
    name: "Zdarma",
    price: "0 KÄŤ",
    period: "",
    desc: "Pro vyzkouĹˇenĂ­, bez zĂˇvazku",
    highlight: false,
    features: [
      "âś“ DiagnostickĂ˝ test",
      "âś“ 3 tĂ©mata (zlomky, rovnice, geometrie)",
      "âś“ 10 pĹ™Ă­kladĹŻ dennÄ›",
      "âś“ ZĂˇkladnĂ­ statistiky",
      "âś— TĂ˝dennĂ­ report pro rodiÄŤe",
      "âś— PlnĂˇ databĂˇze 700+ pĹ™Ă­kladĹŻ (vĹˇechna tĂ©mata)",
      "âś— CERMAT cviÄŤnĂ© testy",
    ],
    cta: "ZaÄŤĂ­t zdarma",
    ctaHref: "/vitej",
    ctaStyle: "border-2 border-[#2E6DA4] text-[#2E6DA4] hover:bg-blue-50",
  },
  {
    name: "Premium",
    price: "99 KÄŤ",
    period: "/ mÄ›sĂ­c",
    desc: "PlnĂˇ pĹ™Ă­prava na pĹ™ijĂ­maÄŤky",
    highlight: true,
    badge: "NejoblĂ­benÄ›jĹˇĂ­",
    features: [
      "âś“ VĹˇechna tĂ©mata CERMAT (9 oblastĂ­)",
      "âś“ NeomezenĂ˝ poÄŤet pĹ™Ă­kladĹŻ",
      "âś“ AdaptivnĂ­ algoritmus",
      "âś“ TĂ˝dennĂ­ report pro rodiÄŤe",
      "âś“ 2 kompletnĂ­ CERMAT cviÄŤnĂ© testy",
      "âś“ Streak systĂ©m + motivaÄŤnĂ­ odmÄ›ny",
      "âś“ PĹ™Ă­stup na mobilu i poÄŤĂ­taÄŤi",
    ],
    cta: "VyzkouĹˇet Premium",
    ctaHref: "/registrace",
    ctaStyle: "bg-[#2E6DA4] text-white hover:bg-[#1e5a8a]",
  },
];

const FAQS = [
  {
    q: "Pro jakĂ˝ vÄ›k je MateMax urÄŤen?",
    a: "Pro ĹľĂˇky 8. a 9. tĹ™Ă­dy, ideĂˇlnÄ› rok pĹ™ed pĹ™ijĂ­maÄŤkami. Obsah pĹ™esnÄ› odpovĂ­dĂˇ formĂˇtu CERMAT, kterĂ˝ pouĹľĂ­vĂˇ vÄ›tĹˇina gymnĂˇziĂ­ a stĹ™ednĂ­ch Ĺˇkol.",
  },
  {
    q: "Jak dlouho dennÄ› se mĂˇ dĂ­tÄ› uÄŤit?",
    a: "StaÄŤĂ­ 10 minut. Algoritmus sĂˇm vybere 7 pĹ™Ă­kladĹŻ â€” seĹ™azenĂ˝ch podle toho, kde ĹľĂˇk nejvĂ­c potĹ™ebuje procviÄŤit. Pravidelnost je dĹŻleĹľitÄ›jĹˇĂ­ neĹľ dĂ©lka.",
  },
  {
    q: "Co kdyĹľ dĂ­tÄ› udÄ›lĂˇ chybu? Jak algoritmus reaguje?",
    a: "PĹ™Ă­klad se vrĂˇtĂ­ za 1â€“2 dny znovu. PĹ™esnÄ› tak funguje SM-2 (spaced repetition) â€” opakovĂˇnĂ­ ve chvĂ­li, kdy hrozĂ­ zapomenutĂ­. ÄŚĂ­m vĂ­c chyb, tĂ­m dĹ™Ă­v se pĹ™Ă­klad vrĂˇtĂ­.",
  },
  {
    q: "Mohu MateMax pouĹľĂ­t i bez pĹ™ijĂ­maÄŤek?",
    a: "Ano, pro kohokoliv kdo chce procviÄŤovat matematiku. DatabĂˇze 700+ pĹ™Ă­kladĹŻ pokrĂ˝vĂˇ celĂ˝ 2. stupeĹ ZĹ  â€” zlomky, rovnice, geometrie, procenta, mocniny i slovnĂ­ Ăşlohy.",
  },
  {
    q: "Jak se liĹˇĂ­ MateMax od pracovnĂ­ho seĹˇitu Matematika Snadno?",
    a: "SeĹˇit je fyzickĂˇ pomĹŻcka â€” cheat sheety a pĹ™Ă­klady na papĂ­Ĺ™e. MateMax je digitĂˇlnĂ­ trenĂ©r s adaptivnĂ­m algoritmem, kterĂ˝ sleduje pokrok a posĂ­lĂˇ rodiÄŤĹŻm tĂ˝dennĂ­ report. Oba produkty se skvÄ›le doplĹujĂ­.",
  },
  {
    q: "Je pĹ™ihlĂˇĹˇenĂ­ povinnĂ©?",
    a: "Ne, aplikace funguje i bez ĂşÄŤtu â€” veĹˇkerĂ˝ pokrok se uloĹľĂ­ do prohlĂ­ĹľeÄŤe. Registrace se vyplatĂ­, pokud chceĹˇ trĂ©novat na vĂ­ce zaĹ™Ă­zenĂ­ch nebo nechceĹˇ pĹ™ijĂ­t o statistiky pĹ™i smazĂˇnĂ­ dat prohlĂ­ĹľeÄŤe.",
  },
  {
    q: "Funguje MateMax offline?",
    a: "PĹ™Ă­klady a vĂˇĹˇ pokrok se uklĂˇdajĂ­ lokĂˇlnÄ›, takĹľe zĂˇkladnĂ­ trĂ©nink funguje i bez pĹ™ipojenĂ­ k internetu. Synchronizace s cloudem a tĂ˝dennĂ­ report vyĹľadujĂ­ internet.",
  },
  {
    q: "Jak rychle vidĂ­m vĂ˝sledky?",
    a: "Po prvnĂ­m trĂ©ninku algoritmus ihned vĂ­, kterĂˇ tĂ©mata procviÄŤujeĹˇ nejhĹŻĹ™ a pĹ™Ă­ĹˇtÄ› je zaĹ™adĂ­ jako prvnĂ­. ViditelnĂ˝ pokrok v testech bĂ˝vĂˇ znĂˇt po 2â€“3 tĂ˝dnech pravidelnĂ©ho trĂ©ninku.",
  },
];

// â”€â”€â”€ KOMPONENTY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// (LoggedInDashboard moved to src/components/LoggedInDashboard.tsx)


// â”€â”€â”€ LANDING PAGE (HOSTĂ‰) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function LandingPage() {
  const [diagDone, setDiagDone] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

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

          // Smart post-login redirect triggered by OAuth callback (?login=1)
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

      {/* â”€â”€ NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav
        className="sticky top-0 z-50 border-b border-gray-100 shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.95)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: "#0D1B3E" }}>
              MÂ˛
            </div>
            <span className="font-bold text-base" style={{ color: "#0D1B3E" }}>MateMax</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#jak-to-funguje" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Jak to funguje
            </a>
            <a href="#pro-rodice" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              Pro rodiÄŤe
            </a>
            <a href="#cena" className="text-sm text-gray-500 hover:text-gray-800 hidden md:block transition-colors">
              CenĂ­k
            </a>
            <Link
              href="/prihlaseni"
              className="text-sm font-bold px-4 py-[6px] rounded-lg border-2 transition-colors hover:bg-blue-50"
              style={{ borderColor: "#2E6DA4", color: "#2E6DA4" }}
            >
              PĹ™ihlĂˇsit se
            </Link>
            <Link
              href={diagDone ? "/trenink" : "/vitej"}
              className="text-sm font-bold text-white px-4 py-2 rounded-lg transition-colors shadow-sm hover:shadow-md"
              style={{ background: "#2E6DA4" }}
            >
              {diagDone ? "TrĂ©novat â†’" : "ZaÄŤĂ­t zdarma"}
            </Link>
          </div>
        </div>
      </nav>

      {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 50%, #0D1B3E 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: "#2E6DA4" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 -translate-x-1/2 translate-y-1/2 pointer-events-none" style={{ background: "#00B4D8" }} />

        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center relative z-10">
          <Badge>NovĂ˝ produkt od Matematika Snadno</Badge>

          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Matematika, kterĂˇ{" "}
            <span style={{ color: "#00B4D8" }}>bavĂ­.</span>
            <br />
            KaĹľdĂ˝ den trochu.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
            MateMax je adaptivnĂ­ matematickĂ˝ trenĂ©r pro ĹľĂˇky 8. a 9. tĹ™Ă­dy.
            10 minut dennÄ›, chytrĂ˝ algoritmus a tĂ˝dennĂ­ report pro rodiÄŤe â€”
            pĹ™Ă­prava na pĹ™ijĂ­maÄŤky bez stresu a bez douÄŤovĂˇnĂ­.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Pro ĹľĂˇky 8. a 9. tĹ™Ă­dy", "PĹ™Ă­klady ve stylu CERMAT", "Funguje na mobilu i PC", "RodiÄŤe majĂ­ pĹ™ehled"].map((tag) => (
              <span key={tag} className="text-sm bg-white/10 text-blue-100 px-4 py-2 rounded-full border border-white/20">
                âś“ {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vitej"
              className="inline-block text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
              style={{ background: "#00B4D8" }}
            >
              ZaÄŤĂ­t zdarma â†’
            </Link>
            <Link
              href="/cermat-test"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              VyzkouĹˇet CERMAT test â†’
            </Link>
          </div>

          <p className="mt-4 text-sm text-blue-300">
            Zdarma navĹľdy pro 3 tĂ©mata Â· Premium od 99 KÄŤ/mÄ›sĂ­c Â· Bez kreditnĂ­ karty
          </p>
        </div>
      </section>

      <section className="py-12" style={{ background: "#f8fafc" }}>
        <div className="max-w-sm mx-auto px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
            Zkus si priklad hned &#8212; bez registrace
          </p>
          <DemoCard />
        </div>
      </section>

      {/* â”€â”€ CO TÄš ÄŚEKĂ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>Co tÄ› ÄŤekĂˇ</h2>
          <p className="text-gray-500 mt-2 text-sm">TĹ™i nĂˇstroje, kterĂ© tÄ› nauÄŤĂ­ pĹ™ipravit se bez stresu.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: "đźŽŻ", title: "DiagnostickĂ˝ test", desc: "Zjisti kde mĂˇĹˇ mezery za 10 minut" },
            { icon: "đź’Ş", title: "DennĂ­ vĂ˝zvy", desc: "KaĹľdĂ˝ den novĂˇ vĂ˝zva, kaĹľdĂ˝ den o krok blĂ­Ĺľ" },
            { icon: "đź“Š", title: "SledovĂˇnĂ­ pokroku", desc: "VidĂ­Ĺˇ pĹ™esnÄ› co umĂ­Ĺˇ a co ne" },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center gap-3"
            >
              <span className="text-4xl">{icon}</span>
              <p className="text-base font-extrabold" style={{ color: "#0D1B3E" }}>{title}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ ÄŚĂŤSLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "700+", label: "pĹ™Ă­kladĹŻ v databĂˇzi" },
            { value: "9", label: "tĂ©mat CERMAT" },
            { value: "10 min", label: "dennÄ› staÄŤĂ­" },
            { value: "1Ă—/tĂ˝den", label: "report pro rodiÄŤe" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ JAK TO FUNGUJE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="jak-to-funguje" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <Badge>Jak to funguje</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            TĹ™i kroky k lepĹˇĂ­m vĂ˝sledkĹŻm
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            MateMax se pĹ™izpĹŻsobĂ­ kaĹľdĂ©mu ĹľĂˇkovi individuĂˇlnÄ›. Ĺ˝ĂˇdnĂ© zbyteÄŤnĂ© opakovĂˇnĂ­ toho, co uĹľ umĂ­.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className={`relative border-2 rounded-2xl p-7 ${item.color}`}>
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

      {/* â”€â”€ APP MOCKUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge>UkĂˇzka aplikace</Badge>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
                PĹ™ehlednĂ© a jednoduchĂ© rozhranĂ­
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                DĂ­tÄ› vidĂ­ svĹŻj dennĂ­ cĂ­l, aktuĂˇlnĂ­ streak a seznam pĹ™Ă­kladĹŻ k vyĹ™eĹˇenĂ­.
                Ĺ˝ĂˇdnĂ© zbyteÄŤnĂ© tlaÄŤĂ­tka, ĹľĂˇdnĂ˝ chaos â€” jen ÄŤistĂ© procviÄŤovĂˇnĂ­.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {[
                  "PĹ™Ă­klady seĹ™azeny od lehÄŤĂ­ch k tÄ›ĹľĹˇĂ­m",
                  "OkamĹľitĂˇ zpÄ›tnĂˇ vazba po kaĹľdĂ© odpovÄ›di",
                  "VysvÄ›tlenĂ­ sprĂˇvnĂ©ho postupu po chybÄ›",
                  "VizuĂˇlnĂ­ pokrok a streak motivace",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5" style={{ color: "#00B4D8" }}>âś“</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/vitej"
                className="inline-block mt-8 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                style={{ background: "#0D1B3E" }}
              >
                VyzkouĹˇet zdarma â†’
              </Link>
            </div>

            <div className="rounded-2xl p-6 shadow-2xl" style={{ background: "#0D1B3E" }}>
              <div className="rounded-xl p-4 mb-3" style={{ background: "#1e3a6e" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-sm">đź§® MateMax</span>
                  <span className="text-yellow-400 text-sm font-bold">đź”Ą 7 dnĂ­</span>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: "#0D1B3E" }}>
                  <div className="text-xs text-blue-300 mb-1">DneĹˇnĂ­ Ăşloha â€” Zlomky</div>
                  <div className="text-white text-lg font-bold">VypoÄŤĂ­tej: Âłâ„â‚„ + â…™ = ?</div>
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
                <div className="text-green-400 text-xs font-semibold">âś“ SprĂˇvnÄ›! +10 XP</div>
                <div className="text-xs mt-1" style={{ color: "#93c5fd" }}>Âłâ„â‚„ = âąâ„â‚â‚‚, â…™ = Â˛â„â‚â‚‚ â†’ âąâ„â‚â‚‚ + Â˛â„â‚â‚‚ = ÂąÂąâ„â‚â‚‚</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ PRO RODIÄŚE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="pro-rodice" className="py-20" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #fff 100%)" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>Pro rodiÄŤe</Badge>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
              VidĂ­te pĹ™esnÄ›, jak se dĂ­tÄ› pĹ™ipravuje
            </h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Bez zkouĹˇenĂ­ u veÄŤeĹ™e. Bez douÄŤovĂˇnĂ­. KaĹľdĂ© pondÄ›lĂ­ rĂˇno dostanete email s pĹ™ehledem â€”
              vĂ­te kolik dĂ­tÄ› cviÄŤĂ­, kde je silnĂ© a kde mĂˇ mezery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: "đź“Š",
                title: "TĂ˝dennĂ­ report emailem",
                desc: "KaĹľdĂ© pondÄ›lĂ­ 8:00. Streak, ĂşspÄ›Ĺˇnost, slabĂˇ mĂ­sta, doporuÄŤenĂ­ na dalĹˇĂ­ tĂ˝den â€” vĹˇe na jednĂ© strĂˇnce.",
                color: "#2E6DA4",
              },
              {
                icon: "đźŽŻ",
                title: "PĹ™esnĂˇ slabĂˇ mĂ­sta",
                desc: "MĂ­sto \"jde to\" vĂ­te konkrĂ©tnÄ›: zlomky 78 %, slovnĂ­ Ăşlohy 42 %. PomĂˇhĂˇte tam, kde to opravdu potĹ™ebuje.",
                color: "#00B4D8",
              },
              {
                icon: "đź”Ą",
                title: "Streak motivace",
                desc: "DĂ­tÄ› nechce pĹ™eruĹˇit sĂ©rii. Vy vidĂ­te, kolik dnĂ­ v Ĺ™adÄ› cviÄŤĂ­ â€” bez napomĂ­nĂˇnĂ­, bez tlaku.",
                color: "#f97316",
              },
            ].map(({ icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
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

          <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <p className="text-xl font-extrabold mb-2" style={{ color: "#0D1B3E" }}>
                Propojte se s ĂşÄŤtem svĂ©ho dĂ­tÄ›te
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                StaÄŤĂ­ 1 minuta â€” dĂ­tÄ› potvrdĂ­ propojenĂ­ v aplikaci a vy zaÄŤnete dostĂˇvat reporty.
                Ĺ˝ĂˇdnĂˇ sloĹľitĂˇ registrace, ĹľĂˇdnĂ˝ ĂşÄŤet navĂ­c.
              </p>
            </div>
            <Link
              href="/rodice/prihlaseni"
              className="inline-block text-white font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-lg whitespace-nowrap"
              style={{ background: "#0D1B3E" }}
            >
              OtevĹ™Ă­t rodiÄŤovskĂ˝ pĹ™ehled â†’
            </Link>
          </div>
        </div>
      </section>

      {/* â”€â”€ CENĂŤK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="cena" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <Badge>CenĂ­k</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold" style={{ color: "#0D1B3E" }}>
            ZaÄŤni zdarma, upgraduj kdykoliv
          </h2>
          <p className="mt-3 text-gray-500">Premium lze kdykoli zruĹˇit. Ĺ˝ĂˇdnĂ© skrytĂ© poplatky.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border-2 ${plan.highlight ? "shadow-xl" : "border-gray-200"}`}
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
                  <li key={f} className={`text-sm ${f.startsWith("âś—") ? "text-gray-400" : "text-gray-700"}`}>
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
          đź’ł Platba kartou nebo bankovnĂ­m pĹ™evodem Â· Faktura na firmu k dispozici
        </p>
      </section>

      {/* â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge>FAQ</Badge>
            <h2 className="mt-4 text-3xl font-extrabold" style={{ color: "#0D1B3E" }}>
              NejÄŤastÄ›jĹˇĂ­ otĂˇzky
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ FINAL CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-20 text-center" style={{ background: "#0D1B3E" }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-5xl mb-4">đźš€</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            PĹ™ijĂ­maÄŤky jsou za rohem.
            <br />
            <span style={{ color: "#00B4D8" }}>ZaÄŤni dnes.</span>
          </h2>
          <p className="mt-4 text-blue-200 text-lg">
            10 minut dennÄ›. AdaptivnĂ­ algoritmus. RodiÄŤe s pĹ™ehledem.{" "}
            <br className="hidden sm:block" />
            PĹ™Ă­prava, kterĂˇ skuteÄŤnÄ› funguje.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vitej"
              className="inline-block text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
              style={{ background: "#00B4D8" }}
            >
              ZaÄŤĂ­t zdarma â†’
            </Link>
            <Link
              href="/cermat-test"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/20 transition-colors"
            >
              đźŽŻ CERMAT test â†’
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-400">
            Bez kreditnĂ­ karty Â· ZruĹˇenĂ­ kdykoliv Â· SeĹˇit a aplikace se skvÄ›le doplĹujĂ­
          </p>
        </div>
      </section>

      {/* â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white border-t border-gray-100 text-center py-5 text-xs text-gray-400">
        MateMax Â© 2026 Â· by Karel TĹŻma Â· Matematika Snadno
      </div>

    </div>
  );
}
