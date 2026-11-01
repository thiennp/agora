"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Banner, Card } from "./Card";
import { Button } from "./Button";
import { QrOrPrompt } from "./QrOrPrompt";
import { postJson } from "./post";

interface Started { code: string; secret: string; verify: string; expiresAt: string; approveUrl: string }

/**
 * "Sign in on this computer": asks for a pairing, shows it as a QR or a prompt plus four digits to read out, and waits for the person
 * to approve it on a device where they are already signed in. The secret stays in this component's memory, never in a URL, and the
 * session arrives as an HttpOnly cookie when the claim succeeds.
 */
export function PairNewComputer({ appId, appName }: { appId: string; appName: string }) {
  const router = useRouter();
  const [pair, setPair] = useState<Started | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const base = `/api/apps/${encodeURIComponent(appId)}/pair`;
  const live = useRef<Started | null>(null);

  const start = useCallback(async () => {
    setError(null);
    setEnded(false);
    const r = await postJson<Started>(base, {});
    if (!r.ok) return setError(r.message);
    live.current = r.data;
    setPair(r.data);
  }, [base]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (!pair) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const r = await postJson<{ status: string }>(`${base}/claim`, { code: pair.code, secret: pair.secret });
      if (stop) return;
      if (!r.ok && r.code !== "network") return setEnded(true);
      if (r.ok && r.data.status === "approved") return router.replace(`/app/${encodeURIComponent(appId)}`);
      timer = setTimeout(tick, 2000);
    };
    let timer = setTimeout(tick, 2000);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [pair, base, appId, router]);

  if (error) {
    return (
      <Card title={`Sign in to ${appName}`} prominent>
        <Banner tone="bad">{error}</Banner>
        <Button variant="primary" onClick={() => void start()}>Try again</Button>
      </Card>
    );
  }
  if (!pair) return <Card title={`Sign in to ${appName}`} prominent><p aria-live="polite">Getting a sign-in code…</p></Card>;
  if (ended) {
    return (
      <Card title="That request ended" prominent>
        <p>Requests last five minutes and work once.</p>
        <Button variant="primary" onClick={() => void start()}>Start a new one</Button>
      </Card>
    );
  }
  const prompt = `Someone wants to sign in to ${appName} on a new computer. Open ${pair.approveUrl} on the device where you are already signed in, check that it shows the computer you expect, and type these four digits when it asks: ${pair.verify}. Only approve if you started this yourself.`;
  return (
    <Card title={`Sign in to ${appName} on this computer`} prominent>
      <QrOrPrompt url={pair.approveUrl} prompt={prompt} label={`QR code that opens ${pair.approveUrl}`}>
        <div className="stack" style={{ gridColumn: "1 / -1", width: "100%" }}>
          <p className="small muted">Type these four digits on the other device when it asks:</p>
          <p className="verify-digits" aria-label={`Four digits ${pair.verify.split("").join(" ")}`}>{pair.verify}</p>
          <p className="small muted" aria-live="polite">Waiting for you to approve it there. This request ends in five minutes.</p>
          <p className="small muted">Lost every device? Use your recovery code instead.</p>
        </div>
      </QrOrPrompt>
    </Card>
  );
}
