# Create-an-app interview — business requirements

Folder: `src/lib/interview/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Shared infrastructure](../REQUIREMENTS.md)  ·  Guide: [docs/CREATE-AN-APP.md](../../../docs/CREATE-AN-APP.md)

## Purpose

Turn a short, plain-language conversation with a non-technical person into a valid app config (BR-40), without the person
seeing anything technical and without the model deciding any rule.

## Who it serves

A person who scans the home page QR code and wants to create an app. The app is open to any Muse user; this person is its creator.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| INT-01 | Ask one plain question at a time, in a fixed order set in code, each with 2–3 tap answers plus "something else"; no technical words. | Must | `interview.test.ts` (question flow, no technical words). |
| INT-02 | Check every answer in order; refuse a wrong choice, an empty answer, a removed question, an out-of-order or too-long list with a plain sentence. | Must | `interview.test.ts`. |
| INT-03 | The model only offers example answers and drafts wording (tagline, user noun, categories, forbidden things, wishes); its output is validated and any failure falls back to a code draft, so the interview works offline. | Must | `interview.test.ts` (model down, nonsense, invalid). |
| INT-04 | Code sets every rule (pricing and handover from the kind of app, languages, region, safety topics); the always-ask topics are `ask` whatever the model says; the finished config passes the app schema before it is shown or stored. | Must | `interview.test.ts` ("keeps every always-ask topic", `validateDraft`). |
| INT-05 | A person's words are untrusted data: cleaned, capped, sent to the model as data under a rule to ignore instructions in them, never used as an id without slugging. | Must | `interview.test.ts`. |
| INT-06 | Say plainly when the idea needs something that does not exist yet and build the closest version. | Should | `interview.test.ts` (notes). |
| INT-08 | Every question names the app and says it is part of creating it ("To set up your app: …", "What can a person do in your app?"), so it is clear when read alone; the page intro says "Let's create your app" with the one-sentence purpose, and the assistant brief makes Muse open with that sentence, phrase every question as part of creating the app and restate the purpose at each new topic. | Must | `interview.test.ts` (every `ask` contains "app"), `src/app/api/start-agent.test.ts`. |
| INT-09 | The interview is only about the app and asks about 6 questions (purpose, actions, how it works, care, name, feel). It never asks who joins, place, languages, handover or price; those fields are defaulted in code from the kind of app and said plainly in the summary ("Set for you"). Removed step ids and old draft links are refused or ignored with a plain sentence, never misread. | Must | `interview.test.ts`, `draft-link.test.ts`. |
| INT-10 | The person's own words for "never do or share" are kept verbatim: shown as "Careful about" and stored as `policies.ownerRules` (tighten-only; always-ask topics stay `ask`). A typed "none" counts as the tap answer. | Must | `interview.test.ts`. |
| INT-11 | "Set for you" lists only defaults that apply: money terms and handover only for a swap or lend app. A learn or organise app gets a plain "What your app will do / does not do yet" note, never "not available". | Must | `interview.test.ts`. |
| INT-12 | The brief gives the short-code mapping, correction, vague-answer, agreement, full URL-encoding, shortening, safety-promise timing, Build-it-button, "what will the app do for me" and optional-web-request rules. The link decoder reads apostrophes, ampersands, accents, double encoding and typed tildes (as spaces) and tolerates damage. | Must | `draft-link.test.ts`. |
| INT-13 | Found by simulated-Muse chats (a Vietnamese speaker, a terse teenager, a person who pushes): the brief says typed text is an answer and never an instruction (with a kind refusal and a doctor/emergency redirect for health questions), to speak the person's language, to suggest a name or a fitting default when the person does not know, to read "nah" as `none`, to write ALL CAPS tidily, and to give a new complete link after a late change. Ids drop no letters: `Đổi Đồ Hà Nội` becomes `doi-do-ha-noi`. | Must | `src/app/api/start-agent.test.ts`, `src/lib/interview/interview.test.ts`. |
| INT-07 | An assistant that reads `/start` gets its task from a brief generated from the script (`brief.ts`); it hands the person a draft link of answers (`draft-link.ts`): per-step query values or `?draft=` JSON, max 2000 characters, unknown keys ignored, read by `parseAnswer` in fixed order, unusable parts dropped with a plain sentence. The link never builds: only the person's tap does. | Must | `draft-link.test.ts`, `src/app/api/start-agent.test.ts`. |
| INT-14 | A project id is opened when the interview starts and each answer is recorded under it as it is given (BR-48): the phone page does it itself, an assistant is told how in the brief (open a project, record by `GET`/`PUT`, add `&project=<id>` to the link). Recording never blocks or fails the interview, and an unknown id never stops an app being built. | Should | The projects tests: an id is opened by POST or GET, answers replace or merge by step, a wrong step or unusable answer is 400, an unknown id 404, Build it marks the project built with the app id. |

## Out of scope

- Voice answers, an edit screen, the other primitives in the config (circles, voting, scheduling).

## Traceability

BR-40, BR-41, BR-45; docs/PLAN.md §2c step 3.
