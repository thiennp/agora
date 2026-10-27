import type { AppConfig } from "@/lib/app-config";
import { decryptText, encryptText } from "@/lib/crypto";
import type { DealEventBus } from "@/hubs/DealEvents/command";
import type { Deal } from "@/features/negotiation/public-api/types";
import type { CarrierPort } from "../../features/carriers/public-api/types";
import { simulatedDropPoints } from "../../features/carriers/public-api/infrastructure";
import { checklistFor, createPlanStore, proposeMode } from "../../features/handoff/public-api/infrastructure";
import type { Constraints, HandoffMode, Plan, PlanStore, Window } from "../../features/handoff/public-api/types";
import { createShipmentStore, labelBlockers, validateFeeSplit } from "../../features/shipping/public-api/infrastructure";
import type { FeeSplit, Shipment, ShipmentStore } from "../../features/shipping/public-api/types";

export class LogisticsError extends Error {
  constructor(readonly code: "not_found" | "not_a_party" | "wrong_state" | "not_host" | "not_recipient" | "not_allowed" | "invalid" | "blocked", message: string) {
    super(message);
  }
}

/** What logistics needs from negotiation; its service satisfies this. */
export interface LogisticsDeals {
  get(dealId: string): Promise<Deal | null>;
  startHandoff(dealId: string): Promise<Deal>;
  finishHandoff(dealId: string, ok: boolean): Promise<Deal>;
}

export const FAIL_REASONS = ["no_show", "item_mismatch", "changed_mind", "other"] as const;
const MAX_MODE_CHANGES = 3;
const CONFIRMED = ["confirmed", "handoff", "completed", "not_completed"];

type App = Pick<AppConfig, "id" | "policies">;

export type HandoffCard =
  | { empty: true }
  | {
      empty: false;
      mode: HandoffMode;
      state: Plan["state"];
      reason: string;
      window?: Window;
      checklist: string[];
      approvedByYou: boolean;
      approvedByOther: boolean;
      /** Exact meeting place: only after both owners confirmed and agreed the mode, and not to the host's counterpart before then (LOG-03). */
      place?: string;
      dropPoint?: { id: string; name: string };
      addressGiven?: boolean;
      shipment?: { status?: string; appointment?: Shipment["appointment"]; trackingRef?: string; feeSplit?: FeeSplit; labelText?: string };
      outcome?: Plan["outcome"];
    };

export function createLogistics(deps: {
  app: App;
  deals: LogisticsDeals;
  carrier: CarrierPort;
  /** Secret for encrypting exact places and addresses at rest (at least 16 characters). */
  secret: string;
  bus: DealEventBus;
  constraintsOf: (familyId: string) => Constraints;
  dropPointsFor?: (districtCode: string) => { id: string; name: string }[];
  /** Extra safety lines for the checklist, for example from the app's safety rules for the item. */
  adviceFor?: (deal: Deal) => Promise<string[]>;
  plans?: PlanStore;
  shipments?: ShipmentStore;
  now?: () => Date;
  newId?: () => string;
}) {
  if (!deps.secret || deps.secret.length < 16) throw new Error("logistics needs an encryption secret of at least 16 characters");
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const plans = deps.plans ?? createPlanStore();
  const shipments = deps.shipments ?? createShipmentStore();
  const dropPoints = deps.dropPointsFor ?? ((d: string) => simulatedDropPoints(d).map(({ id, name }) => ({ id, name })));
  const pending: Promise<void>[] = [];

  async function load(dealId: string, familyId: string) {
    const deal = await deps.deals.get(dealId);
    if (!deal) throw new LogisticsError("not_found", "deal not found");
    if (familyId !== deal.offerFamilyId && familyId !== deal.wantFamilyId) throw new LogisticsError("not_a_party", "not an owner in this deal");
    const plan = plans.rows.get(dealId);
    return { deal, plan };
  }
  const needPlan = (plan: Plan | undefined): Plan => {
    if (!plan) throw new LogisticsError("wrong_state", "no handover plan yet: both owners must confirm the deal first");
    return plan;
  };
  const other = (deal: Deal, f: string) => (f === deal.offerFamilyId ? deal.wantFamilyId : deal.offerFamilyId);

  async function makePlan(dealId: string) {
    const deal = await deps.deals.get(dealId);
    if (!deal || plans.rows.has(dealId)) return;
    const a = deps.constraintsOf(deal.offerFamilyId);
    const b = deps.constraintsOf(deal.wantFamilyId);
    const proposal = proposeMode(deps.app.policies.handoffModes, a, b);
    const mode = proposal?.mode ?? deps.app.policies.handoffModes[0]!;
    const plan: Plan = {
      dealId, appId: deps.app.id, offerFamilyId: deal.offerFamilyId, wantFamilyId: deal.wantFamilyId, mode, window: proposal?.window,
      reason: proposal?.reason ?? "no way fits both of your limits: please agree one",
      approvals: [], changes: 0, state: "proposed", checklist: checklistFor(mode, await (deps.adviceFor?.(deal) ?? [])), createdAt: now().toISOString(),
    };
    plans.rows.set(dealId, plan);
    deps.bus.publish({ type: "HandoffProposed", dealId, mode });
  }
  // The plan appears when the deal is confirmed by both owners, never before (LOG-02, LOG-03).
  deps.bus.subscribe("DealConfirmed", (e) => void pending.push(makePlan(e.dealId)));

  async function finish(deal: Deal, plan: Plan, ok: boolean, by: string, reason?: string) {
    plan.state = ok ? "completed" : "not_completed";
    plan.outcome = { ok, reason, by, at: now().toISOString() };
    await deps.deals.finishHandoff(deal.id, ok);
    deps.bus.publish({ type: "HandoffFinished", dealId: deal.id, ok });
  }

  const service = {
    /** Wait for plans started by deal events (tests and request handlers call this before reading). */
    async settled() {
      while (pending.length) await pending.shift();
    },

    /** Either owner proposes a different way to hand over; the other must approve it (LOG-01). At most 3 changes. */
    async propose(dealId: string, familyId: string, mode: HandoffMode): Promise<void> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      if (plan.state !== "proposed") throw new LogisticsError("wrong_state", "the way to hand over is already agreed");
      const a = deps.constraintsOf(deal.offerFamilyId);
      const b = deps.constraintsOf(deal.wantFamilyId);
      if (!deps.app.policies.handoffModes.includes(mode) || !(a.allowedModes ?? [mode]).includes(mode) || !(b.allowedModes ?? [mode]).includes(mode)) {
        throw new LogisticsError("not_allowed", `${mode} is not allowed here or by one of the owners`);
      }
      if (plan.changes >= MAX_MODE_CHANGES) throw new LogisticsError("wrong_state", "too many changes: please agree one of the options");
      plan.mode = mode;
      plan.changes += 1;
      plan.approvals = [familyId];
      plan.reason = "proposed by an owner";
      plan.dropPoint = undefined;
      plan.window = mode === "shipping" ? undefined : proposeMode([mode], a, b)?.window ?? plan.window;
      plan.checklist = checklistFor(mode, await (deps.adviceFor?.(deal) ?? []));
      deps.bus.publish({ type: "HandoffProposed", dealId, mode });
    },

    /** An owner approves the current way to hand over. When both have, the deal moves to handoff. */
    async approve(dealId: string, familyId: string): Promise<void> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      if (plan.state !== "proposed") return;
      if (!plan.approvals.includes(familyId)) plan.approvals.push(familyId);
      if (plan.approvals.includes(deal.offerFamilyId) && plan.approvals.includes(deal.wantFamilyId)) {
        plan.state = "approved";
        await deps.deals.startHandoff(dealId);
      }
    },

    /** The host (the owner giving the item) writes the exact meeting place. Stored encrypted; shown only after agreement. */
    async setPickupPlace(dealId: string, familyId: string, place: string): Promise<void> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      if (plan.mode !== "pickup") throw new LogisticsError("wrong_state", "this handover is not an in-person pickup");
      if (familyId !== deal.offerFamilyId) throw new LogisticsError("not_host", "only the owner giving the item sets the meeting place");
      const t = place.trim();
      if (t.length < 3 || t.length > 200) throw new LogisticsError("invalid", "a meeting place needs 3 to 200 characters");
      plan.placeEnc = encryptText(deps.secret, t);
    },

    /** Locker or shop mode: either owner picks one of the public drop points near the host. */
    async chooseDropPoint(dealId: string, familyId: string, pointId: string): Promise<void> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      if (plan.mode !== "locker" && plan.mode !== "parcel_shop") throw new LogisticsError("wrong_state", "this handover does not use a drop point");
      const point = dropPoints(deps.constraintsOf(deal.offerFamilyId).districtCode).find((x) => x.id === pointId);
      if (!point) throw new LogisticsError("invalid", "unknown drop point");
      plan.dropPoint = point;
    },

    /** The recipient gives a delivery address. Encrypted at rest; reaches only the carrier adapter and the sender's label (LOG-SHP-04). */
    async setShippingAddress(dealId: string, familyId: string, address: string): Promise<void> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      if (plan.mode !== "shipping" || plan.state !== "approved") throw new LogisticsError("wrong_state", "shipping must be agreed by both owners first");
      if (familyId !== deal.wantFamilyId) throw new LogisticsError("not_recipient", "only the person receiving the item gives the delivery address");
      const t = address.trim();
      if (t.length < 5 || t.length > 300) throw new LogisticsError("invalid", "a delivery address needs 5 to 300 characters");
      const s = shipments.rows.get(dealId) ?? { id: newId(), dealId, senderFamilyId: deal.offerFamilyId, recipientFamilyId: deal.wantFamilyId, carrier: deps.carrier.name, mode: "simulated" as const, createdAt: now().toISOString() };
      s.addressEnc = encryptText(deps.secret, t);
      shipments.rows.set(dealId, s);
    },

    /** Record how postage is shared. Terms only: no money moves through the platform (LOG-SHP-03). */
    async setFeeSplit(dealId: string, familyId: string, split: unknown): Promise<FeeSplit> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      if (plan.mode !== "shipping") throw new LogisticsError("wrong_state", "this handover is not shipping");
      let valid: FeeSplit;
      try {
        valid = validateFeeSplit(split);
      } catch (e) {
        throw new LogisticsError("invalid", (e as Error).message);
      }
      const s = shipments.rows.get(dealId) ?? { id: newId(), dealId, senderFamilyId: deal.offerFamilyId, recipientFamilyId: deal.wantFamilyId, carrier: deps.carrier.name, mode: "simulated" as const, createdAt: now().toISOString() };
      s.feeSplit = valid;
      shipments.rows.set(dealId, s);
      return valid;
    },

    /** The sender creates the label and books the appointment, only when every condition holds (LOG-02, LOG-SHP-01, 02). */
    async createLabel(dealId: string, familyId: string, window: Window, kind: "pickup" | "dropoff" = "dropoff"): Promise<{ labelText: string; appointment: NonNullable<Shipment["appointment"]> }> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      const s = shipments.rows.get(dealId);
      const blockers = labelBlockers({
        dealState: deal.state, mode: plan.mode, planApproved: plan.state === "approved", approvals: plan.approvals, owners: [deal.offerFamilyId, deal.wantFamilyId],
        senderId: deal.offerFamilyId, actingFamilyId: familyId, recipientAddressSet: Boolean(s?.addressEnc), alreadyHasLabel: Boolean(s?.labelRef),
      });
      if (blockers.length || !s) throw new LogisticsError("blocked", blockers.join("; ") || "the recipient has not given a delivery address yet");

      const label = await deps.carrier.createLabel({
        shipmentId: s.id, fromDistrict: deps.constraintsOf(deal.offerFamilyId).districtCode, toAddress: decryptText(deps.secret, s.addressEnc!),
        toDistrict: deps.constraintsOf(deal.wantFamilyId).districtCode, description: "Parcel",
      });
      const appointment = await deps.carrier.bookAppointment({ shipmentId: s.id, labelRef: label.labelRef, kind, window });
      Object.assign(s, { carrier: deps.carrier.name, mode: label.mode, labelRef: label.labelRef, trackingRef: label.trackingRef, labelTextEnc: encryptText(deps.secret, label.labelText), appointment, status: "appointment_booked" as const });
      deps.bus.publish({ type: "ShipmentUpdated", dealId, status: "appointment_booked" });
      return { labelText: label.labelText, appointment };
    },

    /** Pull the carrier's status into the deal; delivery completes the handoff (LOG-SHP-05). */
    async refreshTracking(dealId: string): Promise<string | undefined> {
      const s = shipments.rows.get(dealId);
      const plan = plans.rows.get(dealId);
      if (!s?.trackingRef || !plan) return undefined;
      const t = await deps.carrier.track(s.trackingRef);
      if (t.status !== s.status) {
        s.status = t.status;
        deps.bus.publish({ type: "ShipmentUpdated", dealId, status: t.status });
      }
      if (t.status === "delivered" && plan.state === "approved") {
        const deal = await deps.deals.get(dealId);
        if (deal) await finish(deal, plan, true, "carrier", "delivered");
      }
      return t.status;
    },

    /** Either owner records whether the handoff happened (LOG-05, LOG-HND-04). */
    async markOutcome(dealId: string, familyId: string, ok: boolean, reason?: string): Promise<void> {
      const { deal, plan: p } = await load(dealId, familyId);
      const plan = needPlan(p);
      if (plan.state !== "approved") throw new LogisticsError("wrong_state", plan.state === "proposed" ? "the way to hand over is not agreed yet" : "the outcome is already recorded");
      if (!ok && !FAIL_REASONS.includes(reason as (typeof FAIL_REASONS)[number])) throw new LogisticsError("invalid", `say why: ${FAIL_REASONS.join(", ")}`);
      await finish(deal, plan, ok, familyId, ok ? undefined : reason);
    },

    /** What one owner sees on the handoff card. Empty until both owners confirmed (OWN-CNF-03); the exact place appears only after agreement (LOG-03). */
    async handoffCard(dealId: string, viewerFamilyId: string): Promise<HandoffCard> {
      const { deal, plan } = await load(dealId, viewerFamilyId);
      if (!plan || !dealConfirmed(deal)) return { empty: true };
      const agreed = plan.state !== "proposed";
      const host = deal.offerFamilyId;
      const s = shipments.rows.get(dealId);
      const card: HandoffCard = {
        empty: false, mode: plan.mode, state: plan.state, reason: plan.reason, window: plan.window, checklist: plan.checklist,
        approvedByYou: plan.approvals.includes(viewerFamilyId), approvedByOther: plan.approvals.includes(other(deal, viewerFamilyId)), outcome: plan.outcome,
      };
      if (plan.placeEnc && (viewerFamilyId === host || agreed)) card.place = decryptText(deps.secret, plan.placeEnc);
      if (agreed && plan.dropPoint) card.dropPoint = plan.dropPoint;
      if (plan.mode === "shipping" && s) {
        card.addressGiven = Boolean(s.addressEnc);
        card.shipment = {
          status: s.status, appointment: s.appointment, trackingRef: s.trackingRef, feeSplit: s.feeSplit,
          // The label, and with it the recipient's address, goes to the sender only (LOG-SHP-04).
          ...(viewerFamilyId === s.senderFamilyId && s.labelTextEnc ? { labelText: decryptText(deps.secret, s.labelTextEnc) } : {}),
        };
      }
      return card;
    },
  };
  return service;
}

const dealConfirmed = (d: Deal) => CONFIRMED.includes(d.state);

export type Logistics = ReturnType<typeof createLogistics>;
