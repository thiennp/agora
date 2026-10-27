import type { DealEvent, DealEventType, Listener } from "./types";

type AnyListener = (event: DealEvent) => void;

/** In-process bus. Producers call `publish`; consumers register with `subscribe` (see query.ts). A listener that throws never blocks the producer. */
export function createDealEventBus() {
  const listeners = new Map<DealEventType, Set<AnyListener>>();
  return {
    publish(event: DealEvent): void {
      for (const l of listeners.get(event.type) ?? []) {
        try {
          l(event);
        } catch {
          /* consumers are isolated from producers */
        }
      }
    },
    subscribe<T extends DealEventType>(type: T, listener: Listener<T>): () => void {
      const set = listeners.get(type) ?? new Set<AnyListener>();
      const wrapped = listener as unknown as AnyListener;
      set.add(wrapped);
      listeners.set(type, set);
      return () => set.delete(wrapped);
    },
  };
}

export type DealEventBus = ReturnType<typeof createDealEventBus>;
