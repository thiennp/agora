import { createHttpAdapter } from "./openai-compatible";

export const createMetaApiAdapter = (o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch }) =>
  createHttpAdapter({ provider: "meta-api", ...o });
