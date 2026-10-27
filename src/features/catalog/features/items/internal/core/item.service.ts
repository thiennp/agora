import { findForbiddenItem, type AppConfig } from "@/lib/app-config";
import type { ItemRecord, ItemRepository, SafetyFlag } from "../infrastructure/item.repository";
import { buildItemSchema, TRANSITIONS, type ItemStatus } from "./item.schema";

export class ItemError extends Error {
  constructor(
    readonly code: "invalid" | "forbidden_item" | "not_found" | "bad_transition" | "no_consent" | "already_confirmed",
    message: string,
  ) {
    super(message);
  }
}

type App = Pick<AppConfig, "id" | "catalog" | "policies">;

/** Flags from the app's safety rules when the facts they require are missing (advisory; the safety slice decides) . */
export function safetyFlagsFor(app: Pick<AppConfig, "policies">, item: { category: string; attributes: Record<string, string> }): SafetyFlag[] {
  return app.policies.safetyRules
    .filter((r) => r.categories.includes(item.category))
    .flatMap((r) => {
      const missing = r.requires.filter((k) => !item.attributes[k]?.trim());
      return missing.length ? [{ ruleId: r.id, missing, advice: r.advice }] : [];
    });
}

export function createItemService(deps: {
  app: App;
  repo: ItemRepository;
  /** Consent check from the family slice; listing is refused without it (FAM-04). */
  canShare: (familyId: string) => boolean;
  now?: () => Date;
  newId?: () => string;
}) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const schema = buildItemSchema(deps.app);

  function parse(input: unknown) {
    const r = schema.safeParse(input);
    if (!r.success) throw new ItemError("invalid", r.error.issues.map((i) => `${i.path.join(".") || "item"}: ${i.message}`).join("; "));
    const hit = findForbiddenItem(deps.app, `${r.data.description} ${Object.values(r.data.attributes).join(" ")}`);
    if (hit) throw new ItemError("forbidden_item", hit.reason);
    return r.data;
  }

  async function load(id: string): Promise<ItemRecord> {
    const item = await deps.repo.get(id);
    if (!item) throw new ItemError("not_found", "item not found");
    return item;
  }

  async function move(id: string, to: ItemStatus, patch: Partial<ItemRecord> = {}): Promise<ItemRecord> {
    const item = await load(id);
    if (!TRANSITIONS[item.status].includes(to)) throw new ItemError("bad_transition", `cannot go from ${item.status} to ${to}`);
    const next = { ...item, ...patch, status: to, updatedAt: now().toISOString() };
    await deps.repo.save(next);
    return next;
  }

  return {
    /** Creates a draft. Nothing is visible to others until the owner lists it (CAT-02). */
    async create(familyId: string, input: unknown): Promise<ItemRecord> {
      const d = parse(input);
      const ts = now().toISOString();
      const item: ItemRecord = {
        id: newId(), familyId, appId: deps.app.id, kind: d.kind, category: d.category, size: d.size, condition: d.condition,
        description: d.description, attributes: d.attributes, cropUrl: d.cropUrl, status: "draft",
        safetyFlags: safetyFlagsFor(deps.app, d), reservedDealId: null, createdAt: ts, updatedAt: ts,
      };
      await deps.repo.insert(item);
      return item;
    },

    /** Edit before confirmation; reserved and finished items are frozen. */
    async edit(id: string, input: unknown): Promise<ItemRecord> {
      const item = await load(id);
      if (item.status === "reserved" || item.status === "done" || item.status === "withdrawn") {
        throw new ItemError("bad_transition", `a ${item.status} item cannot be edited`);
      }
      const d = parse(input);
      const next: ItemRecord = {
        ...item, kind: d.kind, category: d.category, size: d.size, condition: d.condition, description: d.description,
        attributes: d.attributes, cropUrl: d.cropUrl, safetyFlags: safetyFlagsFor(deps.app, d), updatedAt: now().toISOString(),
      };
      await deps.repo.save(next);
      return next;
    },

    async list(id: string) {
      const item = await load(id);
      if (!deps.canShare(item.familyId)) throw new ItemError("no_consent", "sharing has not been agreed yet");
      return move(id, "listed");
    },
    unlist: (id: string) => move(id, "draft"),
    /** Leaves matching immediately (CAT-ITM-02). */
    withdraw: (id: string) => move(id, "withdrawn"),
    markInDeal: (id: string) => move(id, "in_deal"),
    releaseFromDeal: (id: string) => move(id, "listed"),

    /** Confirm an item into a deal; refused if it is already part of a confirmed deal (CAT-03). */
    async reserve(id: string, dealId: string) {
      const item = await load(id);
      if (item.status === "reserved" || item.status === "done") {
        throw new ItemError("already_confirmed", "this item is already part of a confirmed deal");
      }
      return move(id, "reserved", { reservedDealId: dealId });
    },
    release: (id: string) => move(id, "listed", { reservedDealId: null }),
    complete: (id: string) => move(id, "done"),

    get: (id: string) => deps.repo.get(id),
    listForFamily: (familyId: string) => deps.repo.listByFamily(familyId),
    /** What matching may see: listed items of families that still consent. */
    async visibleListings() {
      const all = await deps.repo.listListed(deps.app.id);
      return all.filter((i) => deps.canShare(i.familyId));
    },
    /** Withdrawal of consent hides everything of that family at the next read (FAM-CON-03). */
    erase: (familyId: string) => deps.repo.removeByFamily(familyId),
  };
}

export type ItemService = ReturnType<typeof createItemService>;
