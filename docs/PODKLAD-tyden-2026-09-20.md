# Týdenní shrnutí MateMax — 14.–20. 9. 2026 (předat Claude chatu)

> Stav appky MateMax (Next.js 16 / Supabase / Stripe, příprava na CERMAT přijímačky z matematiky) ke dni **20. 9. 2026**.
> Vývoj dělá Claude Code, Karel sólo po večerech. Cíl: **plná připravenost do listopadu**.
> Předchozí podklad: `docs/PODKLAD-pro-tydenni-plan.md` (stav k 8. 9.) — tento dokument ho nahrazuje.

## TL;DR
1. **Obsah:** Úhly L1–L3 a **Geometrie L1–L3 jsou hotové v produkci** (první dvě kompletní témata). Karel ale vyslovil zásadní kvalitativní požadavek: **všechny L3 (a část L2) musí být na úrovni skutečných CERMAT úloh** — úvaha, vnořené obrazce, vlastní obrázky, výběr A–E, ne dosazování do vzorce. Podle toho se předělává zbytek témat.
2. **Právě čeká na Karla:** `/nahled` obsahuje **32 nových úloh L3 ve stylu CERMAT (Zlomky 12, Výrazy 10, Rovnice 10)** — Karel řekl, že zlomky a rovnice mají být *klasické těžké příklady jako v přijímačkách* (ne slovní úlohy) → přepsáno 21. 9.; potřebuji „schvaluji" (nebo připomínky), pak zápis do ostré DB.
3. **Infrastruktura:** Resend doména ověřena (e-maily fungují), **Supabase audit → nalezeny a opraveny tiché chyby zápisů** (sessions / SM-2 karty se neukládaly), zabezpečení API, upgrade Next.js, Playwright testy.
4. **Kvalita dat:** audit odpovědí našel a opravil **32 úloh se špatnou odpovědí**; od teď je povinný `npm run audit:odpovedi` před každým zápisem obsahu.

## Pracovní smyčka (beze změny, funguje)
domluva (téma + počet) → Claude přečte předlohu (CERMAT/sešit) → postaví úlohy → **`/nahled`** (vypadá jako v tréninku) → Karel schválí / žádá úpravy → `node scripts/merge-nahled.mjs` → audity → commit/push → Vercel deploy.

---

## 1) Obsah — stav témat

| Téma | L1 | L2 | L3 | Poznámka |
|---|---|---|---|---|
| Úhly | ✅ | ✅ | ✅ | první kompletní téma (L3 zapsáno) |
| Geometrie | ✅ 8 obr. úloh | ✅ 10 vícekrokových | ✅ 13 v CERMAT stylu | 136 úloh (L1 30 / L2 76 / L3 30), 45 s obrázkem; 10 vlastních SVG (kvádr/krychle/těleso — vokselový renderer) |
| Zlomky | (starší) | (starší) | ⏳ **12 v náhledu** | klasické: složené zlomky, smíšená čísla, mocniny, řetězový zlomek, porovnání + 2 s vlastním SVG (vnořené čtverce, číselná osa) |
| Výrazy | (starší) | (starší) | ⏳ **10 v náhledu** | 2 vlastní SVG + 1 úloha s KaTeX |
| Rovnice | (starší) | (starší) | ⏳ **10 v náhledu** | klasické: rovnice se zlomky a závorkami, vzorce, soustavy (A–E), rovnice bez řešení |
| Slovní úlohy | — | — | ❌ | 150 úloh, L3 jen 38 → **další na řadě** |
| Grafy a logika | — | — | ❌ | pozor: CERMAT „grafy" = koláčové/sloupcové grafy, ne kartézská soustava |
| Konstrukce | — | — | ❌ | 20 úloh, zatím teorie místo rýsování (viz audit 07/2026) |
| Souhrnné | — | — | ❌ | 60 úloh, mezery v L1–L3 |

Celkem v DB: **1 013 úloh**.

### Klíčová Karlova zpětná vazba (závazný standard)
- „Musíš se připodobnovat CERMAT!" — L2/L3 nesmí být formulaicky jednoduché. Vzory: nádrž s hladinami, bazén v obdélníku, vnořené čtverce, číselná osa, váhy, chytré úvahy typu „o kolik zvětšit jmenovatele…".
- Úlohy typu A–E, vlastní SVG obrázky (nekopírují CERMAT), vícekrokové řešení, hodnoty nesou popisky.
- L2 Geometrie: dvě úlohy byly příliš lehké (patřily do L1) → přepracováno na vícekrokové.
- Obrázky (kvádr/krychle): překryv popisků řešen 4 koly; nakonec popisek hloubky na protilehlé (levé) hraně. **Screenshoty z Browser panelu lžou — ověřovat přes Playwright (`scripts/shot.mjs`).**

---

## 2) Infrastruktura a bezpečnost (hotovo tento týden)

**E-maily (Resend + Loops)**
- Doména `matematika-snadno.cz` u Resend **ověřena** (SPF/DKIM), FROM = `noreply@matematika-snadno.cz` (uvítací, rodičovský, online testy). Blokátor „spfType migrated" vyřešen.
- **`/api/welcome-email`** dřív mohl poslat e-mail na libovolnou adresu → nyní vyžaduje `{email, userId}`, ověří e-mail proti účtu, účet ≤ 30 min starý, jednorázový claim (`app_metadata.welcome_sent_at`).
- Loops: chyby HTTP se logují (`loopsCall`); nevalidní vlastnosti → 400.

**Supabase (audit 19. 9.)**
- Kořenová příčina tichých selhání: `supabase-js` **nevyhazuje výjimku** (vrací `{data, error}`) a `sessions` / `sm2_cards` měly FK na `public.users` → zápisy se tiše nezapsaly. **4 migrace (spuštěny Karlem, potvrzeno)** v `supabase/migrations/20260919_*`.
- Všechny klientské zápisy nově hlásí chyby (`reportDbError` → console + `/api/error-report`).
- `/api/referral` a `/api/push-subscribe` přepsány (zápis přes ověřeného volajícího, ne anonymního klienta). **`/api/trial` smazán** (veřejný endpoint). Premium revoke opraven (`update` místo `upsert`, který neprošel RLS).

**Ostatní**
- Next.js 16.2.4 → **16.3.5**, `npm audit fix`.
- **Playwright**: 51 e2e testů prochází (13 záměrně přeskočeno) — veřejné routy, ochrana chráněných stránek, hlavičky, admin 401, referral/push, welcome-email, `/api/trial` 404. Nástroj `scripts/shot.mjs` pro spolehlivé screenshoty.
- Statické SVG: sjednocený bezpatkový font (`scripts/lib/svg.mjs`).

## 3) Chyby nalezené Karlem na reálném zařízení (opraveno 20. 9.)
- **Heatmapa aktivity:** dnešek nebyl zelený — bug s UTC datem. Nová konvence: `src/lib/date.ts` (`localDateStr`, `pragueDateStr`); **nikdy `toISOString().slice(0,10)`**.
- **Mistrovství témat:** ukazovalo 100 % bez splněné L3 → nově procento pokrytí (zvládnuté SM-2 karty / úlohy), čipy `L1 ✓`, `L2 · 5/12`, `L3 🔒`, prahy 70 %.
- **Notifikace na iPhonu:** nebyla nabídka → přidáno vysvětlení (Sdílet → Přidat na plochu; web push funguje jen z PWA).
- **Trénink „samé lehké úlohy":** builder nově upřednostní nejvyšší odemčenou úroveň (bonus u top úrovně).

## 4) Kvalita obsahu
- Audit odpovědí (exaktní aritmetika, BigInt zlomky): **32 úloh mělo špatnou odpověď / poškozený zápis / autorské poznámky v řešení** → opraveno (`databaze.json`, `cermat-200.json`).
- `npm run audit:odpovedi`: aktuálně **172 úloh ověřeno přesně, 0 špatně** — ale to je jen ~17 % DB (slovní úlohy a obrázkové se ověřují hůř).
- `node scripts/audit-katex.mjs`: 0 chyb. Nová L3 dávka: všech 30 odpovědí nezávisle přepočítáno.

---

## 5) Otevřené úkoly

### Karel (K)
- [ ] **Projít `/nahled` a napsat „schvaluji"** (32 úloh Zlomky/Výrazy/Rovnice L3) — případně co změnit.
- [ ] Zapnout notifikace z ikony na ploše iPhonu (jinak `push_subscriptions` zůstane 0) — pak ověřím, že se řádek zapsal.
- [ ] Otestovat referral end-to-end (odkaz `?ref=`).
- [ ] Loops dashboard: zkontrolovat automatizace D+1 / D+3 / D+7 (přes API nejdou ověřit); vytvořit vlastnosti `cermatDone`, `lastCermatAt` (před napojením CERMAT testu).
- [ ] Resend: vyměnit produkční klíč s plným přístupem za klíč **Sending access**.
- [ ] Vercel env: `ANTHROPIC_API_KEY` + Preview proměnné (5 min, jednorázově).

### Claude Code (C)
- [ ] Po schválení: `merge-nahled` → `audit:odpovedi` → `audit-katex` → tsc → commit/push.
- [ ] Další téma na CERMAT úrovni: **slovní úlohy → grafy a logika → konstrukce → souhrnné**; případně CERMAT uplift L2 tam, kde je formulaicky.
- [ ] Rozšířit `audit-odpovedi.mjs` (např. `\sqrt`) a nezávisle ověřit slovní úlohy (dnes ~83 % DB neověřeno strojově).
- [ ] Odložené: hloubka seedování diagnostiky; 131/145 starších úloh geometrie bez obrázku (backlog).
- [ ] Návrhy knihoven (Karel schválil proaktivní návrhy): `mathjs`/`flatten-js` (auto-ověření), JSXGraph (konstrukce), react-three-fiber (3D tělesa) — vždy nejdřív ověřit licenci a `npm audit`.

## 6) Co od Claude chatu potřebuji
Týdenní plán **21.–27. 9.** ve stejném formátu jako minule (večerní bloky ~1 h, víkend 2–4 h, u každé položky (K)/(C), závislosti, 2–3 milníky). Doporučený obsah:
- **Milník 1:** schválit a zapsat Zlomky/Výrazy/Rovnice L3 (Karel: 15 min na `/nahled`).
- **Milník 2:** slovní úlohy L3 v náhledu (Claude Code).
- **Milník 3:** Karlovy provozní kontroly (notifikace na iPhonu, Loops automatizace, Resend klíč) — drobné, ale bez nich nelze ověřit push/referral/e-mail sekvence.
- Web/YouTube/marketing zůstávají podle stávajícího plánu v Notionu (neměnilo se).
