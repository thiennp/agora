import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { OwnerShell } from "@/components/OwnerShell";
import { Unavailable } from "@/components/Unavailable";
import { getPlatform } from "@/app/_composition/platform";
import { asKey, dealList, ownerView } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const TONE: Record<string, "neutral" | "accent" | "warn" | "bad" | "info"> = { confirmed: "accent", handoff: "accent", completed: "accent", declined: "bad", reported: "bad", expired: "warn", not_completed: "warn", awaiting_owner_input: "info", awaiting_owners: "info" };

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const as = asKey((await searchParams).as);
  let owner, deals;
  try {
    const p = await getPlatform();
    owner = await ownerView(p, as);
    deals = await dealList(p, as);
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
  return (
    <OwnerShell name={owner.persona.name} language={owner.persona.language} pending={owner.pending} as={as}>
      <h2>Your deals</h2>
      {deals.length === 0 ? (
        <Card><p className="muted">No deals yet.</p><ActionButton url="/api/demo/reset" body={{}} variant="primary">Start the demo scenario</ActionButton></Card>
      ) : null}
      {deals.map((d) => (
        <Card key={d.id} as="article">
          <div className="row between">
            <h3>{d.item}</h3>
            <Badge tone={TONE[d.state] ?? "neutral"}>{d.state.replace(/_/g, " ")}</Badge>
          </div>
          <p>{d.summary}</p>
          <p className="muted small">You are {d.role} this item.</p>
          <Link className="btn primary" href={`/deals/${d.id}?as=${as}`}>Open the deal room</Link>
        </Card>
      ))}
    </OwnerShell>
  );
}
