"use client";
import { useState } from "react";

import { Icon } from "@/components/ui/icons";

/** The text to paste into Muse or Meta AI when the QR code does not work, with a copy button; the text stays selectable if the clipboard is blocked. */
export function CopyPrompt({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  };
  return (
    <div className="copy-prompt">
      <textarea readOnly value={text} rows={3} aria-label="Text to paste into your assistant" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn" onClick={copy} aria-live="polite">
        <Icon name={state === "copied" ? "check" : "copy"} size={18} />
        {state === "copied" ? "Copied" : "Copy"}
      </button>
      {state === "failed" ? <p className="small muted" role="status">Copy did not work here: select the text above and copy it yourself.</p> : null}
    </div>
  );
}
