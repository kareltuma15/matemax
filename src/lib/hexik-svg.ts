/**
 * Hexík jako SVG text (stejná kresba jako ve schváleném návrhu docs/gamifikace-2026-11/gamifikace.html).
 * Vrací řetězec, protože ho kreslí React (dangerouslySetInnerHTML) i stránka náhledu; obsah je jen náš.
 *
 * `etapa` 1–5 přidává doplňky podle nejvyššího odhadu bodů: hvězdička, šála, zlatá aura, koruna.
 */

export interface Podoba {
  o: string; i: string;
  oci: "kulate" | "lidi" | "ctverec" | "neon" | "visor";
  tvare?: boolean; usi?: boolean; vousy?: boolean; antena?: boolean; srouby?: boolean; tykadla?: boolean; pruhy?: boolean;
  rohy?: boolean; kridla?: boolean; roh?: boolean; hriva?: boolean; ksiltovka?: boolean;
  plamen?: boolean; trpyt?: boolean; rovna?: boolean;
  /** Sezónní doplňky: vánoční čepice, zimní kulich, šála přes tělo, zlatá medaile. */
  cepice?: boolean; kulich?: boolean; medaile?: boolean;
  obrys?: string; usta?: string; svit?: string;
  /** Má něco na hlavě (koruna se pak nekreslí, místo ní zlatá záře). */
  hlava?: boolean;
}

const PODOBY: Record<string, Podoba> = {
  klasik: { o: "#AFACFB", i: "#C9C7F5", oci: "kulate", tvare: true },
  mata: { o: "#5FD0AA", i: "#B3EEDA", oci: "kulate", tvare: true },
  malina: { o: "#F27BA5", i: "#F9BCD2", oci: "kulate", tvare: true },
  citron: { o: "#F2CE3A", i: "#FBEA9C", oci: "kulate", tvare: true },
  boruvka: { o: "#5C7CFA", i: "#A5B8FF", oci: "kulate", tvare: true },
  lisak: { o: "#F08C3A", i: "#FFE3C7", oci: "kulate", tvare: true, usi: true, hlava: true },
  ledovy: { o: "#7CC9F0", i: "#D9F2FF", oci: "lidi", obrys: "#E8F8FF", svit: "hx-svit-cyan" },
  maskac: { o: "#5E7148", i: "#8FA170", oci: "lidi", ksiltovka: true, hlava: true },
  ninja: { o: "#1E2230", i: "#2F3547", oci: "visor", usta: "#E5484D", rovna: true },
  // sezónní
  skritek: { o: "#3FA45B", i: "#9BDCAA", oci: "kulate", tvare: true, cepice: true, hlava: true },
  santa: { o: "#D93A3A", i: "#F4A3A3", oci: "lidi", cepice: true, hlava: true },
  snehulak: { o: "#E8F1FA", i: "#FFFFFF", oci: "kulate", tvare: true, kulich: true, hlava: true },
  yeti: { o: "#B9D6F2", i: "#E6F2FF", oci: "lidi", kulich: true, hlava: true },
  sampion: { o: "#F5A623", i: "#FFE0A3", oci: "kulate", tvare: true, medaile: true },
  finisher: { o: "#2E6DA4", i: "#8CC0EA", oci: "lidi", medaile: true },
  grafit: { o: "#4A5468", i: "#8C97AE", oci: "kulate" },
  ohnivy: { o: "#FF7A3D", i: "#FFBE8A", oci: "lidi", plamen: true, hlava: true },
  kocicka: { o: "#F6B26B", i: "#FBD3A6", oci: "kulate", tvare: true, usi: true, vousy: true, hlava: true },
  robutek: { o: "#9FB3C8", i: "#D6E1EC", oci: "ctverec", antena: true, srouby: true, hlava: true },
  dracek: { o: "#5FC489", i: "#A8E3BC", oci: "kulate", tvare: true, rohy: true, kridla: true, hlava: true },
  jednorozec: { o: "#F7C6E0", i: "#FFE6F2", oci: "kulate", tvare: true, roh: true, hriva: true, hlava: true },
  neon: { o: "#1A1446", i: "#241C5E", oci: "neon", obrys: "#3DF5FF", svit: "hx-svit-cyan", usta: "#3DF5FF" },
  street: { o: "#5B55D6", i: "#7C77EA", oci: "lidi", ksiltovka: true, hlava: true },
  kyber: { o: "#2B3A55", i: "#3E5273", oci: "visor", usta: "#9FB3C8", rovna: true },
  zlaty: { o: "url(#hxZlato)", i: "#FFE08A", oci: "kulate", trpyt: true, svit: "hx-svit-zlato" },
  // za XP úrovně (nejdou koupit ani vylosovat)
  vcelka: { o: "#F7C531", i: "#FFE68A", oci: "kulate", tvare: true, tykadla: true, pruhy: true, hlava: true },
  kralovsky: { o: "#8E5BD6", i: "#CDB6F4", oci: "kulate", tvare: true, trpyt: true, svit: "hx-svit-zlato" },
  duhovy: { o: "url(#hxDuha)", i: "#FFF4FB", oci: "kulate", tvare: true, trpyt: true, svit: "hx-svit-zlato" },
  toxic: { o: "#1C2B12", i: "#2E4A1A", oci: "lidi", obrys: "#A6FF3D", usta: "#A6FF3D", svit: "hx-svit-cyan" },
  chrom: { o: "url(#hxChrom)", i: "#E6ECF3", oci: "visor", rovna: true, usta: "#6F8299" },
  diamant: { o: "url(#hxDiamant)", i: "#E9FBFF", oci: "kulate", obrys: "#BFF4FF", trpyt: true, svit: "hx-svit-cyan" },
};

/** Nastavení podoby (barvy, oči, doplňky) — stejné čte i 3D Hexík (lib/hexik3d). */
export function podobaHexika(klic: string): Podoba {
  return PODOBY[klic] ?? PODOBY.klasik;
}

function hvezda(cx: number, cy: number, r1: number, r2: number): string {
  let s = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + (i * Math.PI) / 5;
    s += `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return s.trim();
}

export function hexikSvg(klic: string, etapa = 1): string {
  const P = PODOBY[klic] ?? PODOBY.klasik;
  const N = "#0D1B3E";
  let zad = "", pred = "";
  const defs = `<defs><linearGradient id="hxZlato" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE07A"/><stop offset=".55" stop-color="#F5B623"/><stop offset="1" stop-color="#D97E00"/></linearGradient>`
    + `<linearGradient id="hxDuha" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7AB8"/><stop offset=".25" stop-color="#FFC94D"/><stop offset=".5" stop-color="#6EE7A8"/><stop offset=".75" stop-color="#6FB6FF"/><stop offset="1" stop-color="#B07CFF"/></linearGradient>`
    + `<linearGradient id="hxChrom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F7FB"/><stop offset=".45" stop-color="#9AA8BA"/><stop offset=".55" stop-color="#5E6C80"/><stop offset="1" stop-color="#C9D3DF"/></linearGradient>`
    + `<linearGradient id="hxDiamant" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6FDFF"/><stop offset=".35" stop-color="#7FE3FF"/><stop offset=".6" stop-color="#B9A8FF"/><stop offset="1" stop-color="#5CC8F0"/></linearGradient></defs>`;
  if (etapa >= 4) zad += `<circle class="hx-aura" cx="130" cy="130" r="126" fill="none" stroke="#F5A623" stroke-width="5" stroke-dasharray="7 13" opacity=".75"/>`;
  if (P.kridla) zad += `<path d="M40 120 L0 86 L14 128 L-2 150 L40 156 Z" fill="${P.o}"/><path d="M220 120 L260 86 L246 128 L262 150 L220 156 Z" fill="${P.o}"/>`;
  if (P.hriva) zad += `<circle cx="74" cy="44" r="16" fill="#FF9AC8"/><circle cx="52" cy="64" r="14" fill="#B79CFF"/><circle cx="38" cy="90" r="12" fill="#8ED1FF"/><circle cx="96" cy="30" r="13" fill="#FFD36E"/>`;
  if (P.usi) zad += `<polygon points="50,68 60,4 110,36" fill="${P.o}"/><polygon points="64,56 68,22 98,40" fill="#F7A3C0"/><polygon points="210,68 200,4 150,36" fill="${P.o}"/><polygon points="196,56 192,22 162,40" fill="#F7A3C0"/>`;
  if (P.rohy) zad += `<polygon points="94,42 88,2 116,30" fill="#F5C542" stroke="#D99A00" stroke-width="3"/><polygon points="166,42 172,2 144,30" fill="#F5C542" stroke="#D99A00" stroke-width="3"/>`;
  if (P.tykadla) zad += `<path d="M108 34 Q98 6 82 -4 M152 34 Q162 6 178 -4" stroke="${N}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="80" cy="-6" r="10" fill="${N}"/><circle cx="180" cy="-6" r="10" fill="${N}"/>`;
  if (P.antena) zad += `<line x1="130" y1="24" x2="130" y2="-4" stroke="#6F8299" stroke-width="6"/><circle cx="130" cy="-10" r="9" fill="#FF5A5F"/>`;
  if (P.plamen) zad += `<path d="M104 40 Q96 10 118 -6 Q116 14 130 18 Q128 -8 150 -18 Q146 8 160 16 Q170 4 168 -6 Q186 18 160 42 Z" fill="#FFB000"/><path d="M116 40 Q112 22 126 12 Q126 26 138 28 Q138 14 150 6 Q150 26 158 40 Z" fill="#FFE066"/>`;
  const telo = `<polygon points="130,22 226,76 226,184 130,238 34,184 34,76" fill="${P.o}" ${P.obrys ? `stroke="${P.obrys}" stroke-width="5" stroke-linejoin="round"` : ""}/><polygon points="130,40 210,86 210,174 130,220 50,174 50,86" fill="${P.i}"/>`;
  let oci = "";
  if (P.oci === "kulate") oci = `<ellipse cx="102" cy="122" rx="15" ry="19" fill="${N}"/><ellipse cx="158" cy="122" rx="15" ry="19" fill="${N}"/><circle cx="107" cy="115" r="5" fill="#fff"/><circle cx="163" cy="115" r="5" fill="#fff"/>`;
  if (P.oci === "lidi") oci = `<ellipse cx="102" cy="124" rx="15" ry="17" fill="${N}"/><ellipse cx="158" cy="124" rx="15" ry="17" fill="${N}"/><rect x="84" y="104" width="36" height="16" fill="${P.i}"/><rect x="140" y="104" width="36" height="16" fill="${P.i}"/><line x1="84" y1="120" x2="120" y2="117" stroke="${N}" stroke-width="5" stroke-linecap="round"/><line x1="140" y1="117" x2="176" y2="120" stroke="${N}" stroke-width="5" stroke-linecap="round"/><circle cx="106" cy="128" r="4" fill="#fff"/><circle cx="162" cy="128" r="4" fill="#fff"/>`;
  if (P.oci === "ctverec") oci = `<rect x="86" y="106" width="32" height="32" rx="7" fill="${N}"/><rect x="142" y="106" width="32" height="32" rx="7" fill="${N}"/><rect x="92" y="111" width="9" height="9" rx="2" fill="#7FE3FF"/><rect x="148" y="111" width="9" height="9" rx="2" fill="#7FE3FF"/>`;
  if (P.oci === "neon") oci = `<ellipse cx="102" cy="122" rx="14" ry="18" fill="#3DF5FF"/><ellipse cx="158" cy="122" rx="14" ry="18" fill="#3DF5FF"/><ellipse cx="102" cy="122" rx="6" ry="9" fill="#1A1446"/><ellipse cx="158" cy="122" rx="6" ry="9" fill="#1A1446"/>`;
  if (P.oci === "visor") oci = `<rect x="64" y="104" width="132" height="38" rx="19" fill="#FF3D8B"/><rect x="80" y="111" width="46" height="7" rx="3.5" fill="rgba(255,255,255,.65)"/><rect x="134" y="111" width="14" height="7" rx="3.5" fill="rgba(255,255,255,.45)"/>`;
  const usta = P.rovna
    ? `<path d="M110 172 L150 172" stroke="${P.usta}" stroke-width="7" stroke-linecap="round"/>`
    : `<path d="M108 162 Q130 180 152 162" stroke="${P.usta ?? N}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  let doplnky = "";
  if (P.tvare) doplnky += `<ellipse cx="80" cy="156" rx="12" ry="7" fill="#F7A3C0" opacity=".75"/><ellipse cx="180" cy="156" rx="12" ry="7" fill="#F7A3C0" opacity=".75"/>`;
  if (P.pruhy) doplnky += `<polygon points="67.4,184 192.6,184 175.2,194 84.8,194" fill="${N}" opacity=".85"/><polygon points="98.7,202 161.3,202 147.4,210 112.6,210" fill="${N}" opacity=".85"/>`;
  if (P.vousy) doplnky += `<path d="M66 160 L36 154 M66 168 L36 174 M194 160 L224 154 M194 168 L224 174" stroke="${N}" stroke-width="3" stroke-linecap="round"/>`;
  if (P.srouby) doplnky += `<circle cx="42" cy="130" r="7" fill="#6F8299"/><circle cx="218" cy="130" r="7" fill="#6F8299"/>`;
  if (P.roh) pred += `<polygon points="117,30 130,-22 143,30" fill="url(#hxZlato)" stroke="#D99A00" stroke-width="2.5"/><path d="M121 14 L139 8 M124 0 L136 -4" stroke="#D99A00" stroke-width="2.5"/>`;
  if (P.cepice) pred += `<path d="M70 46 Q96 -10 150 -10 Q200 -8 222 30 Q196 12 180 24 L190 46 Z" fill="#E5383B"/><rect x="58" y="34" width="144" height="22" rx="11" fill="#fff"/><circle cx="222" cy="32" r="13" fill="#fff"/>`;
  if (P.kulich) pred += `<path d="M66 52 Q130 -24 194 52 Z" fill="#2E6DA4"/><rect x="60" y="42" width="140" height="18" rx="9" fill="#E5383B"/><path d="M84 42 L92 26 M112 42 L116 18 M148 42 L144 18 M176 42 L168 26" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="130" cy="6" r="14" fill="#fff"/>`;
  if (P.medaile) pred += `<path d="M108 176 L118 214 L130 204 L142 214 L152 176" fill="#2E6DA4"/><circle cx="130" cy="222" r="18" fill="url(#hxZlato)" stroke="#D99A00" stroke-width="3"/><polygon points="${hvezda(130, 222, 9, 4)}" fill="#fff"/>`;
  if (P.ksiltovka) pred += `<path d="M54 84 Q130 -4 206 84 Q130 62 54 84 Z" fill="${N}"/><path d="M200 78 Q240 70 254 90 Q226 98 198 92 Z" fill="#232F55"/><circle cx="130" cy="50" r="10" fill="#F5A623"/>`;
  if (P.trpyt) pred += `<polygon class="hx-trpyt" points="${hvezda(56, 58, 10, 4)}" fill="#fff"/><polygon class="hx-trpyt" style="animation-delay:.6s" points="${hvezda(210, 96, 8, 3)}" fill="#fff"/><polygon class="hx-trpyt" style="animation-delay:1.1s" points="${hvezda(196, 206, 9, 3.5)}" fill="#fff"/>`;
  if (etapa >= 2) pred += `<polygon points="${hvezda(178, 198, 14, 6)}" fill="#F5A623" stroke="#C77700" stroke-width="2"/>`;
  if (etapa >= 3) pred += `<path d="M58 186 Q130 216 202 186 L196 206 Q130 232 64 206 Z" fill="#E0565B"/><rect x="164" y="198" width="18" height="40" rx="6" fill="#C7373D"/>`;
  let svit = P.svit ?? "";
  if (etapa >= 5) {
    if (!P.hlava) pred += `<path d="M86 44 L96 6 L114 30 L130 -6 L146 30 L164 6 L174 44 Z" fill="#F5C542" stroke="#D99A00" stroke-width="3" stroke-linejoin="round"/><circle cx="130" cy="30" r="5" fill="#E0565B"/>`;
    else svit = "hx-svit-zlato";
  }
  return `<svg viewBox="-6 -30 272 276" class="${svit}" aria-hidden="true" focusable="false">${defs}${zad}${telo}${oci}${usta}${doplnky}${pred}</svg>`;
}
