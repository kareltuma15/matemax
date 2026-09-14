# Odpověď Michaelovi (Resend support) — zkopíruj jako reply na jeho e-mail

---

Hi Michael, thanks for the detailed steps — I followed them exactly, but the
result is unfortunately the same as before.

**What I did:**
1. Deleted the TXT record on `send.matematika-snadno.cz` in Wix.
2. Confirmed via an independent DNS resolver (Cloudflare 1.1.1.1) that the
   record was actually gone (`NXDOMAIN`) *before* proceeding.
3. Deleted the domain in the Resend dashboard and added
   `matematika-snadno.cz` again (region `eu-west-1`).

**Result:** it came back with the exact same shape as before —
MX + TXT on `send`, plus a separate CNAME on `rsend` — not the clean
two-CNAME-on-`send`, no-MX setup you described. New domain id:
`087ce30f-f290-4ace-8fc9-96ee9570bc5c`.

Since the conflicting TXT record was verifiably gone from live DNS *before*
re-adding the domain, this doesn't look like a DNS-propagation issue on my
end — it looks like something on Resend's side (maybe tied to the account,
or to the underlying SES identity for this domain/region) is still
remembering the old "migrated" configuration rather than generating a fresh
`cname`-only setup.

Could someone take a look at why re-adding still produces `migrated` instead
of `cname`, given the conflicting record is confirmed gone? Happy to provide
timestamps or anything else that helps. Thanks again for your help!
