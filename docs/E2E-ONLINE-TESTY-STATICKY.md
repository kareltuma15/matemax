# Online testy nanečisto — statický průchod flow (varianta a)

> Průchod celého flow **z kódu** (bez ostrého běhu). Co je hotové, co se musí ručně
> nastavit mimo kód, a jaká jsou rizika. Vytvořeno 2026-09-08. Checklist pro ostrý
> průchod (varianta b) dodám až po tvém přečtení tohoto.

## Datový model (Supabase)
- `online_test_sessions` — termíny: `title, scheduled_at, is_published, capacity, price_czk, zadani_pdf_url, zaznamovy_arch_pdf_url, rozbor_pdf_url`
- `online_test_enrollments` — přihlášky: `session_id, user_id, payment_status (pending→paid), confirm_sent_at`
- `online_test_submissions` — odevzdání: `enrollment_id, submitted_at, status (nezadano→submitted→reviewed→sent), body_celkem, photo_urls, email_sent_at`
- **Storage buckety:** `test-sessions` (PDF zadání/arch/rozbor), `submissions` (fotky archů)

## Flow krok po kroku

| # | Krok | Kód | Stav | Musí být ručně / riziko |
|---|------|-----|------|--------------------------|
| 1 | **Registrace** | Supabase auth (`proxy.ts`, `/prihlaseni`) | ✅ hotové | Zapnuté potvrzení e-mailu = nastavení v Supabase (nelze ověřit z kódu) |
| 2 | **Přihláška + platba** | `api/stripe/test-checkout` (mode `payment`, `currency czk`, `unit_amount = price_czk·100`, metadata `type=online_test, enrollment_id`); vloží enrollment (`pending`) | ✅ hotové | ⚠️ Endpoint se jmenuje „test-checkout" (myšleno *test nanečisto*, ne Stripe test-mode) — matoucí název. Cena = `price_czk` termínu (admin nastaví). |
| 3 | **Potvrzení platby** | `api/stripe/webhook` → `checkout.session.completed` → `payment_status=paid` + `sendEnrollmentConfirmation` | ✅ hotové | ⚠️ Webhook musí být registrovaný ve Stripe + `STRIPE_WEBHOOK_SECRET`. Live vs test klíče **z kódu nepoznám**. |
| 4 | **PDF zadání/arch/rozbor** | admin `api/admin/testy/[id]/upload` → bucket `test-sessions` | ✅ hotové | Admin musí PDF nahrát před termínem. Bucket `test-sessions` musí existovat + čtení pro žáky (RLS/policy). |
| 5 | **Vyplnění + upload fotek** | žák `api/testy/[id]/submit`: až 10 fotek (jpg/png/webp/**heic**, 12 MB) → bucket `submissions` → submission `submitted` + `sendSubmissionReceived` | ✅ hotové | Kontroluje: termín publikovaný, čas nastal, enrollment `paid`. Bucket `submissions` musí existovat + zápis pro přihlášené. |
| 6 | **Oprava** | admin `api/admin/testy/[id]/submissions` (seznam) + `api/admin/submissions/[sid]` PATCH (body per téma, `body_celkem`, komentáře) → `reviewed` | ✅ hotové, ale **MANUÁLNÍ** | Admin opravuje **ručně** každé odevzdání (žádná automatická oprava). Provozní zátěž + slib „výsledky do 48 h" nikdo nehlídá. |
| 7 | **E-mail s výsledky** | admin `api/admin/submissions/[sid]/send-email` → Resend → `status=sent` | ✅ hotové | Vyžaduje `RESEND_API_KEY`. |
| 8 | **Připomínky 24 h / 1 h** | `api/cron/test-reminders` + GitHub Actions (hodinově) | ✅ hotové | Cron musí běžet (Vercel Hobby = 2 crony/den → řešeno GitHub Actions). |

**Admin** = e-maily v `ADMIN_EMAILS` (default `karel.tuma15@gmail.com`).
**E-maily:** potvrzení přihlášky, 24 h / 1 h připomínka, „arch přijat", výsledky — všechny hotové (`lib/online-test-emails.ts`).

## Co reálně chybí / rizika (proč to zatím není „ready")

1. **Nikdy neproběhl ostrý průchod.** Žádná data v tabulkách, žádný reálný nákup, upload ani mail. → 0 důkazů, že to celé funguje dohromady.
2. **Ruční předpoklady mimo kód (nelze ověřit staticky):**
   - Existence tabulek `online_test_*` (audit: ~polovina tabulek nemá migraci — vytvořené ručně).
   - Existence a policy bucketů `test-sessions` (čtení žáky) a `submissions` (zápis žáky).
   - Env: `STRIPE_SECRET_KEY` (live/test?), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.
   - Webhook zaregistrovaný ve Stripe dashboardu na `/api/stripe/webhook`.
   - Aspoň jeden termín (`online_test_session`) založený, publikovaný, s nahranými PDF a `price_czk`.
3. **Tiché selhání e-mailů:** když chybí `RESEND_API_KEY`, kód e-mail jen přeskočí (warn), neselže → snadno přehlédnutelné, že maily nechodí.
4. **Live/test Stripe režim** z kódu nepoznám — nutno ověřit v dashboardu, ať se na ostro nestrhávají/nestrhnou peníze omylem.
5. **Manuální oprava** = jediné úzké hrdlo pro provoz: každý test opravuje admin ručně; při více žácích to je čas.
6. **Žádné automatizované testy** → jakákoli regrese ve flow je neviditelná.

## Verdikt
Flow je **z velké části postavený a vypadá kompletně** (všech 8 kroků má kód). Ale **není ověřený** a stojí na řadě ručních předpokladů (buckety, tabulky, env, webhook, termín). Bez ostrého průchodu **nelze potvrdit připravenost na listopad.**

Doporučení: udělat **jeden ostrý průchod v Stripe test-mode s reálným e-mailem** (varianta b — checklist ti dodám, až tohle přečteš). Nejrizikovější body k ověření: platba→webhook→`paid`, existence/policy bucketů, reálné doručení mailů.
