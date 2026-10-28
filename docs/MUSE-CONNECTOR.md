# Connect your own Muse (read only)

For the owner of a member account. About ten minutes. **Read this first: what is and is not confirmed.**

## What this does, in plain words

Your Muse can read what your agent is doing in one Agora app and tell you about it: what the app is for, your status
(waiting on you, deals, items, what your agent did alone, lessons, standing rules), your agent's recent actions, and the
cards waiting for you.

## What it can never do

- It cannot answer, confirm or decline a card, and cannot change a price, a place, an address, shipping or a safety
  decision. Those need **your own tap in the app** (BR-07, BR-44). There is no such button anywhere in this connection.
- It sees only **you** in **one app**. Not other members, not the messages between agents, not addresses.
- A key can be revoked at any time, and stops working at once.

## What is not confirmed (honest part)

- Meta's help page says Muse can build a **custom connector** from a service's API description. It does not say how that
  works in every region or on every phone, and we have not yet tried it with a real Muse account (`docs/PLAN.md` §2d).
- Whether the consumer Muse app has an "Add custom connector" setting that takes a **MCP** address is **unconfirmed**:
  sources disagree. The MCP address below is built so it works the day that is confirmed. Do not rely on it for the demo.
- Muse may need to be in a country where it is offered. If something below does not match your screen, stop and tell us;
  everything on the status page works without Muse.

## Step 1: make a key (in the app)

1. Open your status page: `https://agentwitch.com/agora/app/{app}/muse/{your id}` (the "My status" link on the app page).
2. Under **Connect your own Muse**, tap **Make a key for my Muse**.
3. Copy the key. It looks like `agmk_…`. It is shown **once**. Treat it like a password: do not post it or put it in a
   link. If you lose it, revoke it and make a new one. You can have three keys.

## Step 2: give it to Muse (route A, the documented one: custom connector)

Ask Muse, in a chat: *"Create a custom connector for this API: `https://agentwitch.com/agora/api/muse/openapi.json`.
It uses a Bearer key. My app is `{app}`."* When Muse asks for the key, paste it there (Muse keeps credentials in its own
store). Then ask: *"What is my agent doing in {app}?"*

The description lists four read-only calls, all `GET`, each with `Authorization: Bearer <key>`:

| Call | Answers |
|---|---|
| `/api/muse/{app}/overview` | what the app is for, who joins, features and rules |
| `/api/muse/{app}/status` | your status, grouped |
| `/api/muse/{app}/actions?limit=20` | your agent's recent actions, newest first |
| `/api/muse/{app}/cards` | cards waiting for you (read only) |

## Step 2, alternative (route B, only if your Muse has an MCP setting)

In Muse: Settings → Connectors → Add custom connector → address
`https://agentwitch.com/agora/api/muse/{app}/mcp`, and give the key as the Bearer key (an `X-Api-Key` header also works).
The four tools are `get_app_overview`, `get_my_status`, `get_my_recent_actions` and `get_pending_cards`. All are marked
read only. Sign-in by OAuth is **not** offered: the key is the sign-in.

## Stop it

On the same page tap **Revoke** next to the key. The next request from Muse is refused.

## For builders

- Keys: `agmk_` plus 256 random bits, per member and per app, stored only as a SHA-256 hash, shown once, revocable,
  never logged, never accepted in a URL (`src/lib/identity/muse-keys.ts`).
- Only a signed-in person (session cookie, not a key) can make or revoke keys: `GET/POST /api/apps/{app}/muse-key`,
  `POST /api/apps/{app}/muse-key/revoke`.
- A wrong app, wrong key, revoked key, a session cookie or a demo app all get the same 401. Limits: 60 requests a minute
  per key, 120 per address, 20 wrong keys per 15 minutes per address.
- MCP is stateless streamable HTTP with JSON replies, POST only; no session id to steal.
- Answers carry a `notice` telling the model the text is data, not instructions.
- Tests: `src/app/api/muse.test.ts`.
