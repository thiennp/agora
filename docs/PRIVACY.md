# Privacy

What the platform stores, and what it does not.

- **Location:** only a coarse district code (about 5 km) until both owners confirm; exact places live only in the handoff.
- **Photos:** originals are discarded; only item crops are kept. The photo is read in memory, shrunk and stripped of camera metadata, sent to Meta (Muse Spark vision and SAM 3.1; always, `AGORA_INTAKE` was removed Oct 29), and its bytes overwritten before the request ends. Crops are small JPEGs held in memory (drafts for 30 minutes, listed items until withdrawn or restart) and are not in the saved state. If a person or readable text is in an item's area no picture is kept for it, and each crop is looked at once more on its own before it is kept (if that look cannot run, nothing is kept). Both checks are Muse Spark calls, not a face detector. Measured on 24 generated photos (Oct 28): 0 of 87 kept crops judged to show a person or readable text, against 6 of 80 before the second look; the judge is the same model family, children are not in the test photos, and the set is far below 100 photos.
- **Chat messages (relay):** the database keeps each message's screened text, its translation, its SHA-256 hash and screening
  flags. The raw text an owner typed is never written to the database; it exists only in memory for that owner's own view.
- **Screening and gatekeeper logs:** topics, kinds of findings and outcomes only, never message text.
- **Reports:** an evidence bundle of hashes, timestamps and flags. No message text, names or family ids leave the platform in an
  export; people appear as keyed pseudonyms (see PROTOCOL.md). The reported party can learn only that a report exists.
- **Handover:** the exact meeting place and any delivery address are stored only in encrypted form, written by the owner who gives the
  item (place) or receives it (address), and shown to the other owner only after both confirmed and agreed the way to hand over.
  A recipient's address reaches only the carrier adapter and the label the sender receives; no other screen, event or log carries it.
- **Lessons and memory:** lessons are built only from a reason code and a category (never from free text), so they hold no names,
  places or contact details. Owners can see and delete them, and erasing a family removes its lessons and outcomes. Mirroring to
  AgentWitch happens only with the family's consent, because AgentWitch cannot delete what was sent.
- **Health data:** none is collected, and app configs asking for health, sleep or feeding fields are refused.
- **Erasure:** an owner can erase their family and everything that depends on it; relay messages, cards, rules and trust status go with it.

## Retention and erasure

The saved state (see docs/ARCHITECTURE.md §11b) is one document that holds the screened relay text, its translation and hash, but never the raw text an owner typed and never a plaintext address. Its encrypted fields use `FIELD_ENCRYPTION_SECRET` (the old hard-coded demo key and the reset route are removed); no retention job covers it yet.

Values marked (decided) were set by the project owner; values marked (proposed) are defaults to confirm. Retention jobs are
not built yet; until they exist these are the rules the code must meet, not behaviour it has.

| Data | Kept for | On account erasure |
|---|---|---|
| Audit log (decisions, no message text) | 12 months (decided) | entries are unlinked from the person; anonymous decision counts remain |
| Metrics (aggregates) | 90 days (decided) | nothing personal to remove |
| Errors (no personal data, secret fingerprints only) | 30 days (decided) | nothing personal to remove |
| Relay messages (screened text, translation, hash) | until the deal ends plus 30 days (proposed) | deleted |
| Handover place and delivery address (encrypted) | until the handoff completes plus 30 days (proposed) | deleted |
| Lessons (including stretch lessons) and deal outcomes | until the owner deletes them or erases the account | deleted |
| Pending stretch offers (item and counterpart references, reasons) | until answered or 30 days (proposed) | deleted |
| Reports (hash-chained evidence, pseudonyms) | 12 months after filing (proposed) | reports about the person stay for the retention period; reports they filed are unlinked from them |
| Community posts (tier 2) | while the community exists (proposed) | the member's own posts are removed; a post that was not delivered to someone leaves no copy for them beyond a count |
| Filtered-post review list (tier 2) | 30 days (proposed) | deleted |

Members can see and export their own audit entries ("my activity"), their lessons, and the posts filtered for them.
