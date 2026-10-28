"use client";

import { useState } from "react";
import { Button } from "./Button";
import { postJson } from "./post";

type KeyInfo = { keyId: string; label: string; createdAt: string; revoked: boolean };
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * "Connect your own Muse" (BR-44, docs/MUSE-CONNECTOR.md). Makes a read-only key for this member, shows it once, and revokes keys.
 * A key can only read this page's information; it can never answer a card.
 */
export function MuseKeyPanel({ appId, initial }: { appId: string; initial: KeyInfo[] }) {
  const [keys, setKeys] = useState(initial);
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/apps/${encodeURIComponent(appId)}/muse-key`;
  const active = keys.filter((k) => !k.revoked);

  async function refresh() {
    const res = await fetch(`${BASE_PATH}${base}`).then((r) => r.json()).catch(() => null);
    if (res?.keys) setKeys(res.keys);
  }
  async function make() {
    setError(null);
    const r = await postJson<{ key: string }>(base, { label: "My Muse" });
    if (!r.ok) return setError(r.message);
    setFresh(r.data.key);
    await refresh();
  }
  async function revoke(keyId: string) {
    setError(null);
    const r = await postJson(`${base}/revoke`, { keyId });
    if (!r.ok) return setError(r.message);
    setFresh(null);
    await refresh();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(fresh ?? "");
    } catch {
      setError("Could not copy. Select the key and copy it by hand.");
    }
  }

  return (
    <div className="stack">
      <p className="small muted">A key lets your own Muse read this page for you. It is read only: it can never answer a card or decide anything. It is shown once; if you lose it, revoke it and make a new one.</p>
      {fresh ? (
        <div className="stack">
          <p className="small"><strong>Your key (shown once):</strong></p>
          <code style={{ wordBreak: "break-all" }}>{fresh}</code>
          <Button onClick={copy}>Copy key</Button>
        </div>
      ) : null}
      <ul className="list">
        {active.map((k) => (
          <li key={k.keyId}>{k.label || "Key"} <span className="small muted">· made {k.createdAt.slice(0, 10)}</span> <Button onClick={() => revoke(k.keyId)}>Revoke</Button></li>
        ))}
      </ul>
      {active.length < 3 ? <Button onClick={make}>Make a key for my Muse</Button> : <p className="small muted">Three keys is the most. Revoke one to make another.</p>}
      {error ? <p className="small error-text" role="alert">{error}</p> : null}
    </div>
  );
}
