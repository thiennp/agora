"use client";

import { useState } from "react";
import { Badge } from "./Badge";
import { ActionButton } from "./ActionButton";
import { useScope } from "./ScopeContext";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
      addressGiven?: boolean;
      shipment?: { status?: string; appointment?: { where: string; window: { from: string; to: string } }; trackingRef?: string; feeSplit?: { senderPct: number; recipientPct: number; note?: string }; labelText?: string };
    };

const MODE: Record<string, string> = { pickup: "Meet in person", locker: "Parcel locker", parcel_shop: "Parcel shop", shipping: "Shipping" };
const fmt = (w?: { from: string; to: string }) => (w ? `${new Date(w.from).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} to ${new Date(w.to).toLocaleTimeString([], { timeStyle: "short" })}` : null);

/** How the item changes hands. Empty until both owners confirm; the exact meeting place appears only after both agree. */
export function HandoffPanel({ dealId, as, card, role, dropPoints, modes }: { dealId: string; as: "a" | "b"; card: Card; role: string; dropPoints: { id: string; name: string }[]; modes: string[] }) {
  const { other: them } = useScope();
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [other, setOther] = useState("");
  const [why, setWhy] = useState("no_show");
  const url = `/api/deals/${dealId}/handoff`;
  if (card.empty) return <p className="muted">The plan opens when you and {them} have both confirmed.</p>;
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
            <Badge tone={card.approvedByOther ? "accent" : "neutral"}>{card.approvedByOther ? `${cap(them)} agreed` : `${cap(them)} has not agreed yet`}</Badge>
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
          {modes.length > 1 ? (
            <div className="row">
              <select aria-label="Another way to hand over" value={other} onChange={(e) => setOther(e.target.value)} style={{ maxWidth: 240 }}>
                <option value="">Another way to hand over…</option>
                {modes.filter((m) => m !== card.mode).map((m) => <option key={m} value={m}>{MODE[m] ?? m}</option>)}
              </select>
              {other ? <ActionButton url={url} body={{ as, action: "propose", mode: other }} done={() => setOther("")}>Suggest this instead</ActionButton> : null}
            </div>
          ) : null}
          {!card.approvedByYou ? <ActionButton url={url} body={{ as, action: "approve" }} variant="primary">Agree to this way of handing over</ActionButton> : null}
        </div>
      ) : null}
      {card.state === "approved" && card.mode === "shipping" ? (
        <div className="stack">
          <h3>Shipping</h3>
          <p className="muted small">Simulated carrier: labels are watermarked and cost nothing. The platform never handles money; the split below is only what you two agreed.</p>
          {role === "receiving" && !card.addressGiven ? (
            <div className="stack">
              <label htmlFor="addr">Your delivery address (only the sender&apos;s label shows it)</label>
              <input id="addr" type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
              <ActionButton url={url} body={{ as, action: "address", value: address }} done={() => setAddress("")}>Save my address</ActionButton>
            </div>
          ) : null}
          {card.addressGiven ? <p className="small">{role === "receiving" ? "Your address is saved and encrypted." : "The recipient gave an address."}</p> : null}
          {card.shipment?.feeSplit ? (
            <p className="small">Postage split: sender {card.shipment.feeSplit.senderPct}%, recipient {card.shipment.feeSplit.recipientPct}%.</p>
          ) : (
            <div className="row">
              <span className="small">Who pays postage?</span>
              <ActionButton url={url} body={{ as, action: "fee", senderPct: 100 }}>Sender</ActionButton>
              <ActionButton url={url} body={{ as, action: "fee", senderPct: 50 }}>Half and half</ActionButton>
              <ActionButton url={url} body={{ as, action: "fee", senderPct: 0 }}>Recipient</ActionButton>
            </div>
          )}
          {role === "giving" && !card.shipment?.labelText ? <ActionButton url={url} body={{ as, action: "label" }} variant="primary">Make the label and book the drop-off</ActionButton> : null}
          {card.shipment?.appointment ? <p className="small"><strong>Drop-off:</strong> {card.shipment.appointment.where}, {fmt(card.shipment.appointment.window)}</p> : null}
          {card.shipment?.labelText ? <pre className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{card.shipment.labelText}</pre> : null}
          {card.shipment?.trackingRef ? (
            <div className="row">
              <Badge tone="info">{(card.shipment.status ?? "").replace(/_/g, " ")}</Badge>
              <ActionButton url={url} body={{ as, action: "track" }}>Check the carrier</ActionButton>
            </div>
          ) : null}
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
