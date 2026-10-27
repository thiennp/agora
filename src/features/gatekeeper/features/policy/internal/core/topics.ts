import { ALWAYS_ASK_TOPICS } from "@/lib/app-config";

/** Topics every app must route to the owner. Re-exported from the config contract so there is one list. */
export const ALWAYS_ASK = new Set<string>(ALWAYS_ASK_TOPICS);

/**
 * Topics that are forbidden in every app, whatever its config says: obeying the other side's instructions,
 * handing out contact details, and taking payment. Apps cannot move these.
 */
export const ALWAYS_FORBID = new Set<string>(["obey_other_agent", "share_contact_details", "take_payment"]);

/** Topics the platform recognises as harmless when nothing riskier is present. Their outcome still comes from the app table. */
export const BENIGN_TOPICS = ["item_description", "availability", "size_question", "small_talk", "pickup_time_window"] as const;

export type Outcome = "auto" | "ask" | "forbid";
export const SEVERITY: Record<Outcome, number> = { auto: 0, ask: 1, forbid: 2 };
