import type { ModelAdapter, ModelId, ModelRequest } from "../types";

/** Meta Model API names (dev.meta.ai/docs/quickstart, read Oct 27, 2026). */
const MODEL_NAMES: Partial<Record<ModelId, string>> = { "muse-spark": "muse-spark-1.3" };

interface ResponsesBody {
  output_text?: string;
  output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Meta Model API adapter: `POST {baseUrl}/responses` with `{ model, input }` and `Authorization: Bearer <key>`, answer read from the
 * `message` output item's `output_text` parts (the shape the quickstart shows).
 *
 * NOT YET CHECKED AGAINST THE LIVE API (needs a key): the quickstart documents only a string `input`, so the system text is
 * folded into it rather than sent as `instructions`, and JSON mode is asked for in words rather than with a `text.format`
 * parameter. Swap both for the documented parameters once the Create-a-response schema is confirmed.
 */
export function createMetaApiAdapter(o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch; modelNames?: Partial<Record<ModelId, string>> }): ModelAdapter {
  const doFetch = o.fetchImpl ?? fetch;
  const names = { ...MODEL_NAMES, ...o.modelNames };
  return {
    provider: "meta-api",
    async complete(req: ModelRequest) {
      const input = [
        `Instructions:\n${req.system}`,
        req.json ? "Reply with one JSON object and nothing else." : "",
        `Input:\n${req.prompt}`,
      ].filter(Boolean).join("\n\n");
      const res = await doFetch(`${o.baseUrl.replace(/\/$/, "")}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${o.apiKey}` },
        body: JSON.stringify({ model: names[req.model] ?? req.model, input }),
      });
      // The status only: a response body can echo the prompt, which may hold message text.
      if (!res.ok) throw new Error(`meta-api error ${res.status}`);
      const body = (await res.json()) as ResponsesBody;
      const text =
        body.output_text ??
        (body.output ?? []).filter((i) => i.type === "message").flatMap((i) => i.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
      return { text, inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 };
    },
  };
}
