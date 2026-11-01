import type { ReactNode } from "react";
import { CopyPrompt } from "./CopyPrompt";
import { QrCode } from "./QrCode";

/**
 * "QR or prompt": one link, offered two ways. A person with a phone scans the code; a person with a chat window (their own Muse or
 * another assistant) copies the prompt, which carries the same link plus one line saying what to do with it. Use this wherever a
 * person has to hand something over to another device or to their bot: signing in somewhere else, connecting a bot, joining an app.
 * The `url` must carry no standing secret: it is shown on a screen and may be photographed, so whatever it opens must still ask
 * the person for their own tap.
 */
export function QrOrPrompt({ url, prompt, label, scanHint = "Scan with the phone where you are signed in.", promptHint = "Or copy this message and paste it into your assistant's chat.", children }: {
  url: string;
  /** The text to paste into a chat. Must include `url`. */
  prompt: string;
  /** What the QR code opens, for screen readers. */
  label: string;
  scanHint?: string;
  promptHint?: string;
  /** Extra content under both, such as the check digits. */
  children?: ReactNode;
}) {
  return (
    <div className="qr-or-prompt">
      <figure className="qr-card">
        <div className="qr-frame">
          <QrCode text={url} label={label} />
        </div>
        <figcaption className="small muted">{scanHint}</figcaption>
      </figure>
      <div className="qr-or-prompt-alt">
        <p className="small muted">{promptHint}</p>
        <CopyPrompt text={prompt} />
      </div>
      {children}
    </div>
  );
}
