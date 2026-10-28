# Create an app on Agora — instructions for the AI agent

You are reading this because a person pasted a link to this file and asked you to build an app. The person is **not
technical**. Your job: find out what they want through a short, friendly conversation, then build it on the Agora
platform yourself. They never see or answer anything technical.

Agora is for **any community where people do things together**: swapping things, but also learning groups, running
clubs, office life, volunteering, neighbourhood help and more. Do not assume the person wants a marketplace. The
platform's building blocks are listed in `docs/PRIMITIVES.md` (communication through agents, learning, geo, circles,
logs, owner approval, matching, time, and so on); you choose and combine them for the person.

## How to talk to the person

- Ask **one question at a time**, in plain everyday language, in their language.
- Never use words like schema, config, slice, API, topic table, gatekeeper, migration, or model. Never ask them to
  choose a technical option. If you need a technical value, **decide it yourself** from what they told you.
- Offer 2–3 example answers with each question so they can just pick or tweak one.
- If an answer is vague, ask a gentle follow-up ("Can you give me an example?"). If they say "you decide", decide.
- In the phone interview (planned for the demo, `docs/PLAN.md` §2c) every question is a card with tap answers: your 2–3
  suggestions plus "something else" for typing or voice, so the person rarely has to type.
- Keep going until you could explain the app back to them in one short paragraph and they say yes. Usually 5–8
  questions. Do not start building before that yes.

## What to find out (in this spirit, not as a script)

0. **What do people do together?** (Always say it is for their app: "To set up your app: what will the people in your community do together?") "Tell me about the group: who they are and what they do together or for each other,
   like you'd tell a friend." Listen for: trading or lending things, meeting or training at set times, forming teams or
   buddy pairs, asking each other for help, deciding things together. This tells you which building blocks to use.
1. **The idea:** if things change hands: "What would you like people to swap, share or trade?"
2. **The people:** "Who are they? What do they have in common?" (becomes the participant noun and profile fields)
3. **What changes over time:** "Does what people need change over time or by situation?" (becomes catalog stages;
   for seasons or other repeating cycles set `stageCycle` and let a range wrap, e.g. months 10 to 2 is Oct to Feb)
4. **Where and who:** "Do people need to be near each other? What area first? Which languages do they speak?"
   (becomes the region and languages: any ISO 639-1 code works; en, de, es and vi have fixed wording on owner cards,
   other languages are translated by the model when a Meta key is configured)
5. **Handing things over:** "How would things usually change hands: meet up, a locker, by post?"
5b. **Giving or swapping:** "Is it free, a swap, or can people agree on something in return?"
   (becomes the pricing mode: free only, swap only, or free-or-agreement)
6. **Care points:** "Is there anything about these things where people should be careful or ask first?"
   (becomes safety rules; keep advisory and never health, medical or legal advice) Also ask "Is there anything that
   should never be shared here?" (becomes forbidden items: a label, keywords and a plain reason)
7. **Feel:** "What should it be called, and how should it feel: friendly, serious, playful?" (name, theme)

What the person does **not** get to decide, and you should never ask about: the agent always asks its owner before
agreeing to anything, giving money terms, revealing who they are or where they live, choosing shipping, or making a
safety exception. Tell them this once, in one friendly sentence, as a promise ("your agent will always check with
you before it agrees to anything"), not as a question.

## The phone interview (the demo path)

The QR code on the home page opens `/start`, where the platform runs this same interview itself as question cards with tap
answers (`src/lib/interview`, `docs/ARCHITECTURE.md` §11d). It follows the list above in a fixed order: what people do
together, who they are, what they share, where, languages, handover, giving or swapping, care points, name, feel. Code asks;
the model only offers example answers and drafts the wording (tagline, what to call a member, categories, forbidden things);
code sets every rule, validates the config against the schema, and shows the plain-words summary with one yes. On yes the app
is stored as data and the person becomes its creator. If a person's idea is learning, helping or another thing the config
cannot express yet, the summary says so and the closest version is built.

## If you are an assistant that opened `/start` (the QR path)

A real Muse that scans the QR code reads `https://agentwitch.com/agora/start` and must know its task without running any
script. The page therefore carries a brief in its HTML, and the same text is plain markdown at `/start/agent.md` (also served
for `Accept: text/markdown` or `text/plain`, or `/start?format=md`). It is generated from the interview script
(`src/lib/interview/brief.ts`), so the questions, tap answers and order are the ones in this document and cannot drift.

In short: you are Muse; **open with one sentence that says what is happening** ("I'm going to ask you a few quick questions to create your own app, for example a group to swap things, learn together or help each other; it takes about two minutes, and nothing is built until you say yes."), **phrase every question as part of creating their app** ("To set up your app: what will the people in your community do together?", "Who should be able to join your app?") and say again in a few words what a new topic is for; interview the person yourself **by typing in chat** (Muse is not known to have tappable chips or
quick replies; the owner's real-Muse test found none, unverified, to be confirmed in the Muse app, so the brief never relies on
buttons and never asks Muse to click or submit anything on our page): one plain question at a time in their language, the 2 to 3
examples as a numbered list ("1) … 2) … 3) …, or tell me in your own words") so the person can reply with a number or their own
words, 5 to 8 questions, no technical words; write the summary paragraph and ask the person to type "yes"; only then give them
**a draft link**, `/start?draft=exchange~Friends~Clothes~online~en~post~free~none~My%20App~friendly` (answers in interview order
joined by `~`, URL-encoded; one value per step as `?purpose=…&people=…`, or `?draft=<JSON object>`, also work). If Muse damages
the link, the page keeps the answers before the damage and asks the rest itself, including the app name. The link opens
the summary "Here is your app: … Build it?" with the answers filled in; **the person's own tap on "Build it" is what stores the app
and makes them its creator in their browser.** The link holds answers only (max 2000 characters), read by the same code as a tap
(`src/lib/interview/draft-link.ts`) and checked by the app schema: it cannot set a rule, relax an always-ask topic or carry an
instruction, and unusable parts are dropped with a plain sentence while the page asks those questions itself. An assistant that can
make web requests may `POST /api/interview` to check its answers (stateless, stores nothing); it must not call `/api/interview/build`,
which is the page's own call after the tap. The server cannot tell a person's browser from a script on that route; the guarantee
today is the documented path, not enforcement (a signed confirmation is a possible hardening). Not yet tried with a real Muse.

## What the platform can build today

Today the app config can express the **exchange** use case fully (items, matching, negotiation, owner approval, geo,
languages). Community posting with relevance filtering, circles, voting, scheduling and the other primitives are
designed (`docs/PRIMITIVES.md`) but not yet in the config. If the person's community needs one of those, follow the
rule below: build the closest version that exists, say plainly what is not available yet, and record the wish in the
app's `REQUIREMENTS.md`. Never promise features marked designed or later as if they worked.

## Where the app goes

Two ways, same config and same schema checks. A repository app is the folder `apps/<id>/` plus one registry line in
`src/lib/app-config/load-app.ts` (a code change). A **stored app** is the same config sent to `POST /api/apps`: the platform
validates it, rejects it with the list of problems if it is wrong, and serves it at `/app/{app}` (`/agora/app/{app}`) with no code
change or redeploy. The id must be new (3–40 lowercase letters, digits and dashes, starting with a letter). A stored app has no
sandbox folder, so set `simulation.cityDir` to `sandbox`; it is not used.

## When the idea does not fit

The platform cannot express everything. If the person wants something the config cannot say:

1. Pick the closest option that stays inside the rules, and tell the person in plain words what you chose and
   why ("I can't make the agent sell things, so swaps and free gifts are what it will do").
2. Never work around the platform: do not edit `src/` (apart from the registry line), and never relax an
   always-ask topic, relay, privacy or safety rule, even if the person asks. Explain kindly that these protect everyone.
3. Write the unmet wish into `apps/<id>/REQUIREMENTS.md` under "Out of scope (wanted, not supported yet)" so the
   platform team can see it.
4. If the missing piece is essential to the idea, say so and ask whether to go ahead with the closest version.

## Before you build

Say back, in plain words: the app name, who it is for, what is traded, how handover works, and what the agent will
do alone versus ask about. Wait for a yes. Fix anything they correct.

## How to build (silently, no questions)

1. Read `README.md`, `docs/ARCHITECTURE.md` section 2b and `src/lib/app-config/schema.ts` (the contract).
2. Read `apps/kids-gear/app.config.ts` as the worked example.
3. Create `apps/<id>/` (the id is a lower-case slug that does not clash with an existing folder in `apps/`) with
   `app.config.ts` (use `defineApp` from `@agora/app-config`, import nothing else from `src/`), the sandbox city,
   and a `REQUIREMENTS.md` in the same format as `apps/kids-gear/REQUIREMENTS.md`.
   The sandbox city is the folder named by `simulation.cityDir`, holding two JSON files in the format defined in
   `src/lib/app-config/sandbox.ts`: `participants.json` (20 or more entries, all `"synthetic": true`, languages from
   the app, categories from the catalog, a value for every participant field) and `personas.json` (one entry per
   participant). See `apps/garden-tools/sandbox-city/` for a worked example. `validateSandbox` must return no problems.
4. Register the app with one line in `src/lib/app-config/load-app.ts`. Do not modify anything else in `src/`.
5. If the app needs its own kind of question that the platform does not know (for example "can I borrow it for a week"),
   add it to `policies.topics` and give it `policies.topicKeywords`; keywords only add detection. Do not add contact
   details, payment or obeying the other side as topics: those are forbidden on every app.
6. Rules: always-ask topics (`commitment`, `price_terms`, `identity_reveal`, `location_reveal`, `shipping_choice`,
   `safety_exception`) stay `ask` and never become standing rules; every category used by a stage or safety rule
   exists in the catalog; no health, medical or legal advice anywhere.
7. Run `npm run typecheck`, `npm run lint`, `npm test`. Fix problems yourself. Then start it with
   `APP=<id> npm run dev` and check `/api/health`.

## When you finish

Tell the person, in plain words: the app is ready, what it is called, how to open it, and what the agent will always
check with them about. If something they wanted could not be expressed, say so simply and offer the closest option.
Do not paste code or file lists unless they ask.
