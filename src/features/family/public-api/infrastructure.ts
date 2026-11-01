import type { AppConfig } from "@/lib/app-config";
import { createConsentLedger } from "../features/consent/public-api/infrastructure";
import type { AuditSink } from "../features/consent/public-api/types";
import { createInMemoryProfileRepository, createProfileService } from "../features/profile/public-api/infrastructure";
import type { ProfileRepository } from "../features/profile/public-api/types";

export { ProfileValidationError } from "../features/profile/public-api/infrastructure";

/** Facade over profile and consent: erasure removes the family and its consent history together (FAM-03). */
export function createFamilyService(deps: {
  app: Pick<AppConfig, "id" | "participant" | "policies">;
  repo?: ProfileRepository;
  audit?: AuditSink;
}) {
  const profiles = createProfileService({ app: deps.app, repo: deps.repo ?? createInMemoryProfileRepository() });
  const consent = createConsentLedger(deps.audit);
  return {
    profiles,
    consent,
    async erase(id: string) {
      consent.erase(id);
      return profiles.erase(id);
    },
    async export(id: string) {
      const base = await profiles.export(id);
      return base ? { ...base, consent: consent.history(id) } : null;
    },
  };
}

