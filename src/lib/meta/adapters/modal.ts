import { createHttpAdapter } from "./openai-compatible";

/** Fallback host for open-weight Muse Spark Open. */
export const createModalAdapter = (o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch }) =>
  createHttpAdapter({ provider: "modal", ...o });
