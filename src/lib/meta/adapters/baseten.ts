import { createHttpAdapter } from "./openai-compatible";

/** Fallback host for open-weight Muse Spark Open. */
export const createBasetenAdapter = (o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch }) =>
  createHttpAdapter({ provider: "baseten", ...o });
