"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import { ActionButton } from "./ActionButton";

type Card =
  | { empty: true }
  | {
      empty: false;
      mode: string;
      state: string;
      reason: string;
      window?: { from: string; to: string };
      checklist: string[];
      approvedByYou: boolean;
      approvedByOther: boolean;
      place?: string;
      dropPoint?: { id: string; name: string };
      outcome?: { ok: boolean; reason?: string };
    };

const MODE: Record<string, string> = { pickup: "Meet in person", locker: "Parcel locker", parcel_shop: "Parcel shop", shipping: "Shipping" };
const fmt = (w?: { from: string; to: string }) => (w ? `${new Date(w.from).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} to ${new Date(w.to).toLocaleTimeString([], { timeStyle: "short" })}` : null);

/** How the item changes hands. Empty until both owners confirm; the exact meeting place appears only after both agree. */
export function HandoffPanel({ dealId, as, card, role, dropPoints }: { dealId: string; as: "a" | "b"; card: Card; role: string; dropPoints: { id: string; name: string }[] }) {
  const [place, setPlace] = useState("");
  const [why, setWhy] = useState("no_show");
  const url = `/api/deals/${dealId}/handoff`;
  if (card.empty) return <p className="muted">The handover plan opens when both families have confirmed the deal.</p>;
  const done = card.state === "completed" || card.state === "not_completed";
  return (
    <div className="stack">
      <div className="row">
        <Badge tone="accent">{MODE[card.mode] ?? card.mode}</Badge>
        <Badge tone={card.state === "approved" ? "accent" : done ? (card.outcome?.ok ? "accent" : "warn") : "info"}>{card.state === "proposed" ? "Waiting for both to agree" : card.state === "approved" ? "Agreed" : card.state === "completed" ? "Done" : "Did not happen"}</Badge>
      </div>
      <p className="muted small">Suggested because {card.reason}.{fmt(card.window) ? ` Time window: ${fmt(card.window)}.` : ""}</p>
      {card.dropPoint ? <p><strong>Drop point:</strong> {card.dropPoint.name}</p> : null}
      {card.place ? <p><strong>Meeting place:</strong> {card.place}</p> : null}
      <div>
        <h3>Before you meet</h3>
        <ul className="list">{card.checklist.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>
      {card.state === "proposed" ? (
        <div className="stack">
          <div className="row">
            <Badge tone={card.approvedByYou ? "accent" : "neutral"}>{card.approvedByYou ? "You agreed" : "You have not agreed yet"}</Badge>
            <Badge tone={card.approvedByOther ? "accent" : "neutral"}>{card.approvedByOther ? "The other family agreed" : "The other family has not agreed yet"}</Badge>
          </div>
          {card.mode === "pickup" && role === "giving" ? (
            <div className="stack">
              <label htmlFor="place">Where would you like to meet? (shown to them only after you both agree)</label>
              <input id="place" type="text" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="For example: the bench outside the library" />
              <ActionButton url={url} body={{ as, action: "place", value: place }} done={() => setPlace("")}>Save the meeting place</ActionButton>
            </div>
          ) : null}
          {card.mode === "locker" || card.mode === "parcel_shop" ? (
            <div className="row">
              {dropPoints.map((d) => <ActionButton key={d.id} url={url} body={{ as, action: "drop", value: d.id }}>{`Use ${d.name}`}</ActionButton>)}
            </div>
          ) : null}
          {!card.approvedByYou ? <ActionButton url={url} body={{ as, action: "approve" }} variant="primary">Agree to this way of handing over</ActionButton> : null}
        </div>
      ) : null}
      {card.state === "approved" ? (
        <div className="stack">
          <div className="row">
            <ActionButton url={url} body={{ as, action: "outcome", ok: true }} variant="primary">It was handed over</ActionButton>
          </div>
          <div className="row">
            <select aria-label="Why it did not happen" value={why} onChange={(e) => setWhy(e.target.value)} style={{ maxWidth: 260 }}>
              <option value="no_show">Someone did not show up</option>
              <option value="item_mismatch">The item did not match</option>
              <option value="changed_mind">Changed our minds</option>
              <option value="other">Something else</option>
            </select>
            <ActionButton url={url} body={{ as, action: "outcome", ok: false, reason: why }}>It did not happen</ActionButton>
          </div>
        </div>
      ) : null}
      {done ? <p className={card.outcome?.ok ? "ok-text" : "error-text"}>{card.outcome?.ok ? "The item changed hands. Thank you for passing it on." : "The handover did not happen; the item is back on the list."}</p> : null}
    </div>
  );
}
