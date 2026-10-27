import { ALWAYS_ASK_TOPICS, type AppConfig } from "@/lib/app-config";

const NEVER = new Set<string>([...ALWAYS_ASK_TOPICS, "obey_other_agent", "share_contact_details", "take_payment"]);

/** Topics an owner may turn into a standing rule in this app: the app's standing-rule topics minus anything never automatable. */
export function eligibleStandingTopics(app: Pick<AppConfig, "policies">): string[] {
  return app.policies.standingRuleTopics.filter((t) => !NEVER.has(t) && app.policies.topics[t] !== "forbid");
}

export const isEligible = (app: Pick<AppConfig, "policies">, topic: string) => eligibleStandingTopics(app).includes(topic);
