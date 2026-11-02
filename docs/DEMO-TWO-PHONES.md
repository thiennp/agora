# Two-phone demo scenario: "it did the work for me"

Companion to `docs/DEMO-SCRIPT.md` (the 3:00 film script). This is the hands-on run with **two phones** that shows the
app is useful: one person lists things from a photo, the other person's agent finds a fit, reaches out, negotiates, and
both owners are only interrupted for the decisions that matter. Written Nov 2, 2026 for the Nov 4 build end.

## What the judge should take away

1. **The agent does the work.** Listing from one photo, finding the fit and explaining it, talking to the other agent.
2. **The person is only asked what matters.** A card arrives on the phone the moment the other agent needs an answer.
3. **Nothing is hidden.** "What your agent did alone" is a plain-words log of every step, and the person's own Muse can read it.
4. **Nobody is committed by a bot.** The deal is final only when both people tap confirm.

## Setup (the evening before)

| What | How |
|---|---|
| Site | The live site at `https://agentwitch.com/agora` with `META_API_KEY`, `FIELD_ENCRYPTION_SECRET`, `REPORT_EXPORT_SECRET` and `AGORA_STATE_FILE` or `DATABASE_URL` set (`docs/DEPLOY.md`, "Before going live"). Local fallback: `npm run dev` and both phones on the laptop's Wi-Fi address; cookies work over plain HTTP on a LAN address. |
| Phone 1 | The creator. Signed in to Muse (for the Muse shots), camera working. Call them **Sam**. |
| Phone 2 | A friend. Any browser. Call them **Noor**. |
| Laptop | The home page open at 0:00; the judge dashboard open in a second tab for the close. Mirror both phones to the screen if the venue allows (QuickTime on a Mac for iPhones, or film them). |
| Props | Three or four real second-hand kids' items (a jacket, a pair of shoes, a toy, a stroller cover) laid out apart on a plain floor in good light. No people or papers in the frame. |
| Rehearsal | Run the whole thing three times. Record each run as the fallback clip. After each run the app state has the old items: create a new app each run (it takes a minute) rather than reuse one. |

## The run (about 4 minutes)

### 1. Sam creates the app (Phone 1, 0:00–1:00)

- On the laptop, show the home page. Sam copies the prompt into Muse on Phone 1 and sends it.
- Muse interviews Sam: *what the app is for* ("parents in our building pass on outgrown kids' gear"), *what a person can do*,
  *how it works*, *what it must never do*, *name* ("Outgrown"), *feel*. Sam types "yes".
- Muse gives three things: the public link, the admin link and the recovery code. Sam opens the public link.
- **Say:** "No code, no form. The app is data: a validated config the platform now serves."
- **Fallback:** Muse does not follow the brief, or the venue has no Meta AI. Open `/start` on the laptop and tap through the
  six cards. Same result. Say so plainly.

### 2. Sam lists things from one photo (Phone 1, 1:00–1:45)

- Sam taps **Items** then **List several things from one photo**, takes one photo of the items on the floor.
- Muse Spark names each item, SAM 3.1 cuts a picture of each. Sam checks the drafts (name, kind, size, condition), unticks one
  if it is wrong, taps **List 3 items**.
- The log on **My agent** now says: "Listed what you offer: Winter jacket" and so on.
- **Say:** "The photo itself is gone; only the item pictures are kept. One tap listed three things."
- **Fallback:** the model is slow or misreads. Fix the names by hand on the draft cards (that is the point of the check step).
  If intake fails outright, add two items with the form; it takes thirty seconds.

### 3. Noor joins and needs something (Phone 2, 1:45–2:15)

- Sam shares the link (AirDrop, or Noor types it). Noor opens it, sees the public page, taps **Use this app**, types a name.
  The recovery-code notice appears. **Say:** "Light identity: no sign-up, no password; the code is the only way back in."
- Noor taps **Items**, adds a **Looking for**: clothing, size 68.
- The matcher shows the jacket under "Your agent found:" with the reason (same category, size fits, nearby). The log says
  "Found 1 fit for clothing · size 68 and showed you why".
- Noor taps **Ask my agent to propose this**.

### 4. The agents talk; Sam's phone lights up (both phones, 2:15–3:00)

- Within a few seconds, Phone 1 shows the live line **"Your agent has a question for you. Answer"** on whatever page it is on
  (the badge polls every four seconds). **Say:** "The two agents negotiated; Sam's agent would not decide terms alone."
- Sam taps **Answer**, reads the card (in Sam's language), taps **Yes**. Optionally ticks "remember this for 30 days" and
  **say:** "Standing rules only for low-risk topics; money, places and personal details always ask."
- Now both phones get a **Confirm this deal?** card. Noor confirms first; Sam's card still waits. **Say:** "Agreement between
  agents is never a commitment. Two taps, two people."
- Sam confirms. The deal room opens on both phones with the handover plan (pickup window; the label is marked "not connected
  yet" if shipping is chosen). Noor types "Can I come Saturday morning?"; it arrives on Phone 1 screened and, if Sam's language
  differs, translated. Type a phone number into the chat to show it being removed before relay.

### 5. What the agent did, and Muse reads it (Phone 1 and Phone 2, 3:00–3:45)

- Noor opens **My agent**. "Waiting on you" is empty; the log reads top to bottom: noted what you need, found 1 fit, reached
  out, agreed terms (not binding) and asked you to confirm, you confirmed, both confirmed and the handover plan opened, removed a
  phone number from a message. The 7-day chart has today's steps.
- **Say:** "Every step, in plain words, decisions and counts only. No message text, no addresses, no one else's id."
- Sam opens **My agent** on Phone 1, taps **Make a key for my Muse**, asks Muse to build a connector from
  `https://agentwitch.com/agora/api/muse/openapi.json`, then asks "what is waiting for me in Outgrown?". Then: "approve it for
  me". Muse cannot: the card waits for Sam's tap. **Say:** "Your own Muse is a window, not the decider."
- **Fallback:** Muse cannot add the connector. Run `curl -H "Authorization: Bearer <key>" .../api/muse/<app>/status` on the
  laptop and say the connector is built and tested but a real Muse was not shown to use it.

### 6. Close (laptop, 3:45–4:00)

- One platform, any community app: kids' gear and garden tools are two more apps on it; a board app (a running club, a help
  board) runs with posts and conversations. Judge dashboard: learning curve from the sandbox city, labelled simulated.

## Things to check the morning of

- Both phones open the site over HTTPS and keep their session after a reload (storage set; `docs/DEPLOY.md` step 5).
- The badge appears on Phone 1 within five seconds of Noor's "Ask my agent" tap (needs the tab in the foreground).
- Photo intake returns drafts for the real props in under 20 seconds; if not, pre-list by form and skip step 2's photo.
- The Muse key flow on a real Muse (owner's manual checks in `docs/DEMO-SCRIPT.md`); if it fails, use the curl fallback and
  never say Muse connected.

## Not shown, say it if asked

Carrier labels are simulated. Translation is real but every member of a created app shares one coarse district and the app's
first language until a location and language step exists. Notifications beyond the in-page badge (push, email) are not built.
Using the app through Muse alone is not built.
