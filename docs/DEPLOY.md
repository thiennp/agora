# Deploying the demo

Agora is one Next.js app and needs a long-running Node host (Railway, a container, a VM). Demo mode keeps state in
memory, so serverless hosting that spins up fresh instances per request will reset the scenario between clicks. Run a
single instance.

```
npm ci
npm run build
npm start          # listens on $PORT
```

Set `AGORA_MODE=mock` (the only accepted values are `mock` and `live`; `live` answers 501).

## Where it is mounted

| Want | Setting |
|---|---|
| Own domain or subdomain (`agora.example.com`) | leave `AGORA_BASE_PATH` empty |
| Sub-path (`example.com/agora`) | `AGORA_BASE_PATH=/agora` |

`AGORA_BASE_PATH` must be set for both `npm run build` and `npm start`. The host that owns the domain only has to
forward `/agora/*` (path unchanged) to this app; no rewrite of the path is needed. The client prefixes its API calls
with the same value (`src/components/post.ts`).

The dashboard writes `reports/simulation/` on first open; the host needs a writable working directory (it is rebuilt
after a redeploy).

## State that must survive a restart

Stored apps, memberships and Muse keys are real data in the Muse-first demo, so a host that loses them loses the demo. Set
`DATABASE_URL` (Postgres: apps in table `apps`, state in `app_state`) or, on a host with a persistent disk, `AGORA_STATE_FILE`.
With neither, everything is memory only: a redeploy deletes every created app and invalidates every phone's session. Keep one
replica: sessions, rate limits and platforms live in the process.

## Before the demo (agentwitch.com/agora)

1. Mount under `/agora` (`AGORA_BASE_PATH=/agora`, set at build and start). The home QR code always opens
   `https://agentwitch.com/agora/start`, so that exact address must serve this app over HTTPS (cookies are `Secure` over HTTPS).
2. Open `https://agentwitch.com/agora/` on a laptop and scan the QR code with a phone; run the interview through to "Build it".
3. Open the invite link on a second phone and join; open the member status page on both.
4. Make a Muse key on the status page and check `curl -H "Authorization: Bearer <key>" https://agentwitch.com/agora/api/muse/<app>/status`.
5. Redeploy once and check the app, the member and the key still work (this proves the storage setting).

## Railway checklist

`railway.json` sets the build, start command, a single replica and a health check.

1. New Railway project from this repo (branch to deploy: your choice). Keep one replica.
2. Variables: `AGORA_MODE=mock` and `AGORA_BASE_PATH=/agora` only if mounted under a sub-path. Railway passes the
   variables to the build too, which is what the base path needs.
3. With a sub-path, set `healthcheckPath` in `railway.json` to `/agora` (the health check requests that exact path).
4. Generate a Railway domain and open `<domain>/<base path>`; check the home page, "Be Mia", the deal room and the
   dashboard.
5. Custom domain: either point a subdomain at the service, or have the main site forward `/agora/*` to the Railway
   domain with the path unchanged.
6. After any change to `AGORA_BASE_PATH`, redeploy (it is baked in at build time).
