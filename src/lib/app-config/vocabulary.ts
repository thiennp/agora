import { appStyle, type AppStyle } from "./describe";
import type { AppConfig } from "./schema";

/**
 * Every label the per-app pages need, taken from the app's own config (name, categories, style) so a walking group never reads like a
 * swap shop. Exchange apps keep the words they always had; a board has plain posts and replies, with no swap, free or handover words
 * (docs/PRIMITIVES.md: those are exchange features and are only said where the app has them).
 */
export interface Vocabulary {
  style: AppStyle;
  appName: string;
  /** What the other person is called in a sentence. */
  other: string;
  offer: string;
  want: string;
  itemsTitle: string;
  itemsEmpty: string;
  addTitle: string;
  addOffer: string;
  addWant: string;
  kindLabel: string;
  submit: string;
  found: string;
  foundNone: string;
  startMatch: string;
  matchBusy: string;
  dealsTitle: string;
  dealsEmpty: string;
  openRoom: string;
  handoffTitle: string;
  /** Whether a condition is asked (an exchange of things); a board does not ask. */
  askCondition: boolean;
}

export function appVocabulary(app: Pick<AppConfig, "name" | "policies">): Vocabulary {
  const style = appStyle(app as AppConfig);
  if (style === "board") {
    return {
      style, appName: app.name, other: "the other person",
      offer: "You offer", want: "You need",
      itemsTitle: "Your posts",
      itemsEmpty: "You have not posted anything yet. Post what you offer or what you need below, and your agent starts looking.",
      addTitle: "Add a post", addOffer: "offer something", addWant: "ask for something I need", kindLabel: "Topic", submit: "Post it",
      found: "Your agent found a post that fits:", foundNone: "Nothing fits yet. Your agent keeps looking, and when another person posts what you need it shows up here.",
      startMatch: "Ask my agent to reach out", matchBusy: "Your agent is on it…",
      dealsTitle: "Your conversations", dealsEmpty: "Nothing yet. When your agent finds a post that fits one of yours and you ask it to reach out, it shows up here. If someone else's agent reaches out to you, you get a card first.",
      openRoom: "Open the conversation", handoffTitle: "Meeting up", askCondition: false,
    };
  }
  return {
    style, appName: app.name, other: "the other person",
    offer: "Giving", want: "Looking for",
    itemsTitle: "Your items",
    itemsEmpty: "Nothing listed yet. Add what you are giving away or looking for below.",
    addTitle: "Add an item", addOffer: "give something", addWant: "find something", kindLabel: "What kind", submit: "List it",
    found: "Your agent found:", foundNone: "No match yet. Your agent keeps looking.",
    startMatch: "Ask my agent to propose this", matchBusy: "Your agent is on it…",
    dealsTitle: "Your deals", dealsEmpty: "No deals yet. When your agent finds a match for something you need and you ask it to propose it, the deal shows up here.",
    openRoom: "Open the deal room", handoffTitle: "How the item changes hands", askCondition: true,
  };
}
