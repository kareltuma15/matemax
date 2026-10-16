# Supabase: české e-maily z přihlášení (šablony k vložení)

Kam: Supabase → **Authentication → Emails → Templates**. U každé šablony vlož **Subject** a **Message body (HTML)**.
Proměnná `{{ .ConfirmationURL }}` zůstává přesně tak — Supabase ji sám nahradí odkazem.
Odesílatel se nastavuje v **SMTP Settings** (Resend, `noreply@matematika-snadno.cz`, jméno „MateMax“).

## 1) Confirm signup (potvrzení registrace)

**Subject:** `Potvrď svůj účet v MateMaxu`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0D1B3E;">
  <h1 style="font-size:22px;margin:0 0 12px;">Vítej v MateMaxu 👋</h1>
  <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Ještě jeden krok: potvrď svůj e-mail a můžeš začít s diagnostikou zdarma.</p>
  <p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="background:#2E6DA4;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block;">Potvrdit e-mail</a></p>
  <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0 0 6px;">Tlačítko nefunguje? Zkopíruj tento odkaz do prohlížeče:<br><span style="word-break:break-all;">{{ .ConfirmationURL }}</span></p>
  <p style="font-size:13px;color:#64748b;margin:16px 0 0;">Pokud ses neregistroval(a), tento e-mail ignoruj.</p>
  <p style="font-size:13px;color:#64748b;margin:20px 0 0;">MateMax · Matematika Snadno</p>
</div>
```

## 2) Reset password (zapomenuté heslo)

**Subject:** `Nové heslo do MateMaxu`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0D1B3E;">
  <h1 style="font-size:22px;margin:0 0 12px;">Nastavení nového hesla</h1>
  <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Požádal(a) jsi o nové heslo do MateMaxu. Klikni na tlačítko a heslo si nastav.</p>
  <p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="background:#2E6DA4;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block;">Nastavit nové heslo</a></p>
  <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0 0 6px;">Odkaz platí omezenou dobu. Nefunguje? Zkopíruj ho do prohlížeče:<br><span style="word-break:break-all;">{{ .ConfirmationURL }}</span></p>
  <p style="font-size:13px;color:#64748b;margin:16px 0 0;">Nežádal(a) jsi o změnu hesla? Tento e-mail ignoruj, heslo zůstane stejné.</p>
  <p style="font-size:13px;color:#64748b;margin:20px 0 0;">MateMax · Matematika Snadno</p>
</div>
```

## 3) Magic link (přihlášení odkazem — jen kdyby se používalo)

**Subject:** `Přihlášení do MateMaxu`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0D1B3E;">
  <h1 style="font-size:22px;margin:0 0 12px;">Přihlášení do MateMaxu</h1>
  <p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="background:#2E6DA4;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block;">Přihlásit se</a></p>
  <p style="font-size:13px;color:#64748b;margin:16px 0 0;">Pokud ses nepřihlašoval(a), tento e-mail ignoruj.</p>
</div>
```

## 4) Change email address (změna e-mailu)

**Subject:** `Potvrď nový e-mail v MateMaxu`

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0D1B3E;">
  <h1 style="font-size:22px;margin:0 0 12px;">Změna e-mailu</h1>
  <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Potvrď prosím, že chceš v MateMaxu používat tento e-mail.</p>
  <p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="background:#2E6DA4;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block;">Potvrdit změnu</a></p>
  <p style="font-size:13px;color:#64748b;margin:16px 0 0;">Pokud jsi změnu nežádal(a), napiš nám na karel.tuma@matematika-snadno.cz.</p>
</div>
```

Šablony **Invite user** a **Reauthentication** se v MateMaxu nepoužívají, nech je.
