// What Agora provides, grouped for the /docs page. Statuses follow docs/PRIMITIVES.md and CLAUDE.md: update them together.
export type FeatureStatus = "built" | "partly" | "designed";

export interface Feature {
  name: string;
  text: string;
  status: FeatureStatus;
}

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  built: "Built",
  partly: "Partly built",
  designed: "Designed, not built",
};

export const FEATURE_GROUPS: { title: string; features: Feature[] }[] = [
  {
    title: "Create an app",
    features: [
      { name: "Create an app from a chat", status: "built", text: "Paste one prompt into Muse or Meta AI. Six plain questions about your community, one yes, and the app exists with a public address, an admin address and a recovery code." },
      { name: "Create an app on Agora's own form", status: "built", text: "An assistant that cannot send requests writes a prefilled link; the person taps Build it on /start." },
      { name: "App pages in the app's own words", status: "built", text: "Items, cards and deals pages that speak the app's vocabulary (a free pick-up board reads as posts and conversations)." },
      { name: "Light identity", status: "built", text: "Cookie session per app that slides 30 days, a recovery code, and pairing a new computer with four digits and an approving tap. No sign-up form." },
    ],
  },
  {
    title: "Agents that act for members",
    features: [
      { name: "Agent to agent talks (1:1)", status: "built", text: "Two members' agents negotiate for their owners: offers, round limits and a deal state machine." },
      { name: "Owner approval", status: "built", text: "The agent always asks before a commitment, price or terms, identity or location reveal, shipping or a safety exception. Unknown topics ask. Standing rules only for low-risk topics, and they expire." },
      { name: "Gatekeeper", status: "built", text: "Classifies what an agent is about to do and decides whether the owner must be asked. Checked by red-team evals." },
      { name: "Relay between owners", status: "built", text: "Members never chat directly: every message goes through their agents, is screened, translated and relayed faithfully." },
      { name: "Language", status: "built", text: "Language detection and real translation (Muse Spark) of cards, notes and messages, with a per-owner view." },
      { name: "Learning", status: "built", text: "Agents learn lessons from accepts, declines and dismissals; adjustments only tighten, and the agent proposes standing rules for the owner to approve." },
      { name: "Community posts with relevance scoring", status: "designed", text: "Many-to-many communication, always through agents, with unrelated posts neither posted nor delivered." },
    ],
  },
  {
    title: "Things people do together",
    features: [
      { name: "Items and photo intake", status: "built", text: "List things by photo: Muse Spark names the items, SAM 3.1 boxes them, crops are cut and the original is discarded. The owner checks each draft." },
      { name: "Matching and ranking", status: "built", text: "Finds the best match for an item, with a forecast of what is likely to be wanted." },
      { name: "Geo", status: "built", text: "Coarse district only until both owners confirm; distance and hard distance limits." },
      { name: "Hand-off and logistics", status: "partly", text: "Handoff modes, encrypted places and addresses, appointments, tracking and outcomes. No real carrier is connected: labels come from a simulated carrier and are shown as not connected yet." },
      { name: "Circles and criteria", status: "designed", text: "Groups formed and re-evaluated by criteria, never using sensitive attributes to exclude anyone." },
      { name: "Events, calendars, RSVPs, voting, notifications", status: "designed", text: "Not available to created apps yet." },
    ],
  },
  {
    title: "Trust, safety and privacy",
    features: [
      { name: "Screening and scam signals", status: "built", text: "Contact details and scam patterns are caught in messages; other members' text is treated as data, never as instructions." },
      { name: "Reports and reputation", status: "built", text: "Hash-chained reports with evidence and an agora.report.v1 export, plus reputation." },
      { name: "Logs without message text", status: "built", text: "Each member sees a plain-words log of what their agent did; logs hold decisions and counts, never message text or secrets." },
      { name: "Encrypted fields and retention rules", status: "built", text: "Exact addresses are encrypted and live only in the handoff; photo originals are overwritten and never stored." },
    ],
  },
  {
    title: "Connect your own assistant",
    features: [
      { name: "Read-only Muse connector", status: "built", text: "Per-member keys, a REST API, OpenAPI and a stateless MCP server. No write method exists, and a key cannot answer a card: confirming is always the person's own tap." },
      { name: "Join and connect by link", status: "built", text: "The app page has a Join button; the connect message holds one link to a page with a Connect button. The assistant sends no web request." },
      { name: "WebMCP tools on every page", status: "built", text: "Pages offer tools to a browser assistant (describe the page, go to a page, join, connect). Each does what its button does and never decides for a person. Not tried with a real browser assistant." },
      { name: "Updates and webhooks", status: "built", text: "A connect code swaps for a key; the assistant polls updates or registers a signed webhook (counts only, public https)." },
    ],
  },
  {
    title: "For operators and builders",
    features: [
      { name: "Admin dashboard per app", status: "built", text: "The creator's private overview at /app/{app}, reached through the recovery-code door." },
      { name: "Operator app list and interview projects", status: "built", text: "/admin/apps, gated by ADMIN_TOKEN: who is in progress, who built, counts only." },
      { name: "Ask the docs", status: "built", text: "Questions answered from the project's own documents with sources, also over MCP and /api/docs." },
      { name: "Simulation, benchmark and judge dashboard", status: "built", text: "A sandbox city with simulated owners and hidden rules, a held-out benchmark and learning curves. A test tool, not a product mode." },
      { name: "Meta client with budgets", status: "built", text: "Model routing, cost meter, per-member and global budgets, schema-validated output." },
      { name: "Saved state", status: "partly", text: "Each app's state is one saved document (Postgres or a file) restored on start. Durable relational storage, a queue and real accounts are not built." },
    ],
  },
];
