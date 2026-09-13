# Zpráva pro Resend support (zkopíruj do jejich chatu/e-mailu)

> Anglicky, ať to jde support týmu vyřídit rychle. Domain ID a datum jsou
> doplněné, stačí zkopírovat a odeslat.

---

Hi, I need help getting our domain fully verified — I understand exactly
what's wrong (your bot support already diagnosed it), but it needs a human
to fix on your end.

**Domain:** matematika-snadno.cz (id: 85973d0b-981f-4e55-be84-afb4ba4e6eee)

**Situation:**
- Our DNS is hosted on Wix, which does not support adding a custom MX record
  on a subdomain — only a pure-CNAME SPF setup (`spfType: cname`) works for
  us, with no MX/TXT on `send` at all.
- I deleted the domain and re-added it (following your own dashboard's
  suggestion for Wix-hosted domains), expecting the pure CNAME configuration.
  Instead it came back as **`spfType: migrated`**, which adds the CNAME
  (`rsend` → `send.forge.rmta.net`) *on top of* the legacy MX + TXT
  requirement on `send`, instead of replacing it.
- I added the CNAME record on Wix and it verified successfully. DKIM is also
  verified. But because this domain is `migrated`, the pending legacy MX +
  TXT (which Wix cannot support) keep the domain stuck at
  **`partially_verified`** — confirmed via the API that this status is not
  enough to send (`403 domain is not verified`).

**Ask:** Could someone please reset domain `85973d0b-981f-4e55-be84-afb4ba4e6eee`
(matematika-snadno.cz) from `spfType: migrated` to the pure `spfType: cname`
configuration? I understand this isn't something I can flip from the
dashboard myself. Happy to provide any additional info needed. Thanks!
