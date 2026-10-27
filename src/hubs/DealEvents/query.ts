import type { DealEventBus } from "./command";
import type { DealEvent } from "./types";

/** Consumer-side helper: record every event the bus publishes (used by tests and the dashboard live feed). */
export function recordEvents(bus: DealEventBus): { events: DealEvent[]; stop: () => void } {
  const events: DealEvent[] = [];
  const types = ["DealAgreedByAgents", "OwnerQuestionOpened", "DealConfirmed", "DealDeclined", "DealExpired", "ShipmentUpdated", "ReportFiled"] as const;
  const stops = types.map((t) => bus.subscribe(t, (e) => events.push(e as DealEvent)));
  return { events, stop: () => stops.forEach((s) => s()) };
}
