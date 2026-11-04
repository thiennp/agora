# Connect your own Muse (read only)

For a person who uses an app (a user account). About ten minutes. **Read this first: what is and is not confirmed.**

## What this does, in plain words

Your Muse can read what your agent is doing in one Agora app and tell you about it: what the app is for, your status
(waiting on you, deals, items, what your agent did alone, lessons, standing rules), your agent's recent actions, and the
cards waiting for you.

## What it can never do

- It cannot answer, confirm or decline a card, and cannot change a price, a place, an address, shipping or a safety
  decision. Those need **your own tap in the app** (BR-07, BR-44). There is no such button anywhere in this connection.
- It sees only **you** in **one app**. Not other users, not the messages between agents, not addresses.
- A key can be revoked at any time, and stops working at once.

## What is not confirmed (honest part)

- Meta's help page says Muse can build a **custom connector** from a service's API description. It does not say how that
  works in every region or on every phone, and we have not yet tried it with a real Muse account (`docs/PLAN.md` §2d).
- Whether the consumer Muse app has an "Add custom connector" setting that takes a **MCP** address is **unconfirmed**:
  sources disagree. The MCP address below is built so it works the day that is confirmed. Do not rely on it in the walkthrough.
- Muse may need to be in a country where it is offered. If something below does not match your screen, stop and tell us;
  everything on the status page works without Muse.

## Fastest way: paste one message (connect your assistant)

1. Open the app's share link. The first visit makes your record; on the app page tap **Get the message for my assistant**.
2. Copy the message and paste it into Muse, Meta AI or any bot that can open a link. The assistant sends no web request.
3. The message holds one link, `/app/{app}/connect/{code}` (the **one-time connect code** works once and ends in 15 minutes). The assistant opens it, asks you, then taps **Connect** on that page (or calls the WebMCP tool `connect_assistant`), which swaps the code for a read-only key (`POST /api/apps/{app}/connect`, made by the page). `connect.md` is the same brief in markdown (open the link, tap Connect, never POST).
4. **Right after connecting it must tell you, in its own words and tone, what it knows about the app and what it can do for you** (and what it cannot). The app gives it only a minimal description (`about` in the connect answer and the brief); making it understandable is the assistant's job.
5. It then polls `GET /api/muse/{app}/updates` (first call returns only a cursor; later calls with `?since=<cursor>` return new deal events and how many cards wait for you) and tells you what is new. An assistant that can receive https requests may also register a webhook (below).

An assistant that cannot send requests or set an `Authorization` header still connects through the page, and can explain the app, but cannot poll; use the status page in the app for updates.

### Updates (polling)

`GET /api/muse/{app}/updates?since=<cursor>&limit=20`, `Authorization: Bearer <key>`. Answer: `cursor` (send it back as `since`), `events` (your own deals' changes after `since`, oldest first, decisions only, never message text), `more`, `waiting` (cards waiting: questions, confirmations, offers; always the current number), `nextPollInSeconds`, and your webhook state. Same data and limits as `/actions`; not other people's posts. Also an MCP tool, `get_updates`.

### Webhook (optional, best effort)

`PUT /api/muse/{app}/webhook` with `{"url": "https://...", "secret": "<16-128 chars, optional>"}` (key as Bearer). `GET` shows it (never the secret), `DELETE` removes it. This is the **only thing a key can write**: where to send "something changed" for its own member. It cannot answer, confirm or change anything.

- The address must be public https on the default port: no IP literal, no `localhost` or internal names, no credentials, and every address it resolves to must be public (checked at registration and before each send; redirects are not followed; 5 second timeout).
- After a change is saved, if the member has new events or more cards waiting, the app sends one `POST` with JSON `{type:"agora.update", app, newEvents, more, waiting, cursor, pollUrl}` and headers `x-agora-timestamp` and `x-agora-signature: sha256=HMAC-SHA256(secret, "<timestamp>.<body>")`. No text, names or cards travel. The receiver should reject a wrong signature or a timestamp older than 5 minutes and answer 2xx.
- The cursor moves only after a 2xx, so a missed signal is repeated with the next change. After 5 failed sends in a row the webhook stops (register again). Revoking all of the member's keys also stops it. Polling stays the reliable path; sending happens in the same process after the answer, so on a host that freezes work after a response it can be lost.
- The signing secret is stored in the clear in the state store (it has to sign), shown once, never returned.

## Step 1: make a key (in the app)

1. Open your status page: `https://agentwitch.com/agora/app/{app}/muse/{your id}` (the "My status" link on the app page).
2. Under **Connect your own Muse**, tap **Make a key for my Muse**.
3. Copy the key. It looks like `agmk_…`. It is shown **once**. Treat it like a password: do not post it or put it in a
   link. If you lose it, revoke it and make a new one. You can have three keys.

## Step 2: give it to Muse (route A, the documented one: custom connector)

Ask Muse, in a chat: *"Create a custom connector for this API: `https://agentwitch.com/agora/api/muse/openapi.json`.
It uses a Bearer key. My app is `{app}`."* When Muse asks for the key, paste it there (Muse keeps credentials in its own
store). Then ask: *"What is my agent doing in {app}?"*

The description lists five read-only calls, all `GET`, each with `Authorization: Bearer <key>`:

| Call | Answers |
|---|---|
| `/api/muse/{app}/overview` | what the app is for, its features and rules |
| `/api/muse/{app}/status` | your status, grouped |
| `/api/muse/{app}/actions?limit=20` | your agent's recent actions, newest first |
| `/api/muse/{app}/updates?since=` | what is new since a cursor, and how many cards wait (poll this) |
| `/api/muse/{app}/cards` | cards waiting for you (read only) |

## Step 2, alternative (route B, only if your Muse has an MCP setting)

In Muse: Settings → Connectors → Add custom connector → address
`https://agentwitch.com/agora/api/muse/{app}/mcp`, and give the key as the Bearer key (an `X-Api-Key` header also works).
The five tools are `get_app_overview`, `get_my_status`, `get_my_recent_actions`, `get_updates` and `get_pending_cards`. All are marked
read only. Sign-in by OAuth is **not** offered: the key is the sign-in.

## Stop it

On the same page tap **Revoke** next to the key. The next request from Muse is refused.

## For builders

- Keys: `agmk_` plus 256 random bits, per member and per app, stored only as a SHA-256 hash, shown once, revocable,
  never logged, never accepted in a URL (`src/lib/identity/muse-keys.ts`).
- Only a signed-in person (session cookie, not a key) can make or revoke keys: `GET/POST /api/apps/{app}/muse-key`,
  `POST /api/apps/{app}/muse-key/revoke`.
- A wrong app, wrong key, revoked key, a session cookie or a repository app all get the same 401. Limits: 60 requests a minute
  per key, 120 per address, 20 wrong keys per 15 minutes per address.
- MCP is stateless streamable HTTP with JSON replies, POST only; no session id to steal.
- Answers carry a `notice` telling the model the text is data, not instructions.
- Connect codes: `POST /api/apps/{app}/connect-code` (the person's session) and `POST /api/apps/{app}/connect` (the assistant; 20 wrong codes per 15 minutes per address). 128 random bits, stored hashed, 15 minutes, once (`src/lib/identity/muse-keys.ts`). The brief is `src/lib/app-config/connect-page.ts`.
- Webhooks: `src/lib/identity/webhooks.ts` (store), `src/lib/webhook-url.ts` (address checks), `src/app/_composition/webhooks.ts` (delivery, called after every saved write in `route`).
- Tests: `src/app/api/muse.test.ts`, `src/app/api/connect.test.ts`.
