import { notFound } from "next/navigation";
import { Banner, Card } from "@/components/Card";
import { appSummaryById } from "@/app/_composition/app-views";

export const dynamic = "force-dynamic";

/** `/app/{app}` (served at `/agora/app/{app}`): the app's public page. The overview, invite QR and member views are docs/PLAN.md §2c steps 4 and 5. */
export default async function AppPage({ params }: { params: Promise<{ app: string }> }) {
  const app = await appSummaryById((await params).app);
  if (!app) notFound();
  return (
    <div className="stack-lg">
      <Card title={app.name}>
        <p>{app.tagline}</p>
        <p>
          For {app.participant}s around {app.region}.
        </p>
        <Banner tone="info">The overview and the invite for this app are not built yet.</Banner>
      </Card>
    </div>
  );
}
