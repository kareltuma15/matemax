"use server";

/** Akce upozornění na telefon (SY-07): odběr zařízení admina, typy, tiché hodiny, čas souhrnu, zkušební upozornění. */
import { refresh } from "next/cache";
import { zapisAudit } from "@/lib/admin-audit";
import { vyzadujAdmina, jeE2e } from "@/lib/admin2/auth";
import { nactiUpozorneniNastaveni, ulozUpozorneniNastaveni, upozorniAdmina, type NastaveniUpozorneni, type TypUpozorneni } from "@/lib/admin-push";

export async function pridejOdber(sub: { endpoint: string; keys?: { p256dh?: string; auth?: string } }, zarizeni: string): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never; // testy s demo daty nic nezapisují
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("Neplatný odběr");
  const n = await nactiUpozorneniNastaveni();
  const odbery = [...n.odbery.filter((o) => o.endpoint !== sub.endpoint), { endpoint: sub.endpoint.slice(0, 1000), keys: { p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 100) }, zarizeni: zarizeni.slice(0, 60), od: new Date().toISOString() }].slice(-5);
  await ulozUpozorneniNastaveni({ ...n, odbery });
  await zapisAudit({ adminId: admin.id, akce: "nastaveni_zmeneno", detail: { upozorneni: "odber_pridan", zarizeni: zarizeni.slice(0, 60) } });
  refresh();
}

export async function odeberOdber(endpoint: string): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  const n = await nactiUpozorneniNastaveni();
  await ulozUpozorneniNastaveni({ ...n, odbery: n.odbery.filter((o) => o.endpoint !== endpoint) });
  await zapisAudit({ adminId: admin.id, akce: "nastaveni_zmeneno", detail: { upozorneni: "odber_odebran" } });
  refresh();
}

export async function ulozPravidla(p: { typy: Record<TypUpozorneni, boolean>; ticheOd: number; ticheDo: number; souhrnHodina: number }): Promise<void> {
  const admin = await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  const h = (x: number) => Math.max(0, Math.min(23, Math.round(Number(x) || 0)));
  const n = await nactiUpozorneniNastaveni();
  const typy = Object.fromEntries(Object.keys(n.typy).map((k) => [k, !!p.typy[k as TypUpozorneni]])) as NastaveniUpozorneni["typy"];
  await ulozUpozorneniNastaveni({ ...n, typy, ticheOd: h(p.ticheOd), ticheDo: h(p.ticheDo), souhrnHodina: h(p.souhrnHodina) });
  await zapisAudit({ adminId: admin.id, akce: "nastaveni_zmeneno", detail: { upozorneni: "pravidla" } });
  refresh();
}

export async function posliZkusebni(): Promise<number> {
  await vyzadujAdmina();
  if (await jeE2e()) return undefined as never;
  return upozorniAdmina("test", "MateMax Admin", "Zkušební upozornění. Tohle zařízení dostává upozornění z adminu.", "/admin/novy/nastaveni#upozorneni");
}
