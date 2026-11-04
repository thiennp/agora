import { notFound } from "next/navigation";
import { ConnectWithCode } from "@/components/ConnectWithCode";
import { appSummaryById } from "@/app/_composition/app-views";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false }, referrer: "no-referrer" };

/** `/app/{app}/connect/{code}`: the short link in the connect message. Same page as `?code=…`: a Connect button and the `connect_assistant` WebMCP tool. */
export default async function ConnectCodePage({ params }: { params: Promise<{ app: string; code: string }> }) {
  const { app: id, code } = await params;
  const app = await appSummaryById(id);
  if (!app) notFound();
  return (
    <div className="stack-lg">
      <div>
        <p className="small muted">Connect your assistant</p>
        <h1>{app.name}</h1>
      </div>
      <ConnectWithCode appId={app.id} appName={app.name} code={decodeURIComponent(code).slice(0, 64)} />
    </div>
  );
}
