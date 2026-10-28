/** One item the photo turned into, for the owner to check, correct and list (INT-04). */
export interface IntakeDraft {
  id: string;
  /** Short name the owner will recognise ("red rain boots"). */
  name: string;
  category: string;
  size?: string;
  condition?: string;
  /** 0 to 1; low values and gaps are marked `needsCheck` (INT-LAB-02). */
  confidence: number;
  needsCheck: boolean;
  /** The item's picture as a data URL: the only image that leaves intake (INT-03). Absent when none could be kept. */
  crop?: string;
  /** Why there is no picture: a person or readable text was in it, or the item could not be outlined. */
  noCropReason?: "person" | "text" | "no_outline";
}

export type IntakeResult =
  | { status: "ok"; drafts: IntakeDraft[]; /** More items were seen than the cap; ask the owner to split the pile (INT-SEG-02). */ capped: boolean; /** True in demo mode: no model looked at the photo. */ simulated: boolean }
  | { status: "retake"; reason: "too_dark" | "blurry" | "no_items"; message: string }
  | { status: "unreadable" | "unavailable"; message: string };
