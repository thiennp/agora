"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { useScope } from "./ScopeContext";

/** One button that posts to the API, shows what went wrong in words, and refreshes the page on success. */
export function ActionButton({ url, body, children, variant = "default", done, confirmText }: { url: string; body: unknown; children: ReactNode; variant?: "default" | "primary" | "danger" | "ghost"; done?: () => void; confirmText?: string }) {
  const router = useRouter();
  const { post } = useScope();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <Button
        variant={variant}
        disabled={busy}
        onClick={async () => {
          if (confirmText && !window.confirm(confirmText)) return;
          setBusy(true);
          setError(null);
          const r = await post(url, body);
          setBusy(false);
          if (!r.ok) return setError(r.message);
          done?.();
          router.refresh();
        }}
      >
        {busy ? "Working…" : children}
      </Button>
      {error ? <div className="error-text" role="alert">{error}</div> : null}
    </span>
  );
}
