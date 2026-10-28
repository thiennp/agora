import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { OwnerShell } from "@/components/OwnerShell";
import { Unavailable } from "@/components/Unavailable";
import { dealList, ownerView } from "@/app/_composition/views";
import type { Platform } from "@/app/_composition/platform";
import { hrefIn, type Scope } from "@/components/scope";

const TONE: Record<string, "neutral" | "accent" | "warn" | "bad" | "info"> = { confirmed: "accent", handoff: "accent", completed: "accent", declined: "bad", reported: "bad", expired: "warn", not_completed: "warn", awaiting_owner_input: "info", awaiting_owners: "info" };

/** A person's deals: the demo's (`/deals`) and a created app's (`/app/{app}/deals`) are this one body. */
export async function DealsBody({ platform: p, scope }: { platform: Platform; scope: Scope }) {
  const as = scope.as;
  const w = scope.words;
  let owner, deals;
  try {
    owner = await ownerView(p, as);
    deals = await dealList(p, as);
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
  return (
    <OwnerShell name={owner.persona.name} language={owner.persona.language} pending={owner.pending} scope={scope}>
      <h2>{w.dealsTitle ?? "Your deals"}</h2>
      {deals.length === 0 ? (
        scope.app ? (
          <Card><p className="muted">{w.dealsEmpty}</p><Link className="btn primary" href={hrefIn(scope, "/items")}>{w.itemsTitle}</Link></Card>
        ) : (
          <Card><p className="muted">No deals yet.</p><ActionButton url="/api/demo/reset" body={{}} variant="primary">Start the demo scenario</ActionButton></Card>
        )
      ) : null}
      {deals.map((d) => (
        <Card key={d.id} as="article">
          <div className="row between">
            <h3>{d.item}</h3>
            <Badge tone={TONE[d.state] ?? "neutral"}>{d.state.replace(/_/g, " ")}</Badge>
          </div>
          <p>{d.summary}</p>
          {scope.app && w.style === "board" ? null : <p className="muted small">You are {d.role} this item.</p>}
          <Link className="btn primary" href={hrefIn(scope, `/deals/${d.id}`)}>{w.openRoom ?? "Open the deal room"}</Link>
        </Card>
      ))}
    </OwnerShell>
  );
}
