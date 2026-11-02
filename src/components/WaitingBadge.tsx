"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The live "your agent needs you" line on every page of a created app. It asks the server every few seconds (only while the page is
 * visible) how many cards wait for this member, and when the number rises it re-reads the page too, so a question from the other
 * side appears on the phone without a reload. It links to the cards; on the cards page itself the cards are already in view.
 */
export function WaitingBadge({ appId, initial }: { appId: string; initial: number }) {
  const path = usePathname();
  const router = useRouter();
  const [count, setCount] = useState(initial);
  useEffect(() => setCount(initial), [initial]);
  useEffect(() => {
    let last = initial;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`${BASE_PATH}/api/apps/${encodeURIComponent(appId)}/waiting`, { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { total: number };
        if (stop) return;
        setCount(d.total);
        if (d.total !== last) router.refresh();
        last = d.total;
      } catch {
        // The badge is a convenience; the pages work without it.
      }
    };
    const t = setInterval(() => void tick(), 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [appId, initial, router]);
  const cards = `/app/${appId}/cards`;
  if (!count || path === cards) return null;
  return (
    <div className="card prominent" role="status" aria-live="polite" style={{ padding: 12, marginBottom: 16 }}>
      <div className="row between">
        <strong>{count === 1 ? "Your agent has a question for you." : `Your agent has ${count} things for you.`}</strong>
        <Link className="btn primary" href={cards}>Answer</Link>
      </div>
    </div>
  );
}
