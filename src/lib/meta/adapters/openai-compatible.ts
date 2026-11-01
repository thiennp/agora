import type { ModelAdapter, ModelId, ModelRequest, Provider } from "../types";

interface HttpAdapterOptions {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  /** Provider-specific model names; defaults to the Agora ids. */
  modelNames?: Partial<Record<ModelId, string>>;
  fetchImpl?: typeof fetch;
}

/**
 * Chat-completions style adapter for partner hosts.
 * Used for partner hosts (Baseten, Modal); the Meta API itself uses its own Responses adapter (meta-api.ts).
 */
export function createHttpAdapter(opts: HttpAdapterOptions): ModelAdapter {
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    provider: opts.provider,
    async complete(req: ModelRequest) {
      if (req.images?.length) throw new Error(`${opts.provider} does not read images`);
      const res = await doFetch(`${opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({
          model: opts.modelNames?.[req.model] ?? req.model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.prompt },
          ],
          ...(req.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (!res.ok) throw new Error(`${opts.provider} error ${res.status}`);
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: body.choices?.[0]?.message?.content ?? "",
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
      };
    },
  };
}
