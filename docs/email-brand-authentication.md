# Email brand identity and authentication (Brevo, SPF, DKIM, DMARC, BIMI)

Goal: every email Akula's Kitchen sends arrives as

```
From:     Akula's Kitchen <orders@akulas.kitchen>
Reply-To: support@akulas.kitchen        (optional)
```

delivered by Brevo, passing SPF/DKIM/DMARC for `akulas.kitchen`, and ready for BIMI so
that supporting inboxes can show the Akula's Kitchen logo beside the message.

The code changes are done. The remaining steps happen in the Brevo dashboard, at Namecheap
(DNS for `akulas.kitchen`), on Render (environment variables) and with a designer (logo).
Nothing below is active until those steps are completed.

---

## 0. Why emails still show the personal Gmail address and photo

Checked on 8 Oct 2026 in `backend/.env.local` and the server logs:

- `BREVO_API_KEY` holds a Brevo **SMTP relay key** (`xsmtpsib-…`). Brevo's HTTP API only
  accepts a **REST API key** (`xkeysib-…`), so the app skips Brevo entirely.
- It then falls back to `SMTP_HOST=smtp.gmail.com` with a Gmail account. **Gmail always
  sends as the signed-in Gmail account**, whatever From address the app asks for, so
  recipients see that address and its Google profile photo.
- The logs show 0 emails sent through Brevo and 18 through Gmail SMTP (latest 7 Oct).
  `BREVO_SENDER_EMAIL` is already set to an `@akulas.kitchen` address, but it cannot take
  effect on the Gmail route.

The server now logs a warning at startup whenever mail is about to go out through Gmail.

**Fix (pick one, in `backend/.env.local` for local runs and on Render for production):**

1. **Recommended: use the Brevo API.** In Brevo → SMTP & API → **API Keys**, create a key
   (it starts with `xkeysib-`) and put it in `BREVO_API_KEY`. Nothing else changes; mail
   goes through Brevo as `BREVO_SENDER_EMAIL`.
2. **Or use Brevo's SMTP relay with the existing `xsmtpsib-` key.** In Brevo → SMTP & API
   → **SMTP**, note the SMTP server and login, then set
   `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=<Brevo SMTP login>`,
   `SMTP_PASS=<the xsmtpsib- key>`, and clear `BREVO_API_KEY`.

Either way, Brevo only sends as `orders@akulas.kitchen` once that address is a verified
sender or `akulas.kitchen` is an authenticated domain (section 3); domain authentication
is what makes the mail pass DMARC and avoids "via brevo" labels. Restart the server, then
send the admin SMTP live test (section 11): its response shows the provider (`Brevo` for
option 1, `SMTP` for option 2, with `host: smtp-relay.brevo.com`) and the sender used. The personal photo disappears as soon as mail stops coming from the Gmail
address; until BIMI is in place, Gmail shows a letter avatar instead.

---

## 1. Current email architecture

All mail goes out through Brevo's HTTP API (`https://api.brevo.com/v3/smtp/email`). SMTP is a
fallback (mainly for local development) and Ethereal is a development-only catch-all.

| Path                | Code                                                                                                | Used by                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main sender         | `backend/src/services/emailProvider.ts` → `sendEmail()`                                             | Every transactional email via `notificationService.sendDirectEmail` / `sendDirectEmailProcessor`, and marketing campaigns via `EmailProviderAbstraction` |
| Notification engine | `NotificationEngine` → `NotificationDispatcher` → `EmailAdapter` → `BrevoProvider` / `SMTPProvider` | Daily/weekly/monthly digest reports and the admin "SMTP live test"                                                                                       |

Transactional flows that go through the main sender:

| Flow                                    | Action key                                                             | Where it starts             |
| --------------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| Login OTP                               | `otp_auth`                                                             | `OtpAuthService`            |
| COD verification OTP                    | `cod_otp`                                                              | `OtpAuthService`            |
| New-login alert                         | `new_login_detected`                                                   | `OtpAuthService`            |
| Welcome email                           | `welcome_email`                                                        | `GoogleAuthService`         |
| Order confirmation (customer + admins)  | `order_confirmation_customer`, `order_confirmation_admin`              | `TransactionalEmailService` |
| Payment success                         | (re-uses order confirmation)                                           | `TransactionalEmailService` |
| Payment failed                          | `payment_failed`                                                       | `TransactionalEmailService` |
| Order status / shipping updates         | `order_status_change`                                                  | `TransactionalEmailService` |
| Refund completed                        | `order_refund_completed`                                               | `jobs/outboxProcessor`      |
| Inquiry (customer + admins)             | `inquiry_customer`, `inquiry_admin`                                    | `TransactionalEmailService` |
| Admin password reset                    | `admin_password_reset`                                                 | `adminAuthController`       |
| Team invite                             | `team_invite`                                                          | `users/userService`         |
| System / reconciliation / backup alerts | `system_alert`, `admin_reconciliation_alert`, `backup_weekly_reminder` | `jobs/*`                    |

Safety gate: with `MARKETING_EMAIL_TEST_MODE=true`, every message is redirected to
`TEST_MARKETING_RECIPIENT` and marked `[TEST MODE]` (see `resolveAuthoritativeRecipient`).

## 2. Sender configuration

### Before this change

- Main sender: per-message `from` → `BREVO_SENDER_EMAIL` → `SMTP_FROM_EMAIL` → `noreply@akulas.kitchen`.
- Notification engine: `SMTP_FROM_EMAIL` → **the store's support email from Admin → Settings**
  → `noreply@<site domain>`. The support email is a public contact address and may be a
  personal Gmail; it was being used as the sender whenever `SMTP_FROM_EMAIL` was empty.
- Marketing campaigns could set any sender address, including other domains.
- The admin SMTP test passed `"System Admin" <…>` as a display name, producing a garbled sender.
- The local `backend/.env.local` sets `SMTP_FROM_EMAIL` (and `SMTP_USER`) to a `@gmail.com`
  address. Mail sent as a Gmail address shows that Google account's profile photo in Gmail,
  which is why the client's personal picture appears. The production values live in Render
  and are not in the repository; check them there.

### After this change

One resolver, `backend/src/config/emailSender.ts`, is used by every path (Brevo API, SMTP,
notification engine, development fallback):

| Setting      | Environment variable (first match wins)            | Default                               |
| ------------ | -------------------------------------------------- | ------------------------------------- |
| From address | `BREVO_SENDER_EMAIL`, then `SMTP_FROM_EMAIL`       | `orders@akulas.kitchen`               |
| From name    | `BREVO_SENDER_NAME`, then `SMTP_FROM_NAME`         | Store name (`Akula's Kitchen`)        |
| Reply-To     | `BREVO_REPLY_TO_EMAIL`, then `SMTP_REPLY_TO_EMAIL` | none (replies go to the From address) |

Rules:

- A per-message sender address (for example a campaign "sender email") is used only when it
  is on the same domain as the configured sender. Anything else is ignored and logged, so a
  campaign can send as `hello@akulas.kitchen` but never as a Gmail address.
- The store's support email is no longer used as a sender. It remains the public contact
  address shown inside emails.
- Campaign "Reply-To" values are now passed through to Brevo (they were stored but ignored).
- In production the server logs a warning at startup if the sender is a personal mailbox
  (`gmail.com`, `yahoo.com`, `outlook.com`, …), and `NODE_ENV=production` requires
  `BREVO_SENDER_EMAIL` or `SMTP_FROM_EMAIL` to be set explicitly.
- The startup log prints the sending domain, for example `[EMAIL SENDER] Sending as @akulas.kitchen`.

Production cut-over (on Render, **after** the domain shows as authenticated in Brevo, section 3):

```
BREVO_SENDER_EMAIL=orders@akulas.kitchen
BREVO_SENDER_NAME=Akula's Kitchen
BREVO_REPLY_TO_EMAIL=support@akulas.kitchen
```

Do not switch before the domain is authenticated: Brevo rejects or degrades mail from a
sender it cannot sign for, which would break transactional email.

Development may keep using its own values (`.env.local`); use `MARKETING_EMAIL_TEST_MODE`
with `TEST_MARKETING_RECIPIENT` to keep test mail away from real customers.

## 3. Required Brevo configuration

Menu names below are from Brevo's dashboard and may change slightly over time.

1. **Senders, Domains & Dedicated IPs → Domains → Add a domain**: enter `akulas.kitchen`.
   Brevo then lists the exact DNS records it needs (ownership code, DKIM, and its DMARC
   recommendation). Copy those values; they are unique to this account.
2. Add the records at Namecheap (section 10), then click **Authenticate / Verify** in Brevo.
   Wait until the domain shows as authenticated.
3. **Senders → Add a sender**: name `Akula's Kitchen`, email `orders@akulas.kitchen`.
   Add `support@akulas.kitchen` (or `hello@`) too if campaigns will use them.
4. **SMTP & API → API keys**: keep using a REST API key (it starts with `xkeysib-`). The
   code rejects SMTP relay keys (`xsmtpsib-`) for the HTTP API. Never paste keys into the
   repository; set them only in Render / `.env.local`.
5. Optionally remove the old Gmail sender from Brevo once the new sender is live.

### Mailboxes for the new addresses

`akulas.kitchen` receives mail through **Namecheap Email Forwarding** (MX records point to
`eforward*.registrar-servers.com`). In Namecheap → Domain List → `akulas.kitchen` → Redirect
Email, create forwarders so nothing sent to the new addresses is lost:

- `orders@akulas.kitchen` → the client's inbox
- `support@akulas.kitchen` → the client's inbox (if used as Reply-To)
- a DMARC report address such as `dmarc-reports@akulas.kitchen` (optional, section 6)

## 4. SPF

A domain may have **only one** SPF record. `akulas.kitchen` already has one for Namecheap
forwarding:

```
v=spf1 include:spf.efwd.registrar-servers.com ~all
```

If Brevo's domain page lists an SPF mechanism, merge it into this record instead of adding
a second one:

```
v=spf1 include:spf.efwd.registrar-servers.com <BREVO-SPF-INCLUDE> ~all
```

If Brevo does not ask for SPF, leave the record as it is. DMARC passes when either SPF or
DKIM aligns with the From domain, and Brevo's alignment comes from DKIM (section 5).

## 5. DKIM

DKIM is what lets Brevo sign mail as `akulas.kitchen` (`d=akulas.kitchen`), which is the
alignment DMARC and BIMI rely on. Add exactly the record(s) Brevo shows for the domain:

| Type                               | Host                | Value                |
| ---------------------------------- | ------------------- | -------------------- |
| `<BREVO-DKIM-TYPE>` (TXT or CNAME) | `<BREVO-DKIM-HOST>` | `<BREVO-DKIM-VALUE>` |

## 6. DMARC

`akulas.kitchen` has no DMARC record today. Roll it out in two stages.

**Stage 1: monitoring (temporary, about 1 to 2 weeks, BIMI not yet eligible)**

```
Type:  TXT
Host:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:<DMARC-REPORT-ADDRESS>; adkim=r; aspf=r
```

Read the aggregate reports (or Brevo's DMARC view) and confirm all legitimate mail passes:
Brevo, and anything else that sends as `@akulas.kitchen`. If the client sends as
`@akulas.kitchen` from Gmail's "Send mail as", that path must also be authenticated before
enforcement, or it will be quarantined.

**Stage 2: enforcement (production target, required for BIMI)**

```
Type:  TXT
Host:  _dmarc
Value: v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:<DMARC-REPORT-ADDRESS>; adkim=r; aspf=r
```

`p=reject` is stricter and also satisfies BIMI; move to it later if reports stay clean.
BIMI needs `p=quarantine` or `p=reject` at 100% (no `pct` below 100, and no `sp=none`).

`<DMARC-REPORT-ADDRESS>` is a mailbox you control, for example a forwarder such as
`dmarc-reports@akulas.kitchen`. Create it before publishing the record, or omit the `rua`
tag entirely.

## 7. BIMI

Record (publish only once DMARC is at stage 2 and the logo is hosted):

```
Type:  TXT
Host:  default._bimi
Value: v=BIMI1; l=<BIMI-LOGO-URL>; a=;
```

With a Verified Mark Certificate (section 9) the value becomes
`v=BIMI1; l=<BIMI-LOGO-URL>; a=<VMC-PEM-URL>;`.

Recommended logo location: `frontend/public/email/akulas-kitchen-bimi.svg`, served as
`https://www.akulas.kitchen/email/akulas-kitchen-bimi.svg`.

- Use the `www.` host. The bare domain answers with a `308` redirect to `www`, and the logo
  URL should be the final address with no redirect.
- Files in `frontend/public/` are served by Vercel ahead of the SPA rewrite, with the
  correct `image/svg+xml` type (confirmed for the existing PNG logos).
- The file does not exist yet. See section 8.

## 8. Logo requirements and current status

**Status: not BIMI-ready.** The project has no SVG logo. The official logo
(`frontend/public/MainLogo.png`, also `akulas-kitchen-logo.png`) is a 968×968 PNG whose
centre is a photographic food illustration (dosa, idli, sambar on a banana leaf). BIMI
cannot use raster images, and that illustration cannot be converted to a faithful vector
automatically without changing the brand. A designer needs to prepare the BIMI file.

Requirements for the BIMI logo (SVG Tiny Portable/Secure profile):

- `<svg version="1.2" baseProfile="tiny-ps" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 N N">`
  with a square `viewBox`, and no `x`/`y` attributes on the root element.
- A `<title>` element containing the brand name (`Akula's Kitchen`).
- Vector shapes only: no `<image>` (no embedded PNG/JPEG), no `<script>`, no animation,
  no external references or links, no interactive elements.
- A solid background colour; inboxes crop the logo to a circle or rounded square, so keep
  the mark centred with margin. Small text (the "FRESH • TASTY • HEALTHY" ring) will not
  be legible at inbox size, so a simplified mark may work better; that is a branding
  decision for the client.
- Small file size (32 KB or less is the commonly cited limit).
- Served over HTTPS, publicly, without redirects.

Preparation steps:

1. A designer produces a vector version of the official logo (or an approved simplified mark).
2. Export as SVG and convert to SVG Tiny PS (the BIMI Group publishes conversion guidance
   and tools; design tools often need manual cleanup afterwards).
3. Save as `frontend/public/email/akulas-kitchen-bimi.svg` and deploy the frontend.
4. Check it with a BIMI validator (for example the BIMI Group's BIMI Inspector) before
   publishing the DNS record.

Do not replace the website logo; this is a separate asset used only for BIMI.

## 9. Verified Mark Certificate (VMC) / Common Mark Certificate (CMC)

Two levels of BIMI:

| Level                   | Needs                                                       | Where the logo can appear                                                                                                 |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Basic BIMI              | DMARC enforcement + BIMI TXT + SVG logo                     | Some providers display logos without a certificate for senders with good reputation (Yahoo Mail has historically done so) |
| BIMI with a certificate | All of the above + a VMC or CMC, referenced in the `a=` tag | Gmail (requires a VMC or CMC), Apple Mail (requires a VMC) and others                                                     |

- A **VMC** requires the logo to be a registered trademark. A **CMC** does not need a
  trademark but requires the logo to have been in public use for a period (Gmail's
  documentation describes the current rules).
- Certificates are issued by authorised certificate authorities (DigiCert, Sectigo,
  GlobalSign and others) for an annual fee.
- Nothing has been purchased, and no certificate URL is configured. Provider requirements
  change; check each provider's current documentation before buying.

## 10. DNS records (Namecheap → Domain List → akulas.kitchen → Advanced DNS)

Namecheap's "Host" field is relative to the domain (`@` means `akulas.kitchen`).

| #   | Type                | Host                        | Value                                                                                                | Purpose                                            | When                         |
| --- | ------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| 1   | TXT                 | `@`                         | `<BREVO-VERIFICATION-VALUE>` (if Brevo asks for one)                                                 | Proves domain ownership to Brevo                   | Now                          |
| 2   | `<BREVO-DKIM-TYPE>` | `<BREVO-DKIM-HOST>`         | `<BREVO-DKIM-VALUE>`                                                                                 | DKIM signing as `akulas.kitchen`                   | Now                          |
| 3   | TXT                 | `@` (edit the existing SPF) | `v=spf1 include:spf.efwd.registrar-servers.com <BREVO-SPF-INCLUDE> ~all`                             | Authorise Brevo (only if Brevo lists an SPF value) | Now                          |
| 4   | TXT                 | `_dmarc`                    | `v=DMARC1; p=none; rua=mailto:<DMARC-REPORT-ADDRESS>; adkim=r; aspf=r`                               | DMARC monitoring                                   | Now                          |
| 4b  | TXT                 | `_dmarc` (replace 4)        | `v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:<DMARC-REPORT-ADDRESS>; adkim=r; aspf=r` | DMARC enforcement (needed for BIMI)                | After 1–2 clean weeks        |
| 5   | TXT                 | `default._bimi`             | `v=BIMI1; l=<BIMI-LOGO-URL>; a=;`                                                                    | Brand logo in supporting inboxes                   | After 4b and the SVG is live |

Existing records to keep: the MX records for Namecheap Email Forwarding, and the A/CNAME
records for the website.

## 11. Verification steps

DNS (results can take from minutes up to 48 hours to propagate):

```
nslookup -type=TXT akulas.kitchen 8.8.8.8
nslookup -type=TXT _dmarc.akulas.kitchen 8.8.8.8
nslookup -type=TXT default._bimi.akulas.kitchen 8.8.8.8
nslookup -type=TXT <BREVO-DKIM-HOST>.akulas.kitchen 8.8.8.8     (use -type=CNAME for a CNAME)
```

Then:

1. Brevo shows `akulas.kitchen` as authenticated, and `orders@akulas.kitchen` as a sender.
2. After the Render variables are set and the service restarts, the log shows
   `[EMAIL SENDER] Sending as @akulas.kitchen` and no personal-mailbox warning.
3. Send a test from the admin panel (`GET /api/notifications/test-smtp-live?to=<your inbox>`,
   admin only). The response's `details.sender` shows the From identity used.
4. In Gmail open the message → ⋮ → **Show original**. Check:
   - `From: Akula's Kitchen <orders@akulas.kitchen>` and the expected `Reply-To`
   - `SPF: PASS`, `DKIM: PASS` with `d=akulas.kitchen`, `DMARC: PASS`
5. Once BIMI is published, run the domain through a BIMI checker (for example the BIMI
   Group's BIMI Inspector).

## 12. Testing procedure

1. Automated: `cd backend && npx vitest run tests/unit/emailSender.test.ts` checks the sender
   rules and the exact Brevo request (sender, Reply-To, override protection) without sending
   any mail. The full suite runs with `npx vitest run`.
2. Staging or a local run with `MARKETING_EMAIL_TEST_MODE=true` and
   `TEST_MARKETING_RECIPIENT=<team inbox>`: trigger a login OTP, place a test order, change
   its status, and trigger an inquiry. Every message lands in the team inbox; check From,
   Reply-To, the in-email logo and links.
3. Production, after cut-over: one admin SMTP live test to a team inbox, then watch the
   first real order confirmation in Brevo → Transactional → Logs.

### Inbox expectations (Gmail and others)

- The logo inside the email body (header image) and the logo beside the sender are
  unrelated. Changing the email template does not change the sender avatar.
- Gmail shows a Google account's profile photo for mail sent as that Gmail address. Once
  mail is sent as `orders@akulas.kitchen`, that personal photo no longer applies; without
  BIMI Gmail shows a letter avatar.
- Gmail shows a BIMI logo only with DMARC enforcement **and** a VMC or CMC. Other providers
  have their own rules, caches and reputation thresholds. Display is never guaranteed and
  can take days after everything validates.

## 13. Rollback

- **Sender**: remove `BREVO_SENDER_EMAIL` (and `BREVO_SENDER_NAME` / `BREVO_REPLY_TO_EMAIL`)
  on Render and restart. The sender falls back to `SMTP_FROM_EMAIL` as before.
- **DMARC**: if legitimate mail is being quarantined, change the `_dmarc` record back to
  `p=none` (stage 1) while investigating; do not delete it.
- **BIMI**: delete the `default._bimi` TXT record. Mail delivery is unaffected.
- **DKIM / SPF**: only revert if Brevo is being removed. Restore the SPF record to
  `v=spf1 include:spf.efwd.registrar-servers.com ~all`.
- **Code**: the changes are limited to the files listed in the change summary and can be
  reverted with Git; no data or database changes were made.
