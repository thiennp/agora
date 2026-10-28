# Security

The design (threat model, controls and what is built) is in `docs/ARCHITECTURE.md` section 12b, the privacy rules and
retention in `docs/PRIVACY.md`, and the decision boundary in ADR 0005. This file states the current status plainly.

## Status
- The app runs in **demo mode** only: two built-in personas that are not authentication, in-memory state by default (saved to Postgres `app_state` or the file named by `AGORA_STATE_FILE` when configured), simulated
  translation and carrier. `AGORA_MODE=live` answers 501 until accounts exist. Do not expose a demo instance as a service
  for real people.
- No external security review or penetration test has been done.

## What is enforced in code today
- Models propose, code decides (ADR 0005); counterparty text is untrusted data.
- Model output is schema-validated; model call records hold counts, never text (ADR 0006).
- Exact places and addresses are encrypted at rest with AES-256-GCM and a fresh IV per value, and are written only after both
  owners approve. Live mode requires `FIELD_ENCRYPTION_SECRET` and `REPORT_EXPORT_SECRET` of at least 16 characters.
- API routes validate input with zod and are rate limited; audit entries hold decisions, never message text.
- A test scans the logistics code for payment identifiers: the platform never holds or moves money.

## Saved demo state
The saved state holds the screened relay text, agent notes and encrypted handoff fields (never what an owner typed before screening,
and never a plaintext address). The fields are encrypted with the demo's hard-coded key, so anyone with the repository and the
saved state can read them. It is demo data, deleted by the reset, and has no access control beyond the database or file.

## Light identity (stored apps)
Apps created through the platform have light identity (BR-45, docs/ARCHITECTURE.md §2b): random session tokens held in an HttpOnly
SameSite=Lax cookie, only their hashes stored; a 100-bit recovery code shown once, hashed, replaced on use, tried at most 8 times per
15 minutes per address; every route of a stored app needs a session of that app and every write a human session. It is not
authentication: nothing proves who a person is, and anyone with the session or the code is that member. Secrets are never logged
and never in URLs. The saved identity document has no access control beyond the database or file.

## Not built
Real accounts (proof of who a person is), per-request authorization against them, row-level security, KMS-backed keys, CSRF/CSP hardening,
upload validation, rate limiting keyed on a trusted client address (today it uses `x-forwarded-for`, which a caller can spoof), and a production queue and database. These must exist before real users.

## Reporting a vulnerability
Open a private security advisory on the repository. Do not include personal data in a report.
