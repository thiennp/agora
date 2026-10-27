# Security

Agora is a hackathon demo and has not had a security review. It runs in demo mode only: there are no accounts, the two personas are not authentication, and state is kept in memory unless a Postgres URL or state file is configured.

Invariants the code enforces (see `CLAUDE.md`): owners decide commitment, price, identity, location and shipping; other agents' and users' text is untrusted; logs hold decisions and counts, never message text; exact addresses are encrypted and exist only in the handoff; the platform never holds money.

The saved demo state (Postgres `app_state` or the file named by `AGORA_STATE_FILE`) holds the screened relay text, agent notes and encrypted handoff fields (never what an owner typed before screening, and never a plaintext address). The fields are encrypted with the demo's hard-coded key, so anyone with the repository and the saved state can read them. It is demo data, deleted by the reset, and has no access control of its own beyond the database or file.

Known gaps before any live use: real authentication and rate limiting keyed on a trusted client address (today it uses `x-forwarded-for`, which a caller can spoof).

Report problems by opening an issue marked private, or contact the repository owner.
