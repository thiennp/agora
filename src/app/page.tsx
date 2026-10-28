import { headers } from "next/headers";
import Link from "next/link";
import { QrCode } from "@/components/QrCode";
import { publicBaseUrl } from "./_composition/public-url";

// The address depends on the request (or AGORA_PUBLIC_URL), so this page is rendered per request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const h = await headers();
  const base = publicBaseUrl({
    configured: process.env.AGORA_PUBLIC_URL,
    host: h.get("x-forwarded-host") ?? h.get("host"),
    forwardedProto: h.get("x-forwarded-proto"),
    basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  });
  const startUrl = `${base}/start`;
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
