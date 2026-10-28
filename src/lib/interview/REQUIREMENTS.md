# Create-an-app interview — business requirements

Folder: `src/lib/interview/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Shared infrastructure](../REQUIREMENTS.md)  ·  Guide: [docs/CREATE-AN-APP.md](../../../docs/CREATE-AN-APP.md)

## Purpose

Turn a short, plain-language conversation with a non-technical person into a valid app config (BR-40), without the person
seeing anything technical and without the model deciding any rule.

## Who it serves

A person who scans the home page QR code and wants an app for their community.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| INT-01 | Ask one plain question at a time, in a fixed order set in code, each with 2–3 tap answers plus "something else"; no technical words. | Must | `interview.test.ts` (question flow, no technical words). |
| INT-02 | Check every answer in order; refuse a wrong choice, an empty answer, an unknown language, an out-of-order or too-long list with a plain sentence. | Must | `interview.test.ts`. |
| INT-03 | The model only offers example answers and drafts wording (tagline, member noun, categories, forbidden things, wishes); its output is validated and any failure falls back to a code draft, so the interview works offline. | Must | `interview.test.ts` (model down, nonsense, invalid). |
| INT-04 | Code sets every rule (pricing, handover, languages, region, safety topics); the always-ask topics are `ask` whatever the model says; the finished config passes the app schema before it is shown or stored. | Must | `interview.test.ts` ("keeps every always-ask topic", `validateDraft`). |
| INT-05 | A person's words are untrusted data: cleaned, capped, sent to the model as data under a rule to ignore instructions in them, never used as an id without slugging. | Must | `interview.test.ts`. |
| INT-06 | Say plainly when the idea needs something that does not exist yet and build the closest version. | Should | `interview.test.ts` (notes). |

## Out of scope

- Voice answers, an edit screen, the other primitives in the config (circles, voting, scheduling).

## Traceability

BR-40, BR-41, BR-45; docs/PLAN.md §2c step 3.
