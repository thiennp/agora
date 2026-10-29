import type { AppConfig } from "@/lib/app-config";
import { requireRuntimeEnv } from "@/lib/env";
import { CostMeter, createMetaApiAdapter, createMetaClient, createRouter, type MetaClient } from "@/lib/meta";
import type { ModelAdapter } from "@/lib/meta/types";

const g = globalThis as unknown as { __agoraTestAdapter?: ModelAdapter };

/** Tests only: answer every model call with this adapter instead of the Meta Model API. Nothing in the running app calls it. */
export function useAdapterForTests(adapter: ModelAdapter | undefined): void {
  g.__agoraTestAdapter = adapter;
}

/** The model client of one app: always the real Meta Model API (Muse Spark), and a missing key is an error by name, never a fake. */
export function metaClientFor(app: AppConfig): MetaClient {
  const meter = new CostMeter({ perParticipantUsd: 1, globalUsd: 50 });
  if (g.__agoraTestAdapter) return createMetaClient({ app, adapters: { mock: g.__agoraTestAdapter }, router: createRouter({ providers: { "muse-spark": "mock", "muse-spark-open": "mock" } }), meter });
  const env = requireRuntimeEnv();
  return createMetaClient({
    app,
    adapters: { "meta-api": createMetaApiAdapter({ baseUrl: env.META_API_URL ?? "https://api.meta.ai/v1", apiKey: env.META_API_KEY }) },
    router: createRouter({ providers: { "muse-spark": "meta-api", "muse-spark-open": "meta-api" } }),
    meter,
  });
}
