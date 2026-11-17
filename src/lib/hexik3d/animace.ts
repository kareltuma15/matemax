/**
 * Pohyby 3D Hexíka. Jména reakcí jsou stejná jako u 2D (hexik-efekty.ts → reaguj, ANIMACE_OSLAVY),
 * takže oslavy série z šatníku jsou rovnou 3D tanečky.
 */
export type Reakce3D = "jasot" | "radost" | "poskok" | "povzbud" | "tanec" | "salto" | "teleport" | "disco";

export const DELKA: Record<Reakce3D, number> = {
  jasot: 1.1, radost: 1.5, poskok: 1.2, povzbud: 2.0, tanec: 2.8, salto: 1.5, teleport: 1.3, disco: 2.6,
};

export interface Poza {
  y: number; sy: number; rY: number; rZ: number; rX: number;
  aL: number; aR: number; usta: number; lx: number; ly: number;
  /** Měřítko celého Hexíka (teleport). */
  s: number;
  /** Chce konfety v tomto okamžiku (jednou za reakci). */
  konfety?: number;
}

const cl = (v: number) => Math.max(0, Math.min(1, v));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** Klidové dýchání; `t` v sekundách. */
export function klid(t: number, pohyb: boolean): Poza {
  const b = pohyb ? Math.sin(t * 2.2) : 0;
  return { y: 0.035 * b, sy: 1 + (pohyb ? 0.018 * Math.sin(t * 2.2 + 1.2) : 0), rY: 0, rZ: 0, rX: 0, aL: 0.25 + 0.05 * b, aR: 0.25 + 0.05 * b, usta: 1, lx: 0, ly: 0, s: 1 };
}

/**
 * Póza během reakce. `p` = postup 0–1, `t` = čas (pro rychlé kmitání), `P` = klidová póza, do které se vrací.
 * `vyhozeno` říká, jestli už reakce vypustila konfety.
 */
export function reakce(id: Reakce3D, p: number, t: number, P: Poza, vyhozeno: boolean): Poza {
  const e = Math.min(1, p / 0.12, (1 - p) / 0.12);
  const R: Poza = { ...P };
  let s: number, h: number, b: number, q: number;
  switch (id) {
    case "jasot":
    case "radost": {
      const skoku = id === "radost" ? 3 : 2;
      s = (p * skoku) % 1; h = 4 * s * (1 - s);
      R.y = h * 0.4 * e + P.y * (1 - e);
      R.sy = 1 + 0.12 * h - 0.16 * e * (Math.exp(-Math.pow(s / 0.09, 2)) + Math.exp(-Math.pow((1 - s) / 0.09, 2)));
      R.aL = R.aR = 0.25 + 2.3 * e + 0.18 * Math.sin(t * 22) * e;
      if (!vyhozeno) R.konfety = id === "radost" ? 30 : 18;
      break;
    }
    case "poskok":
      s = cl(p / 0.7); h = 4 * s * (1 - s);
      R.y = h * 0.55; R.rY = Math.sin(p * Math.PI * 2) * 0.3 * e;
      R.sy = p < 0.1 ? 1 - 0.2 * Math.sin((p / 0.1) * Math.PI) : 1 + 0.1 * h;
      R.aL = R.aR = 0.25 + 1.4 * h;
      break;
    case "povzbud": {
      // Po chybě: smutně se schoulí, pak kývne „nevadí, jedeme dál“
      const d = p < 0.55 ? Math.min(1, p / 0.15) : Math.max(0, 1 - (p - 0.55) / 0.2);
      R.sy = 1 - 0.12 * d; R.y = P.y * (1 - d); R.aL = R.aR = 0.25 - 0.2 * d; R.rZ = 0.06 * d;
      R.usta = 1 - 2 * d; R.ly = -0.7 * d;
      if (p > 0.78) { R.y += 0.12 * Math.sin(((p - 0.78) / 0.22) * Math.PI); R.aR = 0.25 + 1.6 * Math.sin(((p - 0.78) / 0.22) * Math.PI); }
      break;
    }
    case "tanec":
      b = p * 6 * Math.PI;
      R.rY = 0.5 * Math.sin(b) * e; R.rZ = 0.1 * Math.sin(b * 2) * e;
      R.y = 0.14 * Math.abs(Math.sin(b)) * e; R.sy = 1 - 0.06 * Math.abs(Math.cos(b)) * e;
      R.aL = 0.3 + 1.8 * Math.max(0, Math.sin(b)) * e; R.aR = 0.3 + 1.8 * Math.max(0, -Math.sin(b)) * e;
      if (p > 0.85 && !vyhozeno) R.konfety = 26;
      break;
    case "salto":
      R.y = Math.sin(p * Math.PI) * 0.75;
      q = ease(cl((p - 0.15) / 0.65)); R.rX = -q * Math.PI * 2;
      R.aL = R.aR = 0.25 + 2.4 * Math.sin(p * Math.PI);
      R.sy = p < 0.12 ? 1 - 0.25 * Math.sin((p / 0.12) * Math.PI) : 1 + 0.1 * Math.sin(p * Math.PI);
      if (p > 0.5 && !vyhozeno) R.konfety = 40;
      break;
    case "teleport":
      // Zmizí v rotaci a objeví se zpátky
      R.s = p < 0.45 ? 1 - ease(p / 0.45) : p < 0.55 ? 0.001 : ease((p - 0.55) / 0.45);
      R.s = Math.max(0.001, R.s);
      R.rY = (p < 0.5 ? ease(p / 0.5) : 1 + ease((p - 0.5) / 0.5)) * Math.PI * 2;
      if (p > 0.55 && !vyhozeno) R.konfety = 24;
      break;
    case "disco":
      b = p * 8 * Math.PI;
      q = ease(cl((p - 0.6) / 0.35));
      R.rY = q * Math.PI * 2 + 0.3 * Math.sin(b) * (1 - q) * e;
      R.y = 0.12 * Math.abs(Math.sin(b)) * e + Math.sin(q * Math.PI) * 0.35;
      R.aL = p < 0.6 ? (Math.sin(b) > 0 ? 2.8 : 0.4) * e : 0.25 + 2.3 * Math.sin(q * Math.PI);
      R.aR = p < 0.6 ? (Math.sin(b) > 0 ? 0.4 : 2.8) * e : 0.25 + 2.3 * Math.sin(q * Math.PI);
      R.rZ = p < 0.6 ? 0.12 * Math.sin(b) * e : 0;
      if (p > 0.9 && !vyhozeno) R.konfety = 36;
      break;
  }
  return R;
}

export function jeReakce3D(x: string): x is Reakce3D {
  return x in DELKA;
}
