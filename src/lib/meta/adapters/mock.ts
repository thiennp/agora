import type { ModelAdapter, ModelRequest } from "../types";

/** Offline adapter for mock mode and tests: replays a handler or echoes a stub, with rough token counts. */
export function createMockAdapter(handler?: (req: ModelRequest) => string): ModelAdapter {
  return {
    provider: "mock",
    async complete(req) {
      const text = handler ? handler(req) : req.json ? "{}" : `[mock ${req.model}] ${req.prompt.slice(0, 80)}`;
      return { text, inputTokens: Math.ceil((req.system.length + req.prompt.length) / 4), outputTokens: Math.ceil(text.length / 4) };
    },
  };
}
