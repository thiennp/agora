import type { AppConfig } from "@/lib/app-config";
import type { MetaClient } from "@/lib/meta";
import { detectWithFallback, normalizeLanguage } from "../features/detection/public-api/infrastructure";
import type { Detection } from "../features/detection/public-api/types";
import { translateWithModel } from "../features/translation/public-api/infrastructure";
import type { TranslateResult } from "../features/translation/public-api/types";

export { roundTripSimilarity, numbersPreserved } from "../features/translation/public-api/infrastructure";
export { detectLanguage } from "../features/detection/public-api/infrastructure";

/**
 * Language services for one app: detect among the app's languages, translate with the Meta client. Identical
 * requests are cached so repeated card and note views cost nothing. Failures return a reason, never invented text.
 */
export function createLanguageService(deps: { app: Pick<AppConfig, "policies">; client?: MetaClient }) {
  const supported = deps.app.policies.languages.map((l) => normalizeLanguage(l)).filter((l): l is string => l !== null);
  const cache = new Map<string, TranslateResult>();

  return {
    supported,
    isSupported: (lang: string) => supported.includes(normalizeLanguage(lang) ?? ""),

    detect(text: string, participantId?: string): Promise<Detection> {
      return detectWithFallback({ client: deps.client, candidates: supported, text, participantId });
    },

    /** Same language needs no model call; otherwise one cached translation. */
    async translate(input: { text: string; to: string; from?: string | null; participantId?: string }): Promise<TranslateResult> {
      const to = normalizeLanguage(input.to);
      const from = normalizeLanguage(input.from ?? null);
      if (!to) return { ok: false, reason: "unavailable" };
      if (from && from === to) return { ok: true, text: input.text, from, to, uncertain: false };
      const key = JSON.stringify([from, to, input.text]);
      const hit = cache.get(key);
      if (hit) return hit;
      const result = await translateWithModel({ client: deps.client, text: input.text, from, to, participantId: input.participantId });
      if (result.ok) cache.set(key, result);
      return result;
    },

    /** English view of a text, for the gatekeeper to check for risks worded in another language (GAT-CLS-06). */
    async toEnglish(text: string, from: string | null, participantId?: string): Promise<string | null> {
      if (normalizeLanguage(from) === "en") return text;
      const r = await this.translate({ text, from, to: "en", participantId });
      return r.ok ? r.text : null;
    },
  };
}

export type LanguageService = ReturnType<typeof createLanguageService>;
