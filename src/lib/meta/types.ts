/** Agent roles that call a model (docs/ARCHITECTURE.md section 6). */
export const ROLES = ["intake", "forecaster", "matcher", "negotiator", "translator", "lessons", "logistics", "trust"] as const;
export type Role = (typeof ROLES)[number];

/** Meta models only (LIB-META-01). */
export type ModelId = "muse-spark" | "muse-spark-open";

export type Provider = "meta-api" | "baseten" | "modal" | "mock";

export interface ModelRequest {
  model: ModelId;
  system: string;
  prompt: string;
  /** Ask for JSON output. */
  json?: boolean;
}

export interface ModelResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ModelAdapter {
  provider: Provider;
  complete(req: ModelRequest): Promise<ModelResponse>;
}

export interface CallRecord {
  role: Role;
  model: ModelId;
  provider: Provider;
  participantId: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  ok: boolean;
}
