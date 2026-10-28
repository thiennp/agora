import Link from "next/link";
import { QrCode } from "@/components/QrCode";
import { startUrl } from "./_composition/public-url";

export default function Home() {
  return (
    <section className="qr-home" aria-labelledby="scan-title">
      <h1 id="scan-title">Scan to make an app</h1>
      <p className="lead muted">Point your phone at the code. Muse will ask a few questions about what your community does together, and you only tap your answers.</p>
      <div className="qr-frame">
        <QrCode text={startUrl} label={`QR code that opens ${startUrl}`} />
      </div>
      <p className="small muted qr-url">Or open <a href={startUrl}>{startUrl}</a></p>
      <p className="small muted"><Link href="/demo">Try the kids&apos; gear demo instead</Link></p>
    </section>
  );
}
