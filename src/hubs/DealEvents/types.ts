/** Cross-slice deal events (docs/ARCHITECTURE.md, DealEvents hub). Plain data only: the hub imports no slice. */
export type DealEvent =
  | { type: "DealAgreedByAgents"; dealId: string; offerFamilyId: string; wantFamilyId: string }
  | { type: "OwnerQuestionOpened"; dealId: string; familyId: string; topic: string }
  | { type: "OwnerAnswered"; dealId: string; familyId: string; topic: string; answer: "yes" | "no" }
  | { type: "OwnerDecision"; dealId: string; familyId: string; decision: "confirm" | "decline"; reasonCode?: string }
  | { type: "DealConfirmed"; dealId: string; offerItemId: string; wantItemId: string }
  | { type: "DealDeclined"; dealId: string; reason: string }
  | { type: "DealExpired"; dealId: string }
  | { type: "HandoffProposed"; dealId: string; mode: string }
  | { type: "ShipmentUpdated"; dealId: string; status: string }
  | { type: "HandoffFinished"; dealId: string; ok: boolean }
  | { type: "ReportFiled"; dealId: string; reason: string };

export type DealEventType = DealEvent["type"];
export type Listener<T extends DealEventType> = (event: Extract<DealEvent, { type: T }>) => void;
