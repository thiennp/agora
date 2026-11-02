# Muse-first walkthrough and demo script (3:00), not yet recorded

Follows `docs/PLAN.md` §2c. The demo is a person making a community app live, then a second person using it and the first
person's own Muse reading what their agent does. Everything shown must run; anything not connected is labelled on screen (list below).
There is no separate demo mode or demo app any more (removed Oct 29): the walkthrough runs on the real app with a real Meta key.

## Main path

| Time | Shot | What runs (real unless marked) |
|---|---|---|
| 0:00–0:20 | The home page on a laptop: one copy-paste prompt, "Copy, paste, create an app". A person pastes it into Muse. | Prompt home page (`/`), opens `https://agentwitch.com/agora/start` |
| 0:20–1:05 | On the phone, Muse says it is creating their app, then interviews them one question at a time, each worded as part of creating the app with tap answers (what the app is for, what a person can do in it, how it works, what it should never do or share, name, feel: six questions, nothing about who joins, place, languages or price). The last card: "Here is your app: … Build it?" They tap yes. | `/start` interview; code sets the rules and validates; the model (real Muse Spark through the Meta Model API) only offers examples and drafts wording |
| 1:05–1:30 | The app exists: private overview with the share link, list of people using it, what the app does in plain words and its always-ask promise. | `/app/{app}` as creator; app stored as data, no redeploy |
| 1:30–1:55 | A friend opens the share link, sees the public page (name, purpose, rules), is set up on first use with no form, sees the recovery-code notice (light identity, not a real account). | `/app/{app}` as stranger, `POST …/join` |
| 1:55–2:25 | Both people use the app on their own phones: one posts what they offer (`/app/{app}/items`), the friend posts what they need and sees the match, taps "Ask my agent to reach out"; the agents negotiate and pause to ask the other owner, who answers the card in the app with their own tap; both confirm and the conversation room opens with the screened, relayed chat (`/app/{app}/deals/{id}`). The friend's status page shows it grouped and charted: waiting on you, deals, items, what the agent did alone. | member parties (ADR 0007), matching, negotiation, owner cards, `/app/{app}/items|cards|deals`, `/app/{app}/muse/{id}` (**translation is real Muse Spark; no carrier is connected; a board app has posts and conversations only: no events, RSVPs or group chat, say so**) |
| 2:25–2:50 | The friend opens their own Muse and asks "what is waiting for me in the clothes club?". Muse answers from the read-only connector. Then the person asks Muse to approve the card: Muse cannot; the card waits for their tap in the app. | `GET /api/muse/{app}/status|cards` or MCP (**not yet tried with a real Muse; see the manual checks below**) |
| 2:50–3:00 | Close: one platform, any community app; kids' gear and garden tools are two more apps on it. Sandbox city and cost numbers on screen. | judge dashboard (simulation numbers, labelled simulated) |

Rules: no claim of "any community app" beyond the apps that run (a second, non-exchange app runs only if one was created and tried);
no claim that Meta receives reports ("designed for"); say "light identity, not real accounts" when the recovery code appears;
never say Muse connected unless the manual checks below passed; rehearse three times; record every step as a fallback clip.

## Fallbacks

- **Muse cannot connect (most likely).** Skip 2:25–2:50 on Muse. Show the status page on the phone and the same data from
  `curl` against `/api/muse/{app}/status` with the key, and say plainly that the connector is built and tested but a real Muse
  was not shown to use it.
- **Muse does not understand `/start`.** Tell it to read `https://agentwitch.com/agora/start/agent.md`; if it still does not,
  do the interview with the tap cards on the page. Say plainly that the Muse-run interview was not shown.
- **The phone cannot reach the host or the paste fails.** Open `/start` by hand on the laptop; the flow is identical.
- **The model for the interview is down or slow.** The questions, the rules and the build are code; only example answers and
  wording come from the model, with fixed examples as the fallback for the examples. (There is no offline mock any more; the
  Meta key must be valid.)
- **Everything fails.** Play the recorded clips, and show the judge dashboard (the learning curve: about 3.7 cards answered per
  confirmed deal against 13.4 without learning, in the simulation; privacy and safety checks). (The earlier kids' gear `/demo`
  fallback with Mia and Jonas was removed Oct 29.)

## What is not connected or simulated (say it, do not hide it)

- The carrier (labels, tracking) is a simulation and shown as "not connected yet"; no real carrier exists. Translation between members is real Muse Spark. No money moves; the platform never holds money.
- The interview's examples and wording come from the real model; the quality of the draft with a real Muse in the loop was not
  measured. Photo intake uses the real models (Muse Spark vision, SAM 3.1).
- Identity is light: a phone holds a session, a recovery code is the only way back in; no passwords, no email.
- All members of an app share one coarse district and one language (the app's first) until a location and language step exists.
- The status page's "what the agent did alone" is the member's own log, written by the platform as the agent works (Nov 2);
  it holds plain-words lines, decisions and counts, never message text. The hands-on two-phone run is `docs/DEMO-TWO-PHONES.md`.
- Learning numbers come from the synthetic sandbox city, labelled simulated, not from real people.
- Not built: voice, an edit screen in the interview, push or email notifications (only the in-page live badge), deal-room screens for created apps (their deals run through the API and the
  status page), real accounts, OAuth for the connector, notifications.

## Manual checks only the owner can do (before recording)

1. **Real Muse and custom connectors** (`docs/PLAN.md` §2d, about 10 minutes): in the Muse app, Settings → Connectors → is there
   "Add custom connector" and does it take a URL? Try a public MCP server (`https://mcp.deepwiki.com/mcp`) and a public API
   with no key; note what Muse says.
2. **QR in Muse:** point the phone camera at a QR code with a link; does it offer the Muse app or only the browser?
3. **Our connector in Muse** (`docs/MUSE-CONNECTOR.md`): make a key on a real status page, ask Muse to build a custom connector
   from `https://agentwitch.com/agora/api/muse/openapi.json` with the key, then ask "what is waiting for me?". If Muse has an
   MCP setting, try `https://agentwitch.com/agora/api/muse/{app}/mcp` with the key. Record what happened either way.
4. **Muse cannot answer a card:** with that connector, ask Muse to approve a waiting card; the card must still be waiting.
5. **Deployment:** the checklist in `docs/DEPLOY.md` ("Before going live"): QR opens the real address over HTTPS, an app survives a
   redeploy (needs `DATABASE_URL` or `AGORA_STATE_FILE`), cookies work on two phones.
6. **Interview wording:** run `/start` once and read the draft; fix wording that is odd before recording.
7. **Muse reads `/start`** (added after the first real try, `docs/PLAN.md` §2c-bis): scan the QR with the phone camera and also try
   pasting `https://agentwitch.com/agora/start` into Muse. Muse should interview the person from the brief on the page (or
   `/start/agent.md`) and give a draft link that opens the summary; the person taps "Build it". **Unverified with a real Muse.** Muse is assumed to have no tappable chips or click action (none found, owner to confirm), so the interview in Muse is typed with numbered examples, and the person agrees ("yes", "ok", "looks good") before getting the link. Check that a care answer typed in the person's own words shows up verbatim under "Careful about", and that a learn or organise app shows "What your app will do" with no money or handover line.
   If Muse does not follow it, use the phone interview on the page (the tap cards) instead; the result is the same.
8. Region: one guide says Muse is offered only in the US and Canada; check it works for the phone you will film.
