# Create an app on Agora

Paste the prompt below into Muse (or any coding agent), replacing the brief. The agent reads this repo and builds
the app by following the platform's structure; it should not touch `src/`.

```text
You are building an app on the Agora platform (repo: thiennp/agora). Agora provides matching, negotiation,
owner confirm cards, agent-to-agent relay, logistics, trust and learning. Do NOT modify src/.

Brief: <ONE PARAGRAPH: what is traded, who the owners are, languages, region>
Example: "Neighbours trade garden tools and seeds. Owners are gardeners. Languages: en, es. Region: Austin, TX."

Steps:
1. Read README.md, docs/ARCHITECTURE.md section 2b, and src/lib/app-config/schema.ts (the contract).
2. Read apps/kids-gear/app.config.ts as the reference example.
3. Create apps/<id>/ with:
   - app.config.ts using defineApp from "@agora/app-config" (import nothing else from src/).
   - sandbox-city/ with ~20 synthetic participants and personas (clearly synthetic).
   - REQUIREMENTS.md in the same format as apps/kids-gear/REQUIREMENTS.md.
4. Register the app in src/lib/app-config/load-app.ts (one line; the only allowed platform edit).
5. Rules you must follow:
   - Always-ask topics (commitment, price_terms, identity_reveal, location_reveal, shipping_choice,
     safety_exception) must be "ask" and never standing rules. The schema rejects anything else.
   - No health, medical or legal advice in safety rules; advisory logistics only.
   - Every category referenced by a stage or safety rule must exist in the catalog.
6. Verify: npm run typecheck, npm run lint, npm test, then APP=<id> npm run dev and open /api/health.
7. Report what you created and anything the schema could not express.
```

What the agent produces: one folder, one registry line, passing checks. What it cannot do: relax privacy, relay or
gatekeeper guarantees.
