# MateMax — kompletní snapshot projektu (srpen 2026)

> Podklad pro strategická rozhodnutí (Wix→MateMax platby, online testy nanečisto, admin dashboard).
> Zpracováno z repozitáře `github.com/kareltuma15/matemax`.
>
> **Rozsah zdrojů:** tento snapshot vychází z **kódu v repozitáři** (soubory, migrace, konfigurace).
> **Živá data nemám jak ověřit** z tohoto prostředí — konektory na Supabase, Vercel a Stripe zde
> nejsou přihlášené. Vše, co vyžaduje běžící službu (počty řádků, počty uživatelů, stav deployů,
> live/test režim Stripe, obsah Storage bucketů), je označeno **⚠️ NELZE OVĚŘIT Z KÓDU** a je
> potřeba doplnit z dashboardů. Nic si nedomýšlím.

---

## 1. Technický přehled

### 1.1 Verze stacku (`package.json`)
| Balík | Verze |
|---|---|
| Next.js | **16.2.4** |
| React | **19.2.4** |
| @supabase/supabase-js | **^2.105.1** |
| @supabase/ssr | používá se v `src/proxy.ts` (SSR auth) |
| Stripe (server SDK) | **^22.1.1** |
| @stripe/stripe-js (client) | **není** — checkout je server-side redirect, klientský SDK netřeba |
| Tailwind CSS | **^4** |
| Resend | ^6.12.2 |
| KaTeX | ^0.17.0 |

> Pozn.: jde o **výrazně novější Next.js (16)** — `middleware` je nahrazeno `proxy` (viz `src/proxy.ts`), `params` je Promise. To je záměr projektu (viz `AGENTS.md`).

### 1.2 Deploy
- **Vercel projekt name / URL:** ⚠️ NELZE OVĚŘIT Z KÓDU. Produkční URL používaná v kódu jako fallback: `https://matemax.matematika-snadno.cz` (`src/app/api/stripe/create-checkout/route.ts:51`).
- **Environment variables (jen názvy, z `process.env.*` v kódu):**
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
  - Email: `RESEND_API_KEY`, `FEEDBACK_EMAIL_FROM`, `LOOPS_API_KEY`, `LOOPS_WELCOME_EMAIL_ID`
  - Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
  - AI: `ANTHROPIC_API_KEY`
  - Admin/cron: `ADMIN_EMAILS`, `ADMIN_ALERT_EMAIL`, `CRON_SECRET`
  - Ostatní: `NEXT_PUBLIC_APP_URL`, `NODE_ENV`
  - **Lokální `.env.local` obsahuje:** vše výše kromě `ANTHROPIC_API_KEY`, `ADMIN_EMAILS`, `ADMIN_ALERT_EMAIL`, `FEEDBACK_EMAIL_FROM`, `NODE_ENV`. Tj. **`ANTHROPIC_API_KEY` lokálně chybí** (AI hint je proto lokálně vypnutý; na Vercelu je potřeba ověřit).
- **Build status posledních 5 deployů:** ⚠️ NELZE OVĚŘIT Z KÓDU (Vercel dashboard). Lokální `next build` prochází čistě (ověřeno v této session).
- **Známé produkční problémy:** service-worker cache trap už opraven (network-first, `sw.js` bez cache). Repo bylo dočasně přepnuto na private/public — Vercel git integrace to nemusí snést, případně vyžaduje ruční redeploy.

### 1.3 Struktura projektu (`src/app`)
**Route group `(app)`** (za přihlášením / hlavní appka):
`trenink`, `trenink/[tema]`, `diagnostika`, `rychly-mod`, `vyzva`, `cermat-test`, `studijni-plan`, `profil`, `vitej`, `testy-nanecisto`, `test/[id]`, `report-preview`, `rodice`, `rodice/dashboard`, `rodice/nastaveni`, `rodice/prihlaseni`, `rodice/propojeni`, `admin`, `admin/testy`, `admin/testy/[id]/submissions`, `admin/submissions/[sid]`.
**Route group `(auth)`:** `prihlaseni`, `registrace`, `zapomenute-heslo`, `nova-heslo`.
**Veřejné:** `/` (landing, `page.tsx`), `cenik`, `jak-to-funguje`, `matemax`, `premium-aktivovan`, **`diagram-test` (DOČASNÁ — určená ke smazání)**.

**Plně funkční:** landing, registrace/přihlášení, diagnostika, trénink (+ rychlý mód, výzva), CERMAT test, profil, cesta (studijní plán), rodičovský portál, ceník.
**Rozdělané / v pohybu:** online testy nanečisto (viz §7), obrázkové úlohy (nový engine, 7 úloh — §6), admin (základ, ne plný dashboard).
**Placeholder / dočasné:** `diagram-test` (testovací stránka vykreslovače diagramů).

---

## 2. Autentizace a uživatelé

### 2.1 Registrace a přihlášení
- **Supabase Auth, email + heslo** (`src/app/(auth)/registrace/form.tsx`, `.../prihlaseni`) **+ Google OAuth** (`signInWithOAuth({ provider: "google" })`, callback `/auth/callback`).
- **Verifikace emailu:** registrace bez session vede na stav „Zkontroluj email" (potvrzovací link Supabase) — tj. e-mailová verifikace přes Supabase probíhá, konfigurace šablony je na straně Supabase (⚠️ nastavení neověřeno z kódu).
- **Password reset:** ano — `(auth)/zapomenute-heslo` (žádost) + `(auth)/nova-heslo` (nastavení nového).

### 2.2 Session management
- **`@supabase/ssr` + cookies**, řízeno v `src/proxy.ts` (Next 16 „proxy" = dřívější middleware). Ověřuje `supabase.auth.getUser()`, přesměrovává nepřihlášené z chráněných cest a přihlášené z auth stránek na `/trenink`. Rodičovská sekce má vlastní bránu na `/rodice/prihlaseni`.
- **Matcher:** vše kromě statických assetů a `/auth/callback` (`src/proxy.ts:92`).
- **Délka session:** default Supabase (⚠️ konkrétní TTL nastaven v Supabase, z kódu neurčím).

### 2.3 User profile
- **Profilová stránka:** ano — `src/app/(app)/profil/page.tsx` (statistiky, mistrovství témat, historie, odznaky, nastavení, avatar, jméno).
- **Data o uživateli:** křestní jméno + příjmení + full_name v `auth.users.user_metadata` (z registrace). **Věk/třída/škola se neukládají.**
- **Kde v Supabase:** základ v `auth.users`; herní/aplikační data v tabulkách `user_xp`, `user_gamification`, `sessions`, `diagnostic_results`, `user_badges`, `user_onboarding`, `user_premium`.

### 2.4 Počet uživatelů
- ⚠️ **NELZE OVĚŘIT Z KÓDU** (dotaz na `auth.users` vyžaduje běžící Supabase). Dohledatelné v Supabase, případně přes `/api/admin/stats` (počítá `totalUsers` z `auth.admin.listUsers`) a „active today" ze `sessions`.

---

## 3. Databáze (Supabase)

### 3.1 Tabulky
**Vytvořené verzovanou migrací** (`supabase/migrations/`):
`referrals`, `weekly_leaderboard`, `user_gamification`, `online_test_sessions`, `online_test_enrollments`, `online_test_submissions` + ALTER migrace (`stripe_columns`, `xp_streak_column`, `online_testy_notifikace`).

**Dotazované z kódu, ale BEZ migrace v repu** (vytvořené ručně v Supabase SQL editoru):
`user_premium`, `user_xp`, `user_progress`, `sessions`, `diagnostic_results`, `user_badges`, `user_onboarding`, `user_feedback`, `parent_child_link`, `parent_settings`, `parent_subscriptions`, `parent_messages`, `push_subscriptions`, `analytics_events`, `premium_waitlist`, `submissions`.
> ⚠️ **Schéma není plně verzované** — přibližně polovina tabulek existuje jen v Supabase, ne v migracích. To je tech-debt (viz §8.4). Počty řádků a „aktivně vs. legacy" ⚠️ NELZE OVĚŘIT Z KÓDU.
> Pozn.: kód dotazuje `submissions` i `online_test_submissions` — ověřit, zda `submissions` není legacy.

### 3.2 RLS
- Migrace, které tabulky zakládají, **RLS zapínají a definují policies** (např. `user_gamification`: SELECT/INSERT/UPDATE `auth.uid() = user_id`; `online_test_*` mají vlastní policies v `20260611_online_testy.sql`).
- **Admin operace** běží přes `SUPABASE_SERVICE_ROLE_KEY` v serverových API routách (`supabaseAdmin`), tj. **obcházejí RLS** — admin role na úrovni DB není, autorizace admina je v kódu přes `ADMIN_EMAILS`.
- U ručně vytvořených tabulek ⚠️ NELZE OVĚŘIT Z KÓDU, zda mají RLS správně (nutno zkontrolovat v Supabase).

### 3.3 Storage (buckets)
- Kód pracuje se Storage pro PDF a fotky online testů (`zadani_pdf_url`, `zaznamovy_arch_pdf_url`, `rozbor_pdf_url`, `photo_urls`) — upload v `admin/testy/[id]/upload`, submit fotek v `testy/[id]/submit`.
- **Názvy bucketů a public/private nastavení:** ⚠️ NELZE OVĚŘIT Z KÓDU (Supabase Storage dashboard). Zadání a fotky by měly být **private se signed URL**.

### 3.4 Edge functions / triggery
- **Custom edge functions:** žádné v repu (`supabase/functions/` neexistuje). Serverová logika běží jako Next.js API routes na Vercelu.
- **DB triggery:** v migracích nejsou žádné `CREATE TRIGGER`. Případné triggery vytvořené ručně ⚠️ NELZE OVĚŘIT Z KÓDU.

---

## 4. Platby a předplatné (Stripe)

### 4.1 Integrace
- **Stripe je napojený** (server SDK `stripe@^22.1.1`). **Live vs. test:** ⚠️ NELZE OVĚŘIT Z KÓDU — závisí na hodnotě `STRIPE_SECRET_KEY` (`sk_live_` vs `sk_test_`), kterou z kódu nevidím.
- **Klíče v env:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.
- **Products/prices:** kód používá **jediné `STRIPE_PRICE_ID`** (měsíční předplatné) z env. Konkrétní product/price IDs ⚠️ NELZE OVĚŘIT Z KÓDU (Stripe dashboard). Online testy se platí zvlášť (jednorázově) — viz §7.

### 4.2 Checkout flow
- **Stripe Checkout (hosted), mode `subscription`** — `src/app/api/stripe/create-checkout/route.ts`: najde/vytvoří `stripe.customers`, uloží `stripe_customer_id` do `user_premium`, vytvoří `checkout.sessions.create({ mode: "subscription", line_items: [{ price: STRIPE_PRICE_ID }] })`, přesměruje na Stripe.
- **Portál** pro správu předplatného: `src/app/api/stripe/portal/route.ts` (Stripe billing portal).
- `src/app/api/stripe/test-checkout/route.ts` — testovací varianta (ověřit, zda nepatří jen do dev).

### 4.3 Webhooks
- **Endpoint:** `src/app/api/stripe/webhook/route.ts`, ověřuje podpis přes `STRIPE_WEBHOOK_SECRET`.
- **Události:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- **Zápis:** `user_premium` (`is_premium`, `stripe_subscription_id`) přes `setPremium()`; u online testů aktualizuje `online_test_enrollments` (payment_status).

### 4.4 Subscription management
- **Tabulka:** `user_premium` (`user_id`, `stripe_customer_id`, `stripe_subscription_id`, `is_premium`, `trial_expires_at`).
- **Free vs. premium:** rozlišuje — hook `usePremium()` (`src/lib/premium.ts`) čte `user_premium` (+ trial expiraci); zámky témat řeší `src/lib/subscription.ts` (`isTopicLocked`, `PREMIUM_TOPICS` odvozené z `FREE_TOPICS = {zlomky, vyrazy, rovnice}`, host jen `zlomky`).
- **Kontrola „má premium":** `usePremium()` v komponentách (`LoggedInDashboard`, `profil`, `trenink`, `cenik`).
- **Expirace:** trial řeší `usePremium()` (po vypršení `trial_expires_at` nastaví `is_premium=false`); u placeného předplatného expiraci řeší webhook `customer.subscription.deleted`.

### 4.5 Fakturace
- **Fakturoid/iDoklad:** **není napojený** (v kódu žádná zmínka). Faktury zajišťuje Stripe (Stripe invoices) — případná česká fakturace by byla samostatná integrace. ⚠️ Reálný stav fakturace ověřit ve Stripe.

---

## 5. Hlavní features (stav)

| Feature | Stav | Poznámka / co chybí |
|---|---|---|
| 5.1 Diagnostický test | **HOTOVÉ** (`(app)/diagnostika`) | ⚠️ obsahové vady: zlomky psané „5/12" (ne KaTeX), příklady příliš lehké, slovní úlohy na úhly bez obrázku — řeší se v probíhajícím obsahovém přepracování. |
| 5.2 SM-2 spaced repetition | **HOTOVÉ** (`src/lib/sm2.ts`, session builder v `trenink/page.tsx`, karty `sm2_cards`) | Odemykání obtížností L1→L3 dle `last_quality`. |
| 5.3 CERMAT simulátor (časovač) | **HOTOVÉ** (`(app)/cermat-test`) | |
| 5.4 Gamifikace (streak/XP/badges) | **HOTOVÉ** (`src/lib/gamification.ts`, `user_xp`, `user_badges`, `user_gamification`) | |
| 5.5 Statistiky/dashboard žáka | **HOTOVÉ** (`profil`, „Domů"/`LoggedInDashboard`, cesta) | Nedávno předělané do 2 sloupců na desktopu. |
| 5.6 Videolekce | **NEIMPLEMENTOVÁNO** | V kódu žádné video/YouTube/Vimeo. Chybí kompletně. |
| 5.7 Onboarding | **HOTOVÉ** (`vitej` → diagnostika → trénink, `user_onboarding`, řízený domov „Dnešní mise") | |
| 5.8 Notifikace | **HOTOVÉ částečně** | Email: Resend (transakční) + Loops (marketing). Push: web push (VAPID, `push_subscriptions`, `/api/send-push`, cron `daily-push`). In-app: vzkaz rodiče na dashboardu. |
| 5.9 Admin panel | **ROZDĚLANÉ** | `/admin` (stats), `/admin/users`, `/admin/testy` (správa online testů), oprava odevzdání. Není plnohodnotný dashboard (viz §10.4). |

---

## 6. Obsah v databázi

### 6.1 Příklady
- **Celkem 943 příkladů**, formát **JSON** v `src/data/` (`databaze.json`, `cermat-200.json`, `doplnky-uhly-souhrnne.json`, `konstrukce-interaktivni.json`), sloučeno přes `src/data/examples.ts`.
- **Dle tématu:** slovní úlohy 210 · výrazy 163 · geometrie 134 · zlomky 119 · rovnice 108 · grafy a logika 85 · souhrnné 63 · úhly 33 · konstrukce 28.
- **Dle obtížnosti:** L1 267 · L2 450 · L3 226.
- **Speciální typy:** 307 s KaTeX (`latex`), 9 porovnávací (klikání < = >), 8 interaktivní konstrukce, **7 s parametrickým diagramem** (nový SVG engine — §1.3).
- **Obrázkové úlohy: zásadní mezera** — donedávna **0/943**, teď 7. CERMAT je z velké části obrázkový, sešit z poloviny → probíhá přepracování (parametrické SVG diagramy: `src/components/DiagramView.tsx`, typ `Diagram` v `src/types`).
- **Verifikované Karlem:** ⚠️ částečně — během auditů opraveno několik matematicky chybných příkladů (ROV_024/047/048/050, KOM_020, SES_VYR_13) a sjednocena sazba/podtémata; kompletní ruční verifikace všech 943 proběhlá není.

### 6.2 Videolekce
- **Žádné.** Systém videa nemá (viz 5.6). Hostování/metadata neexistují.

---

## 7. Online testy nanečisto (dle briefu `CLAUDE_CODE_online-testy.md`)

Brief existuje mimo repo (`OneDrive/.../Claude info/CLAUDE_CODE_online-testy.md`).

| Bod | Stav | Kde |
|---|---|---|
| 7.1 Migrace (3 tabulky) | **HOTOVÉ** (kód) | `20260611_online_testy.sql` (sessions/enrollments/submissions) + `20260716_online_testy_notifikace.sql` (idempotence). ⚠️ Spuštění v Supabase ověřit. |
| 7.2 Admin: termíny + upload PDF | **HOTOVÉ** | `(app)/admin/testy`, `(app)/admin/testy/[id]/…`, `api/admin/testy/[id]/upload` |
| 7.3 Student: seznam + Stripe platba | **HOTOVÉ** | `(app)/testy-nanecisto`, webhook napojen |
| 7.4 Testovací místnost (countdown + PDF unlock + upload fotek) | **HOTOVÉ** | `(app)/test/[id]`, `api/testy/[id]/submit` |
| 7.5 Admin: oprava testu | **HOTOVÉ** | `(app)/admin/submissions/[sid]`, body po tématech v `online_test_submissions` |
| 7.6 Generování draft emailu | **HOTOVÉ** | `api/admin/submissions/[sid]/send-email` |
| 7.7 Notifikace | **HOTOVÉ** | 24 h předem přes denní cron; „1 h předem" přes GitHub Actions (hodinový trigger na `api/cron/test-reminders`) — vyžaduje nastavené GH secrets (`CRON_SECRET`, `APP_BASE_URL`). |
| 7.8 Zobrazení výsledků | **HOTOVÉ** | žák vidí rozbor/body po odevzdání a opravě |

> ⚠️ Celý flow **nebyl otestován end-to-end naživo** (vyžaduje vypsaný termín, platbu a nahraná PDF). Doporučuji jeden „ostrý" zkušební průchod.

---

## 8. Known issues a tech debt

- **8.1 Bugy:** žádný známý blokující v kódu; dark mode byl vypnutý (teď opraven, opt-in). Ke smazání dočasná stránka `/diagram-test`.
- **8.2 Performance:** landing i appka jsou klientské komponenty s velkým JSON obsahem (943 příkladů) v bundlu — zvážit lazy/split u dat. Neměřeno reálně.
- **8.3 Bezpečnost:** `npm audit` hlásí **7 zranitelností (4 high, 3 moderate)** — dědičné v `sharp`/`libvips` (CVE-2026-33327/33328/35590/35591). `sharp` **není náš přímý import** (tranzitivní závislost, pravděpodobně přes generování OG/share obrázků `route.tsx` přes `next/og`). Řešení: `npm audit fix` / aktualizace řetězce závislostí; reálný dopad je nízký (běží serverově), ale high severity je vhodné uklidit.
- **8.4 Refactor:** (a) **~polovina DB tabulek nemá migraci** — schéma není verzované; (b) **velké množství inline hex barev** v komponentách (kvůli tomu byl dark mode křehký — teď částečně převedeno na CSS proměnné); (c) `trenink/page.tsx` a `profil/page.tsx` jsou velmi dlouhé (1000+ řádků).
- **8.5 Testy:** **žádné automatizované testy** (unit/integration/e2e). Kvalita se hlídá ad-hoc skripty v `scripts/` (audit-katex, check-*). 
- **8.6 Zastaralé závislosti:** viz 8.3 (sharp). Jinak stack je aktuální (Next 16, React 19).

---

## 9. Integrace s externími službami

- **9.1 Email:** **Resend** (transakční — welcome email, zpětná vazba k testům, `RESEND_API_KEY`) + **Loops.so** (marketing/automatizace, `LOOPS_API_KEY`, `LOOPS_WELCOME_EMAIL_ID`, `/api/loops-event`). Dva oddělené systémy.
- **9.2 Analytics:** vlastní `analytics_events` tabulka + `src/lib/analytics.ts` (`trackEvent`). **Žádné GA/Plausible** v kódu. Vercel Analytics ⚠️ neověřeno.
- **9.3 Wix (matematika-snadno.cz):** **žádné propojení** MateMax ↔ Wix v kódu — sdílená DB ani API neexistuje. Propojení plateb Wix→MateMax je zatím **nulový stav** (viz §10.4).
- **9.4 Ostatní:** Sentry **není**. Web push (VAPID) vlastní. Anthropic API pro AI hint (`/api/hint`, `ANTHROPIC_API_KEY`).

---

## 10. Priority (z pohledu kódu, sezóna 2026/2027)

### 10.1 Nejkritičtější před listopadem 2026
1. **Obrázkové úlohy** — bez nich appka neodpovídá reálnému CERMATu (celý obrázkový). Engine hotový, chybí objem obsahu + další typy diagramů (grafy, prostorová tělesa).
2. **Oprava diagnostiky** — sazba zlomků (KaTeX), rozpětí obtížnosti, vyhození slovních úloh na úhly bez obrázku.
3. **End-to-end ověření online testů** + spuštění migrací a nastavení Storage/GH secrets.
4. **`ANTHROPIC_API_KEY` na Vercel** (AI hint) a **aktualizace `sharp`** (bezpečnost).

### 10.2 Nice-to-have
- Videolekce (zcela chybí). Fakturoid/iDoklad. Sentry. Automatizované testy. Verzování celého DB schématu.

### 10.3 Největší tech debt bránící vývoji
- **Neverzované DB schéma** (polovina tabulek jen v Supabase) — riziko rozjetí prostředí, ztížený onboarding.
- **Inline hex barvy** napříč UI — komplikují theming/dark mode (částečně řešeno).

### 10.4 Odhad času (hrubý, ⚠️ orientační)
- **Dokončení online testů nanečisto:** ~**4–8 h** (většina hotová; jde o ostrý e2e průchod, migrace, Storage nastavení, doladění).
- **Propojení plateb Wix↔MateMax:** ~**16–30 h** — **nulový stav**, závisí na tom, JAK má propojení fungovat (SSO? předání koupeného předplatného? webhook z Wixu?). Nutná analýza Wix strany (Wix nemá standardní webhook do cizí DB). Bez upřesnění zadání je odhad nejistý.
- **Admin dashboard:** ~**10–20 h** — základ je (`/admin/stats`, `/admin/users`, `/admin/testy`); plnohodnotný dashboard (přehledy, správa uživatelů/předplatných, obsahu, exporty) je větší.

---

## Odkazy na klíčový kód
- Auth/routing: `src/proxy.ts`
- Stripe: `src/app/api/stripe/{create-checkout,webhook,portal,test-checkout}/route.ts`
- Premium: `src/lib/premium.ts`, `src/lib/subscription.ts`, tabulka `user_premium`
- Obsah: `src/data/*.json`, `src/data/examples.ts`, `src/types/index.ts` (typ `DBExample`, `Diagram`)
- Diagramy (nové): `src/components/DiagramView.tsx`
- Migrace: `supabase/migrations/`
- Online testy: `src/app/(app)/{testy-nanecisto,test/[id],admin/testy}`, `src/app/api/testy`, `src/app/api/admin/testy`
- Skripty pro kontrolu obsahu: `scripts/audit-katex.mjs`, `scripts/check-*.mjs`

---

*Sestaveno z repozitáře. Sekce označené ⚠️ vyžadují doplnění z Supabase / Vercel / Stripe dashboardů — nebyly domýšleny.*
