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
