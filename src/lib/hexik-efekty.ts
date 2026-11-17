/**
 * Efekty správné odpovědi (jiskry, konfety, blesky…). Kreslí se do průhledné vrstvy přes celou
 * obrazovku, která nechytá kliknutí. Styly jsou v globals.css (třídy hx-p-*).
 * Kdo má v systému omezené animace, efekty nevidí.
 */

const BARVY = ["#FF5A5F", "#FFB13B", "#FFE14D", "#3DD68C", "#4DA3FF", "#9A6BFF", "#FF7AC6"];

function vrstva(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  let v = document.getElementById("hx-efekty") as HTMLDivElement | null;
  if (!v) {
    v = document.createElement("div");
    v.id = "hx-efekty";
    v.setAttribute("aria-hidden", "true");
    document.body.appendChild(v);
  }
  return v;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * @param typ klíč efektu ze Sbírky
 * @param zdroj prvek, ze kterého efekt vyletí (Hexík); jinak střed obrazovky
 * @param sila 1 = běžná odpověď, víc = oslava série
 */
export function spustEfekt(typ: string, zdroj?: Element | null, sila = 1): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const v = vrstva();
  if (!v) return;
  const W = window.innerWidth, H = window.innerHeight;
  let ox = W / 2, oy = H / 2;
  if (zdroj) {
    const r = zdroj.getBoundingClientRect();
    ox = r.left + r.width / 2;
    oy = r.top + r.height / 2;
  }
  const pridej = (cls: string, styl: string, ms: number, obsah = "") => {
    const s = document.createElement("span");
    s.className = "hx-p " + cls;
    s.setAttribute("style", styl);
    if (obsah) s.innerHTML = obsah;
    v.appendChild(s);
    window.setTimeout(() => s.remove(), ms);
  };
  const n = (k: number) => Math.round(k * sila);
  const kolem = (cls: string, pocet: number, od: number, doo: number, ms: number, obsah?: (i: number) => string, styl?: (i: number) => string) => {
    for (let i = 0; i < n(pocet); i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(od, doo);
      pridej(cls, `--x:${ox}px;--y:${oy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;animation-delay:${rnd(0, 0.12)}s;${styl ? styl(i) : ""}`, ms, obsah ? obsah(i) : "");
    }
  };

  switch (typ) {
    case "jiskry":
      kolem("hx-p-jiskra", 18, 45, 120, 1300);
      break;
    case "hvezdy":
      kolem("hx-p-hvezda", 14, 50, 130, 1500, () => "★");
      break;
    case "srdicka":
      kolem("hx-p-hvezda", 12, 45, 120, 1500, () => "♥", (i) => `color:${["#FF5A9E", "#FF7AC6", "#FF4D6D"][i % 3]}`);
      break;
    case "pixely":
      kolem("hx-p-pixel", 22, 40, 130, 1300, undefined, (i) => `background:${BARVY[i % BARVY.length]}`);
      break;
    case "konfety":
      for (let i = 0; i < n(40); i++) {
        pridej("hx-p-konfeta", `--x:${rnd(0, W)}px;--y:-14px;--dx:${rnd(-80, 80)}px;--rot:${rnd(-600, 600)}deg;--pad:${H + 40}px;--c:${BARVY[i % BARVY.length]};animation-delay:${rnd(0, 0.3)}s;animation-duration:${rnd(1.4, 2.2)}s`, 2800);
      }
      break;
    case "bubliny":
      for (let i = 0; i < n(18); i++) {
        pridej("hx-p-bublina", `--x:${rnd(ox - 140, ox + 140)}px;--y:${oy + 40}px;--s:${rnd(12, 28)}px;--dx:${rnd(-30, 30)}px;animation-delay:${rnd(0, 0.5)}s`, 2600);
      }
      break;
    case "blesky": {
      pridej("hx-p-flash", "", 600);
      const blesk = `<svg viewBox="0 0 40 90"><polygon points="24,0 4,46 18,46 8,90 38,34 22,34 34,0" fill="#FFE14D" stroke="#FFB300" stroke-width="2"/></svg>`;
      for (let i = 0; i < n(3); i++) pridej("hx-p-blesk", `--x:${rnd(ox - 160, ox + 120)}px;--y:${rnd(oy - 200, oy - 60)}px;animation-delay:${i * 0.08}s`, 900, blesk);
      break;
    }
    case "ohen":
      for (let i = 0; i < n(30); i++) {
        pridej("hx-p-plamen", `--x:${rnd(ox - 150, ox + 150)}px;--y:${oy + 50}px;--s:${rnd(12, 26)}px;--dx:${rnd(-24, 24)}px;animation-delay:${rnd(0, 0.45)}s`, 2000);
      }
      kolem("hx-p-jiskra", 10, 40, 90, 1200, undefined, () => "background:#FF8A00");
      break;
    case "duha":
      pridej("hx-p-duha", `--x:${ox}px;--y:${oy}px`, 1300);
      kolem("hx-p-hvezda", 8, 50, 110, 1500, () => "★", (i) => `color:${BARVY[i % BARVY.length]}`);
      break;
    default:
      kolem("hx-p-jiskra", 14, 40, 100, 1200);
  }
}

/** Spustí CSS animaci reakce na prvku Hexíka (znovu i tutéž za sebou). */
const REAKCE = ["hx-r-jasot", "hx-r-radost", "hx-r-poskok", "hx-r-povzbud", "hx-r-tanec", "hx-r-salto", "hx-r-teleport", "hx-r-disco"];
export function reaguj(el: HTMLElement | null, animace: string): void {
  if (!el) return;
  el.classList.remove(...REAKCE);
  void el.offsetWidth;
  el.classList.add("hx-r-" + animace);
  const konec = (e: AnimationEvent) => {
    if (e.target !== el) return;
    el.classList.remove(...REAKCE);
    el.removeEventListener("animationend", konec);
  };
  el.addEventListener("animationend", konec);
}
