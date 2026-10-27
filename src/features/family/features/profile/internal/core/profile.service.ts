import type { AppConfig } from "@/lib/app-config";
import type { FamilyRecord, ProfileRepository } from "../infrastructure/profile.repository";
import { toDistrictCode } from "./district";
import { buildProfileSchema } from "./profile.schema";

export class ProfileValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
  }
}

type App = Pick<AppConfig, "id" | "participant" | "policies">;

function parse(app: App, input: unknown) {
  const result = buildProfileSchema(app).safeParse(input);
  if (!result.success) {
    throw new ProfileValidationError(result.error.issues.map((i) => `${i.path.join(".") || "profile"}: ${i.message}`));
  }
  return result.data;
}

/** Profile use cases for one app. Pure apart from the repository, clock and id generator. */
export function createProfileService(deps: {
  app: App;
  repo: ProfileRepository;
  now?: () => Date;
  newId?: () => string;
}) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());

  return {
    async create(input: unknown): Promise<FamilyRecord> {
      const data = parse(deps.app, input);
      const ts = now().toISOString();
      const record: FamilyRecord = {
        id: newId(),
        appId: deps.app.id,
        language: data.language,
        districtCode: toDistrictCode(data.district),
        profile: data.profile as FamilyRecord["profile"],
        memoryRef: null,
        createdAt: ts,
        updatedAt: ts,
      };
      await deps.repo.insert(record);
      return record;
    },

    async get(id: string) {
      return deps.repo.get(id);
    },

    /** Owner edits (FAM-03). Takes the full profile again so validation stays in one place. */
    async update(id: string, input: unknown): Promise<FamilyRecord> {
      const existing = await deps.repo.get(id);
      if (!existing) throw new Error("family not found");
      const data = parse(deps.app, input);
      const updated: FamilyRecord = {
        ...existing,
        language: data.language,
        districtCode: toDistrictCode(data.district),
        profile: data.profile as FamilyRecord["profile"],
        updatedAt: now().toISOString(),
      };
      await deps.repo.update(updated);
      return updated;
    },

    /** Everything stored about the family, as plain data the owner can download (FAM-03). */
    async export(id: string) {
      const record = await deps.repo.get(id);
      return record ? { exportedAt: now().toISOString(), family: record } : null;
    },

    async erase(id: string): Promise<boolean> {
      return deps.repo.remove(id);
    },
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
