import { notFound } from "next/navigation";
import { ConnectWithCode } from "@/components/ConnectWithCode";
import { appSummaryById } from "@/app/_composition/app-views";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false }, referrer: "no-referrer" };

/** `/app/{app}/connect/{code}` (this form, `?code=…`, still works`: the link in the connect message. A real page with a Connect button (and the `connect_assistant` WebMCP tool). */
export default async function ConnectPage({ params, searchParams }: { params: Promise<{ app: string }>; searchParams: Promise<{ code?: string }> }) {
  const id = (await params).app;
  const app = await appSummaryById(id);
  if (!app) notFound();
  const code = (await searchParams).code ?? "";
  return (
    <div className="stack-lg">
      <div>
        <p className="small muted">Connect your assistant</p>
        <h1>{app.name}</h1>
      </div>
      <ConnectWithCode appId={app.id} appName={app.name} code={code.slice(0, 64)} />
    </div>
  );
}
