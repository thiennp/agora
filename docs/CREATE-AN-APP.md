# Create an app on Agora — instructions for the AI agent

You are reading this because a person pasted a link to this file and asked you to build an app. The person is **not
technical**. Your job: find out what they want through a short, friendly conversation, then build it on the Agora
platform yourself. They never see or answer anything technical.

## How to talk to the person

- Ask **one question at a time**, in plain everyday language, in their language.
- Never use words like schema, config, slice, API, topic table, gatekeeper, migration, or model. Never ask them to
  choose a technical option. If you need a technical value, **decide it yourself** from what they told you.
- Offer 2–3 example answers with each question so they can just pick or tweak one.
- If an answer is vague, ask a gentle follow-up ("Can you give me an example?"). If they say "you decide", decide.
- Keep going until you could explain the app back to them in one short paragraph and they say yes. Usually 5–8
  questions. Do not start building before that yes.

## What to find out (in this spirit, not as a script)

1. **The idea:** "What would you like people to swap, share or trade? Tell me like you'd tell a friend."
2. **The people:** "Who are they? What do they have in common?" (becomes the participant noun and profile fields)
3. **What changes over time:** "Does what people need change over time or by situation?" (becomes catalog stages)
4. **Where and who:** "Do people need to be near each other? What area first? Which languages do they speak?"
5. **Handing things over:** "How would things usually change hands: meet up, a locker, by post?"
6. **Care points:** "Is there anything about these things where people should be careful or ask first?"
   (becomes safety rules; keep advisory and never health, medical or legal advice)
7. **Feel:** "What should it be called, and how should it feel: friendly, serious, playful?" (name, theme)

What the person does **not** get to decide, and you should never ask about: the agent always asks its owner before
agreeing to anything, giving money terms, revealing who they are or where they live, choosing shipping, or making a
safety exception. Tell them this once, in one friendly sentence, as a promise ("your agent will always check with
you before it agrees to anything"), not as a question.

## Before you build

Say back, in plain words: the app name, who it is for, what is traded, how handover works, and what the agent will
do alone versus ask about. Wait for a yes. Fix anything they correct.

## How to build (silently, no questions)

1. Read `README.md`, `docs/ARCHITECTURE.md` section 2b and `src/lib/app-config/schema.ts` (the contract).
2. Read `apps/kids-gear/app.config.ts` as the worked example.
3. Create `apps/<id>/` with `app.config.ts` (use `defineApp` from `@agora/app-config`, import nothing else from
   `src/`), a `sandbox-city/` of about 20 clearly synthetic participants, and a `REQUIREMENTS.md` in the same format
   as `apps/kids-gear/REQUIREMENTS.md`.
4. Register the app with one line in `src/lib/app-config/load-app.ts`. Do not modify anything else in `src/`.
5. Rules: always-ask topics (`commitment`, `price_terms`, `identity_reveal`, `location_reveal`, `shipping_choice`,
   `safety_exception`) stay `ask` and never become standing rules; every category used by a stage or safety rule
   exists in the catalog; no health, medical or legal advice anywhere.
6. Run `npm run typecheck`, `npm run lint`, `npm test`. Fix problems yourself. Then start it with
   `APP=<id> npm run dev` and check `/api/health`.

## When you finish

Tell the person, in plain words: the app is ready, what it is called, how to open it, and what the agent will always
check with them about. If something they wanted could not be expressed, say so simply and offer the closest option.
Do not paste code or file lists unless they ask.
