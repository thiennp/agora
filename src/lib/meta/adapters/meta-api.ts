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
 * Checked against the live API on Oct 28, 2026: `instructions`, `reasoning.effort`, `store` and `text.format` are accepted.
 * `store: false` keeps responses from being retained by the provider; reasoning effort is `low` because the default (`high`)
 * spends hundreds of reasoning tokens on one-line answers. Image input was checked the same day; SAM 3.1 is in sam.ts; voice is not covered.
 */
export function createMetaApiAdapter(o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch; modelNames?: Partial<Record<ModelId, string>> }): ModelAdapter {
  const doFetch = o.fetchImpl ?? fetch;
  const names = { ...MODEL_NAMES, ...o.modelNames };
  return {
    provider: "meta-api",
    async complete(req: ModelRequest) {
      const instructions = req.json ? `${req.system}\n\nReply with one JSON object and nothing else.` : req.system;
      const res = await doFetch(`${o.baseUrl.replace(/\/$/, "")}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${o.apiKey}` },
        body: JSON.stringify({
          model: names[req.model] ?? req.model,
          instructions,
          // With images the input is one user message holding the text and each image (docs/ARCHITECTURE.md section 13).
          input: req.images?.length
            ? [{ type: "message", role: "user", content: [{ type: "input_text", text: req.prompt }, ...req.images.map((image_url) => ({ type: "input_image", image_url }))] }]
            : req.prompt,
          reasoning: { effort: "low" },
          store: false,
          ...(req.json ? { text: { format: { type: "json_object" } } } : {}),
        }),
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
