/**
 * Data pro stránku adminu, načtená jednou za požadavek (React cache): layout (odznaky) i stránka
 * sdílí stejné žáky, aktivitu a doporučení, takže se nic nepočítá dvakrát a čísla se nerozjedou.
 */
import { cache } from "react";
import { kontext, nactiAktivitu, nactiZaky, type Kontext } from "./data";
import { nactiNastaveni } from "./nastaveni";
import { mapaDnu, posunDen } from "./metriky";
import { spocitejDoporuceni, filtrujPodleStavu } from "./doporuceni";
import { pseudonymy } from "./sdileni";
import { pragueDateStr } from "@/lib/date";

export const nactiKontext = cache(async (): Promise<Kontext> => kontext());

export const nactiZaklad = cache(async (demo: boolean) => {
  const k = await nactiKontext();
  const kk = { ...k, demo: k.demo || demo };
  const od = posunDen(pragueDateStr(), -120);
  const [zaci, aktivita, nastaveni] = await Promise.all([nactiZaky(kk), nactiAktivitu(kk, od), nactiNastaveni()]);
  return { k: kk, zaci, aktivita, dny: mapaDnu(aktivita), nastaveni, ps: pseudonymy(zaci) };
});

export const nactiDoporuceni = cache(async (demo: boolean) => {
  const z = await nactiZaklad(demo);
  const vse = await spocitejDoporuceni(z.zaci, z.dny, z.nastaveni, z.k);
  return filtrujPodleStavu(vse, z.k);
});
