import { ActionButton } from "@/components/ActionButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ItemForm } from "@/components/ItemForm";
import { PhotoIntake } from "@/components/PhotoIntake";
import { OwnerShell } from "@/components/OwnerShell";
import { StartDealButton } from "@/components/StartDealButton";
import { Unavailable } from "@/components/Unavailable";
import { getPlatform } from "@/app/_composition/platform";
import { asKey, itemsView, ownerView } from "@/app/_composition/views";

export const dynamic = "force-dynamic";

const TONE: Record<string, "neutral" | "accent" | "warn" | "info"> = { listed: "info", in_deal: "accent", reserved: "accent", draft: "neutral" };

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const as = asKey((await searchParams).as);
  let owner, view;
  try {
    const p = await getPlatform();
    owner = await ownerView(p, as);
    view = await itemsView(p, as);
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
  return (
    <OwnerShell name={owner.persona.name} language={owner.persona.language} pending={owner.pending} as={as}>
      <h2>Your items</h2>
      {view.items.length === 0 ? <Card><p className="muted">Nothing listed yet. Add what you are giving away or looking for below.</p></Card> : null}
      {view.items.map((i) => (
        <Card key={i.id} as="article">
          <div className="row between">
            <div className="row" style={{ flexWrap: "nowrap" }}>
              {i.crop ? <img src={i.crop} alt={i.text} width={56} height={56} style={{ objectFit: "cover", borderRadius: 8, flex: "none" }} /> : null}
              <h3>{i.kind === "offer" ? "Giving" : "Looking for"}: {i.text}</h3>
            </div>
            <Badge tone={TONE[i.status] ?? "neutral"}>{i.status.replace(/_/g, " ")}</Badge>
          </div>
          {i.condition ? <p className="muted small">Condition: {i.condition}</p> : null}
          {i.flags.map((f) => <p key={f} className="small">Note: {f}</p>)}
          {i.kind === "want" && i.status === "listed" ? (
            i.matches.length ? (
              <div className="stack">
                <p className="small" style={{ fontWeight: 600 }}>Your agent found:</p>
                {i.matches.map((m) => (
                  <div key={m.offerItemId} className="row between">
                    <span>{m.text} <span className="muted small">· {m.reason}</span></span>
                    <StartDealButton as={as} wantItemId={i.id} offerItemId={m.offerItemId} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">{i.emptyReason ?? "No match yet. Your agent keeps looking."}</p>
            )
          ) : null}
          {i.status === "listed" ? <ActionButton url={`/api/items/${i.id}/withdraw`} body={{ as }} variant="ghost" confirmText="Take this off the list?">Take it off the list</ActionButton> : null}
        </Card>
      ))}
      <Card title="Give things away from a photo">
        <PhotoIntake as={as} options={view.options} />
      </Card>
      <Card title="Add an item">
        <ItemForm as={as} options={view.options} />
      </Card>
    </OwnerShell>
  );
}
