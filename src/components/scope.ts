import type { Vocabulary } from "@/lib/app-config/vocabulary";

/**
 * Where an owner page lives. The demo pages (`/items`, `/cards`, `/deals`) run on the repo app and the persona in `?as=`; a created app's
 * pages live under `/app/{app}/...` and act as the signed-in member. The same components serve both, told which by this value.
 */
export interface Scope {
  /** The created app's id; absent on the demo pages. */
  app?: string;
  /** The persona of the demo pages; a created app always acts as the signed-in member. */
  as: "a" | "b";
  words: Pick<Vocabulary, "other"> & Partial<Vocabulary>;
}

export const demoScope = (as: "a" | "b"): Scope => ({ as, words: { other: "the other family" } });

/** Page address for a path like `/deals/x` in this scope. */
export const hrefIn = (s: Pick<Scope, "app" | "as">, path: string): string => (s.app ? `/app/${s.app}${path}` : `${path}?as=${s.as}`);

/** API address for a path like `/api/items` in this scope: the app is named in the query, the person comes from the session cookie. */
export const apiIn = (s: Pick<Scope, "app">, url: string): string => (s.app ? `${url}${url.includes("?") ? "&" : "?"}app=${encodeURIComponent(s.app)}` : url);
