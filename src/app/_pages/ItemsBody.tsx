import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ItemForm } from "@/components/ItemForm";
import { PhotoIntake } from "@/components/PhotoIntake";
import { OwnerShell } from "@/components/OwnerShell";
import { StartDealButton } from "@/components/StartDealButton";
import { Unavailable } from "@/components/Unavailable";
import { itemsView, ownerView } from "@/app/_composition/views";
import type { Platform } from "@/app/_composition/platform";
import { hrefIn, type Scope } from "@/components/scope";

const TONE: Record<string, "neutral" | "accent" | "warn" | "info"> = { listed: "info", in_deal: "accent", reserved: "accent", draft: "neutral" };

/** The items page for one person: the demo's (`/items`) and a created app's (`/app/{app}/items`) are this one body, in different scopes. */
export async function ItemsBody({ platform: p, scope }: { platform: Platform; scope: Scope }) {
  const as = scope.as;
  const w = scope.words;
  let owner, view;
  try {
    owner = await ownerView(p, as);
    view = await itemsView(p, as);
  } catch (e) {
    return <Unavailable message={(e as Error).message} />;
  }
  return (
    <OwnerShell name={owner.persona.name} language={owner.persona.language} pending={owner.pending} scope={scope}>
      <h2>{w.itemsTitle ?? "Your items"}</h2>
      {view.items.length === 0 ? <Card><p className="muted">{w.itemsEmpty ?? "Nothing listed yet. Add what you are giving away or looking for below."}</p></Card> : null}
      {view.items.map((i) => (
        <Card key={i.id} as="article">
          <div className="row between">
            <div className="row" style={{ flexWrap: "nowrap" }}>
              {i.crop ? <img src={i.crop} alt={i.text} width={56} height={56} style={{ objectFit: "cover", borderRadius: 8, flex: "none" }} /> : null}
              <h3>{i.kind === "offer" ? (w.offer ?? "Giving") : (w.want ?? "Looking for")}: {i.text}</h3>
            </div>
            <Badge tone={TONE[i.status] ?? "neutral"}>{i.status.replace(/_/g, " ")}</Badge>
          </div>
          {i.condition && (w.askCondition ?? true) ? <p className="muted small">Condition: {i.condition}</p> : null}
          {i.flags.map((f) => <p key={f} className="small">Note: {f}</p>)}
          {i.kind === "want" && i.status === "listed" ? (
            i.matches.length ? (
              <div className="stack">
                <p className="small" style={{ fontWeight: 600 }}>{w.found ?? "Your agent found:"}</p>
                {i.matches.map((m) => (
                  <div key={m.offerItemId} className="row between">
                    <span>{m.text} <span className="muted small">· {m.reason}</span></span>
                    <StartDealButton as={as} wantItemId={i.id} offerItemId={m.offerItemId} label={w.startMatch} busyLabel={w.matchBusy} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">{w.style === "board" ? w.foundNone : (i.emptyReason ?? "No match yet. Your agent keeps looking.")}</p>
            )
          ) : null}
          {i.status === "listed" ? <ActionButton url={`/api/items/${i.id}/withdraw`} body={{ as }} variant="ghost" confirmText="Take this off the list?">Take it off the list</ActionButton> : null}
        </Card>
      ))}
      {scope.app ? null : (
        <Card title="Give things away from a photo">
          <PhotoIntake as={as} options={view.options} />
        </Card>
      )}
      {w.style === "board" && view.items.some((i) => i.kind === "offer" && i.status === "listed") ? (
        <p className="muted small">When another person&apos;s agent finds your offer, you get a card in <Link href={hrefIn(scope, "/cards")}>Cards</Link> before anything is agreed.</p>
      ) : null}
      <Card title={w.addTitle ?? "Add an item"}>
        <ItemForm as={as} options={view.options} />
      </Card>
    </OwnerShell>
  );
}
