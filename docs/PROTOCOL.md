# Protocols

## Report export: `agora.report.v1`

A report is exported as JSON in this format, designed for Meta. **It is a format only.** This project does not claim
that Meta receives, reads or acts on it; whether Meta wants such reports is unconfirmed. Every export carries the
disclaimer below, and the docs and demo say "designed for", never "reported to".

```json
{
  "format": "agora.report.v1",
  "designedFor": "Meta",
  "disclaimer": "Format only. Delivery to or action by Meta is not confirmed.",
  "reportId": "uuid",
  "createdAt": "2026-10-27T12:00:00.000Z",
  "app": "kids-gear",
  "reason": "scam | contact_harvesting | off_platform_payment | abusive | no_show | other",
  "reportedAgent": "agt_<24 hex>",
  "reporter": "rep_<24 hex>",
  "signals": [{ "id": "off_platform_payment", "weight": 35 }],
  "evidence": {
    "headHash": "sha256 hex",
    "count": 3,
    "entries": [
      { "index": 0, "messageHash": "sha256 hex of the message text", "at": "ISO time", "role": "reporter | reported",
        "flags": ["payment", "blocked"], "prevHash": "sha256 hex", "hash": "sha256 hex" }
    ]
  }
}
```

Privacy and integrity rules:
- **No message text, names, family ids or contact details** appear in an export. Message content is represented by its SHA-256 hash.
- `reportedAgent` is a keyed pseudonym (HMAC with a deployment secret), stable across reports so repeat offenders can be linked.
- `reporter` is a keyed pseudonym that is different for every report, so reporters cannot be linked across reports and are never
  revealed to the reported party (TRU-RPT-04).
- Evidence is **hash-chained**: `hash = SHA-256(prevHash | index | messageHash | at | role | sorted flags joined by ",")`, with `prevHash` of
  entry 0 being 64 zeros and `headHash` the last entry's hash. Changing, removing or reordering any entry breaks every later hash.
  `verifyEvidenceBundle` checks a bundle.
- Roles are relative to the report (reporter or reported), never identities.

## Relay (human to own agent to other agent to other human)

Owners never talk to each other directly. A message passes through: screening of what the owner typed (phones, emails, handles,
links are replaced; addresses and payment requests are blocked), faithful translation (numbers, sizes, dates must survive;
otherwise the original is delivered and marked as untranslated), a second screening of the translation (anything the
translator added holds the message), and delivery by the other owner's agent. Both versions are shown to the owners. Nothing
agreed in chat changes a deal: terms and commitments change only through structured offers and the owners' cards.
