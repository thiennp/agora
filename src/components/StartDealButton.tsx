"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./Button";
import { useScope } from "./ScopeContext";

/** Ask my agent to open a deal on this match, then go to the deal room. */
export function StartDealButton({ as, wantItemId, offerItemId, label, busyLabel }: { as: "a" | "b"; wantItemId: string; offerItemId: string; label?: string; busyLabel?: string }) {
  const router = useRouter();
  const { post, href } = useScope();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <Button
        variant="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await post<{ dealId: string }>("/api/matches/start", { as, wantItemId, offerItemId });
          if (!r.ok) {
            setBusy(false);
            return setError(r.message);
          }
          router.push(href(`/deals/${r.data.dealId}`));
        }}
      >
        {busy ? (busyLabel ?? "Your agent is on it…") : (label ?? "Ask my agent to propose this")}
      </Button>
      {error ? <div className="error-text" role="alert">{error}</div> : null}
    </span>
  );
}
