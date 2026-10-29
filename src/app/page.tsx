import Link from "next/link";
import { CopyPrompt } from "@/components/CopyPrompt";
import { QrCode } from "@/components/QrCode";
import { startUrl } from "./_composition/public-url";

/**
 * What a person pastes into Muse or Meta AI when the code does not scan. It names the goal, points at the brief, repeats the two
 * rules an assistant most often skips (one question at a time; the person builds, not the assistant) and says what to do if the
 * assistant cannot open links. The brief itself (`/start/agent.md`) stays the single source of the interview.
 */
const pastePrompt = `I want to create an app on Agora. Open ${startUrl}/agent.md and follow the instructions there exactly. Interview me here in this chat, one short question at a time, in plain language. When we are done, give me the link described there so I can review my answers and build the app myself. If you cannot open the link, tell me.`;

/**
 * The home page: one QR code that opens `/start`. On a laptop the code is the whole point; on a phone the link under it is.
 * Below the fold, the copy-and-paste fallback for an assistant without a camera, and one line for an assistant reading the HTML.
 */
export default function Home() {
  return (
    <div className="qr-home">
      <section className="qr-hero" aria-labelledby="scan-title">
        <div className="qr-copy">
          <h1 id="scan-title">Scan to create an app</h1>
          <p className="lead">Point your phone at the code. Muse or Meta AI will ask you a few questions and create the app with you.</p>
          <ol className="qr-steps" aria-label="How it works">
            <li>Scan the code with your phone.</li>
            <li>Answer a few questions about your app.</li>
            <li>Review the summary and tap Build it. Your app is ready to share.</li>
          </ol>
        </div>
        <figure className="qr-card">
          <div className="qr-frame">
            <QrCode text={startUrl} label={`QR code that opens ${startUrl}`} />
          </div>
          <figcaption className="qr-url small">
            <span className="muted">Or open </span>
            <a href={startUrl}>{startUrl}</a>
          </figcaption>
        </figure>
      </section>

      <section className="qr-fallback" aria-labelledby="fallback-title">
        <div className="qr-fallback-copy">
          <h2 id="fallback-title">If the code does not scan</h2>
          <p className="muted">Copy this message and paste it into Muse or Meta AI. It starts the same conversation there.</p>
        </div>
        <CopyPrompt text={pastePrompt} />
      </section>

      <div className="qr-notes small muted">
        <p>
          For AI assistants: the person sharing this page wants to create an app. Read and follow the instructions at{" "}
          <a href={`${startUrl}/agent.md`}>{startUrl}/agent.md</a>.
        </p>
        <p>
          <Link href="/demo">Or explore the kids&apos; gear demo</Link>
        </p>
      </div>
    </div>
  );
}
