import Link from "next/link";
import { CopyPrompt } from "@/components/CopyPrompt";
import { QrCode } from "@/components/QrCode";
import { startUrl } from "./_composition/public-url";

const pastePrompt = `I want to create an app. Open ${startUrl}/agent.md, read it and follow it: interview me here in the chat, one question at a time, then give me the link it asks for.`;

export default function Home() {
  return (
    <section className="qr-home" aria-labelledby="scan-title">
      <h1 id="scan-title">Scan to make an app</h1>
      <p className="lead muted">Point your phone at the code. Muse or Meta AI will ask you a few questions about your app, and you answer by typing.</p>
      <div className="qr-frame">
        <QrCode text={startUrl} label={`QR code that opens ${startUrl}`} />
      </div>
      <p className="small muted qr-url">Or open <a href={startUrl}>{startUrl}</a></p>
      <h2 className="small">QR code not working? Copy this into Muse or Meta AI</h2>
      <CopyPrompt text={pastePrompt} />
      <p className="small muted">Assistant reading this page: the person wants to create an app. Your instructions are at <a href={`${startUrl}/agent.md`}>{startUrl}/agent.md</a>.</p>
      <p className="small muted"><Link href="/demo">Try the kids&apos; gear demo instead</Link></p>
    </section>
  );
}
