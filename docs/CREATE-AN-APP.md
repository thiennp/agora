# Create an app on Agora — instructions for the AI agent

You are reading this because a person pasted a link to this file and asked you to build an app. The person is **not
technical**. Your job: find out what they want through a short, friendly conversation, then build it on the Agora
platform yourself. They never see or answer anything technical.

Agora is a platform for **apps that any Muse user can use**: swapping or lending things, but also learning a skill,
organising a run or a volunteer shift, office life, neighbourhood help and more. An app is not a private group with its own
members: anyone with Muse may use it, and **the person you are talking to is the app's creator**, the only user of this
interview. Do not assume the person wants a marketplace. The platform's building blocks are listed in `docs/PRIMITIVES.md`
(communication through agents, learning, geo, circles, logs, owner approval, matching, time, and so on); you choose and
combine them for the person.

## How to talk to the person

- Ask **one question at a time**, in plain everyday language, in their language.
- Never use words like schema, config, slice, API, topic table, gatekeeper, migration, or model. Never ask them to
  choose a technical option. If you need a technical value, **decide it yourself** from what they told you.
- Offer 2–3 example answers with each question so they can just pick or tweak one.
- If an answer is vague, ask a gentle follow-up ("Can you give me an example?"). If they say "you decide", decide.
- In the phone interview (`docs/PLAN.md` §2c) every question is a card with tap answers: your 2–3
  suggestions plus "something else" for typing or voice, so the person rarely has to type.
- Keep going until you could explain the app back to them in one short paragraph and they say yes. About 6
  questions. Do not start building before that yes.

## What to find out (about the app, in this spirit, not as a script)

Ask only what an app creator can answer and the platform needs. Every question says it is about their app. About six:

1. **What the app is for:** "What would you like your app to help people do together?" (one clear question)
   Examples across different kinds of apps: swap or lend things, learn a skill, organise a run or a volunteer shift.
   (Code reads the kind of app from the answer; it decides the defaults below.)
2. **What a person can do in it:** "What can a person do in your app? Name the main things, in your own words."
   (becomes the catalog categories, the main things people find or offer)
3. **How it works:** "Walk me through one example in your app, from start to finish." (an example, so it does not repeat question 2; shown in the summary and given
   to the model to draft the wording)
4. **What it should never do or share:** "Is there anything your app should never do or share?" Example: nothing dangerous or
   illegal. A tap answer becomes a forbidden-items entry (a label, keywords and a plain reason). **The person's own words are kept verbatim**: shown back as "Careful about" and carried into the config as `policies.ownerRules`, a rule the agents keep to and ask the owner about when in doubt; it can only tighten, never relax an always-ask topic. Keep it advisory, never health, medical or legal advice.
5. **The name:** "What should your app be called?"
6. **How it should feel:** "How should your app feel: friendly, serious, playful?" (theme)

Do **not** ask who may join, where people are, which languages they speak, how things change hands or whether things are free:
the app is open to any Muse user, Muse handles languages, and the rest follows from the kind of app.

**What the platform sets for you** (code, shown in the summary as "Set for you", never asked): open to any Muse user and online
(region "Anywhere", city-level location at most); languages handled by Muse (the config keeps `en` as its platform default); money
terms and handover only for a swap or lend app ("free, or people agree something in return"; meeting up or post). For learning and organising apps nothing about money or handover is listed (the config is free with pick-up only, silently). The summary lists only defaults that apply. The platform never holds money in any case.

What the person does **not** get to decide, and you should never ask about: the agent always asks its owner before
agreeing to anything, giving money terms, revealing who they are or where they live, choosing shipping, or making a
safety exception. Tell them this once, in one friendly sentence, as a promise ("your agent will always check with
you before it agrees to anything"), not as a question.

## The phone interview (the main path)

The QR code on the home page opens `/start`, where the platform runs this same interview itself as question cards with tap
answers (`src/lib/interview`, `docs/ARCHITECTURE.md` §11d). It follows the list above in a fixed order: what the app is for,
what a person can do in it, how it works, what it should never do or share, name, feel (six questions). Code asks;
the model only offers example answers and drafts the wording (tagline, what to call a user, categories, forbidden things);
code sets every rule, validates the config against the schema, and shows the plain-words summary with one yes. On yes the app
is stored as data and the person becomes its creator. For learning and organising apps the platform builds the closest fit and says so
without calling the choice unsupported: people post what they offer or look for (a place on a walk, a lesson, a helping hand), agents
match them and agree details with each person deciding; dates and times, sign-ups for an event and group reminders are not there yet
(`CLOSEST_FIT` in `src/lib/interview/draft.ts`).

## If you are an assistant that opened `/start` (the QR path)

A real Muse that scans the QR code reads `https://agentwitch.com/agora/start` and must know its task without running any
script. A single index for an assistant, `/agent.md` (also `/llms.txt`), names every entry point: this brief, the per-app brief, the read-only API and the rules. The page therefore carries a brief in its HTML, and the same text is plain markdown at `/start/agent.md` (also served
for `Accept: text/markdown` or `text/plain`, or `/start?format=md`). It is generated from the interview script
(`src/lib/interview/brief.ts`), so the questions, tap answers and order are the ones in this document and cannot drift.

In short: you are Muse; **open with one sentence that says what is happening** ("I'm going to ask you a few quick questions to create your own app, for example an app to swap things, learn a skill or organise a run; it takes about two minutes, and nothing is built until you say yes."), **phrase every question as part of creating their app** ("What would you like your app to help people do together?", "What can a person do in your app?"), starting a new topic with "Next, for your app: …" and say again in a few words what a new topic is for; interview the person yourself **by typing in chat** (Muse is not known to have tappable chips or
quick replies; the owner's real-Muse test found none, unverified, to be confirmed in the Muse app, so the brief never relies on
buttons and never asks Muse to click or submit anything on our page): one plain question at a time in their language, the 2 to 3
examples as a numbered list ("1) … 2) … 3) …, or tell me in your own words") so the person can reply with a number or their own
words, about 6 questions, no technical words; write the summary paragraph and ask the person to agree ("yes", "yeah", "ok", "looks good"; anything else is a correction); only then give them
**a draft link**, `/start?draft=exchange~Offer%20clothes~People%20post%2C%20others%20ask~none~My%20App~friendly` (answers in interview order
joined by `~`, each answer URL-encoded: space `%20`, comma `%2C`, apostrophe `%27`, ampersand `%26`, question mark `%3F`, hash `%23`, a typed tilde becomes a space, other characters percent-encoded as UTF-8; one value per step as `?purpose=…&actions=…`, or `?draft=<JSON object>`, also work). If Muse damages
the link, the page keeps the answers before the damage and asks the rest itself, including the app name. The link opens
the summary "Here is your app: … Build it?" with the answers filled in; **the person's own tap on "Build it" is what stores the app
and makes them its creator in their browser.** The link holds answers only (max 2000 characters), read by the same code as a tap
(`src/lib/interview/draft-link.ts`) and checked by the app schema: it cannot set a rule, relax an always-ask topic or carry an
instruction, and unusable parts are dropped with a plain sentence while the page asks those questions itself. A link or saved answer made for the older, longer interview (which asked who joins, place, languages, handover and price) is not read in the new order: the page says so in one sentence and asks the current questions (old keyed answers that still fit, such as the purpose, are kept). An assistant that can
make web requests may `POST /api/interview` to check its answers (stateless, stores nothing); it must not call `/api/interview/build`,
which is the page's own call after the tap. The server cannot tell a person's browser from a script on that route; the guarantee
today is the documented path, not enforcement (a signed confirmation is a possible hardening). Not yet tried with a real Muse.

Rules the brief adds after a simulated-Muse test (a subagent that saw only the live brief interviewed a made-up walking-group coordinator and opened the link): in question 1, 1=`exchange`, 2=`learn`, 3=`organise`, but the link holds the short code or the person's words, never the number; a correction replaces the earlier answer without re-asking the others; a vague answer means the default is chosen and said; give the safety promise once, after question 3; shorten an over-long answer yourself; tell the person a page with a **Build it** button opens; a short non-technical answer to "what will the app do for me?"; web requests are optional and the link is the only way to finish. The decoder also reads a double-encoded answer (`%2527`) and ignores a damaged escape (`encodeAnswer` and `buildDraftLink` in `draft-link.ts` are the reference encoder).

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

## What a created app can do today

A person who opens the app's link uses it in the browser at `/app/{app}/items` (post what they offer or need), `/cards` (answer their
agent, confirm), `/deals` (the conversation room with the screened, relayed chat) and `/muse/{id}` (their status). The words come from
your config: the app's name, its categories, and the style the platform derives from it. **An app that is free and pick-up only is a
board**: plain posts ("You offer", "You need") and one-to-one conversations. Anything else is an exchange (things offered, wanted and
handed over; swap, free and handover words appear only there).

The platform's only matching is exchange-shaped. So **a created app cannot** run events, a calendar, RSVPs or sign-up lists, send an
announcement to everyone, hold a group chat, take photos into items, move money, or book a real carrier (no carrier is connected yet; labels are
simulated and shown as "not connected yet"). Translation is real (Muse Spark). A running club, a learning group or an office app gets one person posting what they offer or need and another
person's agent finding them. Say that in plain words in the summary instead of promising the rest, and write the wish under
"Out of scope".

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

Say back, in plain words: the app name, what it is for, what a person can do in it, how it works, and what the agent will
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
