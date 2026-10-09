# Návrhy integrací pro MateMax (9. 10. 2026)

Řazeno podle toho, co nejvíc pomůže **dnešní situaci**: málo uživatelů, žádný ověřený nákup, uživatelé jsou děti (14–15 let), takže u všeho platí GDPR a minimum sledování. Ceny a limity před zapnutím ověřit na stránce dodavatele — neuvádím je z paměti.

Co už používáme: Vercel (hosting, cron), Supabase (DB + Auth + Storage), Stripe, Resend (e-maily), Loops (životní cyklus e-mailů), web-push, Anthropic API (AI nápověda), MS Dashboard (kokpit).

## A. Udělat hned (malá práce, velký efekt)

| # | Integrace | Proč | Jak | Práce |
|---|---|---|---|---|
| 1 | **Vercel Web Analytics + Speed Insights** | Dnes nevíme, kolik lidí na MateMax přijde, odkud a kolik se jich zaregistruje. Bez cookies, bez osobních údajů → bez cookie lišty. | zapnout v nastavení projektu + `@vercel/analytics` | 30 min |
| 2 | **Vercel Firewall: rate-limit + BotID** na veřejné zápisy (`waitlist`, `feedback`, `welcome-email`, registrace) | Veřejné INSERT/POST nemají limit; po zveřejnění je začnou zneužívat boti. | pravidla ve Vercel → Firewall; BotID na registraci | 1 h |
| 3 | **Supabase: zálohy (plán Pro) + Advisors** | Před prvními platícími zákazníky musí jít databázi obnovit. Advisors zdarma najdou chybějící indexy/politiky. | Supabase → Billing / Database → Advisors | 30 min |
| 4 | **Stripe: portál, živý režim, webhook** | Bez toho se Premium nedá prodat (viz `PREMIUM-revize-2026-10.md`). | viz revize | 1–2 h |
| 5 | **Uptime monitor** (např. Better Stack nebo UptimeRobot, free) | Zjistit výpadek dřív než zákazník. Přidám `/api/health` (bez dat). | e-mail/SMS upozornění | 30 min |

## B. Brzy (po prvních uživatelích)

| # | Integrace | Proč | Poznámka |
|---|---|---|---|
| 6 | **Přihlášení přes Google/Apple** (Supabase Auth) | Všech 9 účtů je e-mail+heslo; heslo je nejčastější důvod, proč dítě odejde. Rodič si účet rychle založí přes Google. | Apple vyžaduje Apple Developer účet; začít Googlem. |
| 7 | **Cloudflare Turnstile / hCaptcha** při registraci | Brání hromadným falešným účtům; podporuje i Supabase Auth. | Přívětivé k dětem (bez „klikej na semafory“). |
| 8 | **Sentry** (nebo Vercel Observability) | Dnes chyby posílá vlastní `/api/error-report` (1× za stránku). S víc uživateli potřebujeme seskupování a upozornění. | Vypnout session replay (děti). |
| 9 | **Týdenní KPI do MS Dashboardu** | Naplánovaný skript (agregáty bez jmen): registrace, aktivní za 7 dní, tréninky, Premium → automatické hlášení v dashboardu každé pondělí. | Spojí MateMax s ostatními projekty; osobní údaje se tam neposílají (rozhodnutí o osobních datech je otevřené). |
| 10 | **Loops: události** `trial_ending`, `inactive_7d`, `diagnostic_done` | Dnes jen uvítací e-mail. Přivedení neaktivních zpět je nejlevnější způsob růstu. | Nejdřív zkontrolovat automatizace D+1/D+3/D+7 (viz úkol). |
| 11 | **Resend: omezený klíč** | Produkční klíč má plná práva; stačí „Sending access“. | 5 minut v Resend + Vercel env. |
| 12 | **Google Search Console + Bing** pro `matemax.matematika-snadno.cz` a sitemapu | Zdarma, ukáže, na co lidé hledají (přijímačky CERMAT, úlohy). | Ověření DNS záznamem. |

## C. Později / jen když bude důvod

- **PostHog (EU cloud) nebo Plausible** — podrobnější funnel (registrace → diagnostika → 3. trénink). Zapnout jen bez session replay a po zvážení GDPR u nezletilých.
- **Upstash Redis** — jen pokud rate-limit z Vercel Firewallu nestačí.
- **Supabase pg_cron** — přesunout týdenní report rodičům z Vercel cron do databáze; není nutné.
- **Stripe Tax** — nepotřebujete (neplátce DPH).
- **Wix ↔ MateMax jednotné přihlášení** — pěkné, ale velká práce; až bude co sjednocovat.

## Moje doporučení pořadí

1. Stripe revize (A4) → bez ní není co prodávat.
2. Vercel Analytics (A1) → začneme měřit.
3. Firewall + zálohy (A2, A3) → bezpečně otevřít veřejnosti.
4. Google přihlášení (B6) + týdenní KPI (B9).
