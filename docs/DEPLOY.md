# Deploying the demo

Agora is one Next.js app and needs a long-running Node host (Railway, a container, a VM). Demo mode keeps state in
memory, so serverless hosting that spins up fresh instances per request will reset the scenario between clicks. Run a
single instance.

```
npm ci
npm run build
npm start          # listens on $PORT
```

Set `AGORA_MODE=demo` (the demo is demo-only; `live` answers 501).

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
