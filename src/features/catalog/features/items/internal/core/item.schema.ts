import { z } from "zod";
import type { AppConfig } from "@/lib/app-config";

export const ITEM_STATUSES = ["draft", "listed", "in_deal", "reserved", "done", "withdrawn"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Allowed moves (CAT-01). Withdrawal is possible only before confirmation: never from reserved or done (CAT-ITM-02). */
export const TRANSITIONS: Record<ItemStatus, readonly ItemStatus[]> = {
  draft: ["listed", "withdrawn"],
  listed: ["draft", "in_deal", "withdrawn"],
  in_deal: ["listed", "reserved", "withdrawn"],
  reserved: ["listed", "done"],
  done: [],
  withdrawn: [],
};

type App = Pick<AppConfig, "catalog">;

/** Same shape for items made by hand or from an intake draft (CAT-ITM-01); categories, sizes and conditions come from the app. */
export function buildItemSchema(app: App) {
  const cats = app.catalog.categories.map((c) => c.id) as [string, ...string[]];
  const conditions = app.catalog.conditions as [string, ...string[]];
  return z
    .object({
      kind: z.enum(["offer", "want"]),
      category: z.enum(cats),
      size: z.string().trim().min(1).max(20).optional(),
      condition: z.enum(conditions).optional(),
      description: z.string().trim().max(300).default(""),
      /** Facts that safety rules ask for, e.g. { "crash-history": "none" }. */
      attributes: z.record(z.string().max(100)).default({}),
      cropUrl: z.string().max(500).optional(),
    })
    .strict()
    .superRefine((item, ctx) => {
      const sizes = app.catalog.sizeSystems[item.category];
      if (item.size && sizes && !sizes.includes(item.size)) {
        ctx.addIssue({ code: "custom", path: ["size"], message: `size must be one of ${sizes.join(", ")}` });
      }
      if (item.kind === "offer" && !item.condition) {
        ctx.addIssue({ code: "custom", path: ["condition"], message: "an offer needs a condition" });
      }
    });
}

