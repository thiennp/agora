export interface LabelGuardInput {
  dealState: string;
  mode: string;
  planApproved: boolean;
  /** Owners who approved the mode, as family ids, plus the two owners in the deal. */
  approvals: readonly string[];
  owners: readonly [string, string];
  senderId: string;
  actingFamilyId: string;
  recipientAddressSet: boolean;
  alreadyHasLabel: boolean;
}

/**
 * Reasons a label may not be created yet, empty when it may (LOG-02, LOG-SHP-01). A label needs: the deal in handoff (so both
 * owners confirmed), shipping approved by both owners (the sender included), the sender asking, and the recipient's address.
 */
export function labelBlockers(i: LabelGuardInput): string[] {
  const out: string[] = [];
  if (i.dealState !== "handoff") out.push("both owners must confirm the deal first");
  if (i.mode !== "shipping") out.push("the agreed way to hand over is not shipping");
  if (!i.planApproved || !i.owners.every((o) => i.approvals.includes(o))) out.push("both owners must approve shipping");
  if (!i.approvals.includes(i.senderId)) out.push("the sender must approve shipping");
  if (i.actingFamilyId !== i.senderId) out.push("only the sender can create the label");
  if (!i.recipientAddressSet) out.push("the recipient has not given a delivery address yet");
  if (i.alreadyHasLabel) out.push("a label already exists");
  return out;
}
