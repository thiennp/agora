import { createHttpAdapter } from "./openai-compatible";

/** Fallback host for open-weight Muse Spark Open. The hackathon requires the `-1026` build, not the docs' default name. */
export const createBasetenAdapter = (o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch }) =>
  createHttpAdapter({ provider: "baseten", modelNames: { "muse-spark-open": "meta-models/muse-spark-open-1026" }, ...o });
