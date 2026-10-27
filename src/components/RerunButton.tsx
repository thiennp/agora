"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./Button";
import { postJson } from "./post";

/** Runs the simulation again (a few seconds) and reloads the charts from the new files. */
export function RerunButton({ scenario }: { scenario: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await postJson("/api/sim/run", { scenario });
          setBusy(false);
          if (!r.ok) return setError(r.message);
          router.refresh();
        }}
      >
        {busy ? "Running the simulation…" : "Run the simulation again"}
      </Button>
      {error ? <div className="error-text" role="alert">{error}</div> : null}
    </span>
  );
}
