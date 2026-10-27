# Privacy

What the platform stores, and what it does not.

- **Location:** only a coarse district code (about 5 km) until both owners confirm; exact places live only in the handoff.
- **Photos:** originals are discarded; only item crops are kept (intake, not yet built).
- **Chat messages (relay):** the database keeps each message's screened text, its translation, its SHA-256 hash and screening
  flags. The raw text an owner typed is never written to the database; it exists only in memory for that owner's own view.
- **Screening and gatekeeper logs:** topics, kinds of findings and outcomes only, never message text.
- **Reports:** an evidence bundle of hashes, timestamps and flags. No message text, names or family ids leave the platform in an
  export; people appear as keyed pseudonyms (see PROTOCOL.md). The reported party can learn only that a report exists.
- **Health data:** none is collected, and app configs asking for health, sleep or feeding fields are refused.
- **Erasure:** an owner can erase their family and everything that depends on it; relay messages, cards, rules and trust status go with it.
