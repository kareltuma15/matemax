/**
 * Upozornění pro Karla na telefon (admin 2.1, SY-07, DN-10) přes stávající web-push a service worker.
 * Odběry zařízení admina jsou v admin_nastaveni.upozorneni (ne v push_subscriptions, kam patří žáci,
 * aby adminovi nechodily připomínky tréninku a žákům nikdy nic z adminu).
 * Nikdy neshodí to, z čeho se volá (webhook, cron, zápis chyby): všechno v try/catch.
 */
import { supabaseAdmin } from "./supabase-admin";

export type TypUpozorneni = "platba" | "odpoved" | "chyby" | "cron" | "novy_zak" | "souhrn";
export const NAZVY_UPOZORNENI: Record<TypUpozorneni, string> = {
  platba: "Platba a selhaná platba", odpoved: "Odpověď, zpětná vazba, nahlášená chyba", chyby: "Nárůst chyb (3+ stejné za den)",
  cron: "Selhaná automatická úloha", novy_zak: "Nový žák", souhrn: "Denní souhrn",
};

export interface NastaveniUpozorneni {
  typy: Record<TypUpozorneni, boolean>;
  ticheOd: number; // hodina 0–23 (Praha), od kdy nic nechodí
  ticheDo: number; // hodina, do kdy nic nechodí
  souhrnHodina: number;
  odbery: { endpoint: string; keys: { p256dh: string; auth: string }; zarizeni: string; od: string }[];
}

export const VYCHOZI_UPOZORNENI: NastaveniUpozorneni = {
  typy: { platba: true, odpoved: true, chyby: true, cron: true, novy_zak: false, souhrn: true },
  ticheOd: 22, ticheDo: 7, souhrnHodina: 20, odbery: [],
};

export async function nactiUpozorneniNastaveni(): Promise<NastaveniUpozorneni> {
  if (!supabaseAdmin) return VYCHOZI_UPOZORNENI;
  const { data } = await supabaseAdmin.from("admin_nastaveni").select("hodnota").eq("klic", "upozorneni").maybeSingle();
  const h = (data?.hodnota ?? {}) as Partial<NastaveniUpozorneni>;
  return { ...VYCHOZI_UPOZORNENI, ...h, typy: { ...VYCHOZI_UPOZORNENI.typy, ...(h.typy ?? {}) }, odbery: Array.isArray(h.odbery) ? h.odbery : [] };
}

export async function ulozUpozorneniNastaveni(n: NastaveniUpozorneni): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("admin_nastaveni").upsert({ klic: "upozorneni", hodnota: n, upraveno_at: new Date().toISOString() });
}

export const hodinaPraha = (d = new Date()) => Number(d.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Prague" })) % 24;
export const jeTicho = (n: Pick<NastaveniUpozorneni, "ticheOd" | "ticheDo">, h: number) => (n.ticheOd === n.ticheDo ? false : n.ticheOd < n.ticheDo ? h >= n.ticheOd && h < n.ticheDo : h >= n.ticheOd || h < n.ticheDo);

/**
 * Pošle upozornění na všechna zařízení admina. Respektuje zapnuté typy a tiché hodiny (kromě testu).
 * Odběry, které zanikly (410/404), smaže. Vrací počet doručených.
 */
export async function upozorniAdmina(typ: TypUpozorneni | "test", titulek: string, text: string, url = "/admin/novy"): Promise<number> {
  try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return 0;
    // Jen z produkce: vývojový server a testy míří na stejnou databázi a nesmí Karlovi posílat upozornění
    if (typ !== "test" && (process.env.NODE_ENV !== "production" || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"))) return 0;
    const n = await nactiUpozorneniNastaveni();
    if (!n.odbery.length) return 0;
    if (typ !== "test" && (!n.typy[typ] || jeTicho(n, hodinaPraha()))) return 0;
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails("mailto:noreply@matematika-snadno.cz", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const payload = JSON.stringify({ title: titulek.slice(0, 80), body: text.slice(0, 180), url });
    const vysledky = await Promise.allSettled(n.odbery.map((o) => webpush.sendNotification({ endpoint: o.endpoint, keys: o.keys }, payload)));
    const mrtve = new Set(n.odbery.filter((_, i) => { const r = vysledky[i]; return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0); }).map((o) => o.endpoint));
    if (mrtve.size) await ulozUpozorneniNastaveni({ ...n, odbery: n.odbery.filter((o) => !mrtve.has(o.endpoint)) });
    return vysledky.filter((r) => r.status === "fulfilled").length;
  } catch (e) {
    console.warn("[admin-push]", e instanceof Error ? e.message : e);
    return 0;
  }
}
