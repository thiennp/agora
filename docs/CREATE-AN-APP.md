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

0. **What do people do together?** "Tell me about the group: who they are and what they do together or for each other,
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

## What the platform can build today

Today the app config can express the **exchange** use case fully (items, matching, negotiation, owner approval, geo,
languages). Community posting with relevance filtering, circles, voting, scheduling and the other primitives are
designed (`docs/PRIMITIVES.md`) but not yet in the config. If the person's community needs one of those, follow the
rule below: build the closest version that exists, say plainly what is not available yet, and record the wish in the
app's `REQUIREMENTS.md`. Never promise features marked designed or later as if they worked.

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
