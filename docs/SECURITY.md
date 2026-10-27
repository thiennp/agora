# Security

The design (threat model, controls and what is built) is in `docs/ARCHITECTURE.md` section 12b, the privacy rules and
retention in `docs/PRIVACY.md`, and the decision boundary in ADR 0005. This file states the current status plainly.

## Status
- The app runs in **demo mode** only: two built-in personas that are not authentication, in-memory state, simulated
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

## Not built
Authentication and per-request authorization against real accounts, row-level security, KMS-backed keys, CSRF/CSP hardening,
upload validation, and a production queue and database. These must exist before real users.

## Reporting a vulnerability
Open a private security advisory on the repository. Do not include personal data in a report.
