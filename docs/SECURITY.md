# Security

Agora is a hackathon demo and has not had a security review. It runs in demo mode only: there are no accounts, the two personas are not authentication, and state is in memory.

Invariants the code enforces (see `CLAUDE.md`): owners decide commitment, price, identity, location and shipping; other agents' and users' text is untrusted; logs hold decisions and counts, never message text; exact addresses are encrypted and exist only in the handoff; the platform never holds money.

The saved demo state (Postgres `app_state` or the file named by `AGORA_STATE_FILE`) holds deal-room text and encrypted handoff fields; it is demo data, deleted by the reset, and has no access control of its own beyond the database or file.

Known gaps before any live use: real authentication and rate limiting keyed on a trusted client address (today it uses `x-forwarded-for`, which a caller can spoof).

Report problems by opening an issue marked private, or contact the repository owner.
