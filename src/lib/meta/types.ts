/** Agent roles that call a model (docs/ARCHITECTURE.md section 6). */
export const ROLES = ["interviewer", "intake", "forecaster", "matcher", "negotiator", "translator", "lessons", "logistics", "trust"] as const;
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
  /** Images to look at, as data URLs (`data:image/jpeg;base64,...`). Only the Meta API host reads images. */
  images?: string[];
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
