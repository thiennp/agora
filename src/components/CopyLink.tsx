"use client";

import { useState } from "react";
import { Button } from "./Button";

/** Copies the share link, or shares it with the phone's own share sheet when there is one. */
export function CopyLink({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function act() {
    try {
      if (typeof navigator.share === "function") await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      setState("copied");
    } catch (e) {
      // Closing the share sheet is not an error.
      setState((e as Error).name === "AbortError" ? "idle" : "failed");
    }
  }
  return (
    <div className="stack">
      <Button variant="primary" onClick={act}>{state === "copied" ? "Done" : "Share the link"}</Button>
      {state === "failed" ? <p className="small error-text" role="alert">Could not copy. Select the link above and copy it by hand.</p> : null}
    </div>
  );
}
