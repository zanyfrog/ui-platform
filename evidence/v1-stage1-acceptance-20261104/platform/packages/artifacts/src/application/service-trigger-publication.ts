import type { ArtifactService } from "../types.js";
import { compileFoundationArtifact } from "./compiler.js";
import { isDeepStrictEqual } from "node:util";

type ServiceIdentity = { mode: "service"; serviceId: string; approvalId: string; executionCapabilityId: string };
export interface PublishedServiceTrigger {
  id: string; appId: string; dataset: string; datasetId: string; key: string;
  phase: "beforeInsert" | "afterInsert" | "beforeUpdate" | "afterUpdate" | "beforeDelete" | "afterDelete";
  handlerId: "@ui-platform/declarative-v1"; enabled: boolean;
  executionIdentity: ServiceIdentity;
  serviceProgram: unknown;
}
export interface ServiceTriggerPublicationRegistry {
  replaceDraft(definition: PublishedServiceTrigger): Promise<unknown>;
  validateDraft(appId: string, key: string): Promise<{ valid: boolean }>;
  publish(appId: string, key: string): Promise<unknown>;
  readVerifiedServiceExecutable(appId: string, key: string): Promise<{
    definition: PublishedServiceTrigger; digest: string; publicationVersion: number;
  }>;
}
export interface ServiceTriggerRuntimeRegistry {
  list(appId: string): Promise<Array<{ id: string; appId: string; dataset: string; publicationKey?: string;
    phase: string; handlerId: string; enabled: boolean; executionIdentity?: unknown }>>;
  create(definition: { id: string; appId: string; dataset: string; publicationKey: string; phase: PublishedServiceTrigger["phase"];
    handlerId: string; enabled: boolean; name: string; executionIdentity: ServiceIdentity }): Promise<unknown>;
}

/** Application-owner publish path. Registration indexes the verified publication; it never carries executable bytes. */
export async function publishServiceTriggerArtifact(input: {
  service: ArtifactService; artifactId: string; applicationId: string;
  publications: ServiceTriggerPublicationRegistry; runtime: ServiceTriggerRuntimeRegistry;
}): Promise<{ digest: string; publicationVersion: number; definition: PublishedServiceTrigger }> {
  const artifact = await input.service.load(input.artifactId);
  const manifest = artifact.manifest;
  if (!artifact.validation.valid || !manifest || manifest.artifactType !== "trigger" || manifest.artifactId !== input.artifactId)
    throw new Error("SERVICE_ARTIFACT_INVALID");
  const config = manifest.config ?? {};
  const identity = config.executionIdentity;
  const phase = config.phase;
  if (!identity || typeof identity !== "object" || !('mode' in identity) || identity.mode !== "service" ||
    typeof config.dataset !== "string" || typeof config.datasetId !== "string" ||
    typeof phase !== "string" || !["beforeInsert", "afterInsert", "beforeUpdate", "afterUpdate", "beforeDelete", "afterDelete"].includes(phase))
    throw new Error("SERVICE_ARTIFACT_INVALID");
  const existing = (await input.runtime.list(input.applicationId)).find(row => row.id === manifest.artifactId);
  if (existing && (existing.appId !== input.applicationId || existing.dataset !== config.dataset ||
    existing.publicationKey !== manifest.artifactId || existing.phase !== phase ||
    existing.handlerId !== "@ui-platform/declarative-v1" ||
    JSON.stringify(existing.executionIdentity) !== JSON.stringify(identity)))
    throw new Error("SERVICE_REGISTRATION_CONFLICT");
  const compiled = await compileFoundationArtifact(artifact);
  if (Object.keys(compiled).length !== 1 || !compiled["service-program.json"]) throw new Error("SERVICE_ARTIFACT_INVALID");
  const definition: PublishedServiceTrigger = {
    id: manifest.artifactId, appId: input.applicationId, dataset: config.dataset,
    datasetId: config.datasetId, key: manifest.artifactId,
    phase: phase as PublishedServiceTrigger["phase"], handlerId: "@ui-platform/declarative-v1",
    enabled: config.active === true, executionIdentity: identity as ServiceIdentity,
    serviceProgram: JSON.parse(compiled["service-program.json"]),
  };
  await input.publications.replaceDraft(definition);
  if (!(await input.publications.validateDraft(definition.appId, definition.key)).valid) throw new Error("SERVICE_ARTIFACT_INVALID");
  await input.publications.publish(definition.appId, definition.key);
  const published = await input.publications.readVerifiedServiceExecutable(definition.appId, definition.key);
  if (!isDeepStrictEqual(published.definition, definition)) throw new Error("SERVICE_PUBLICATION_MISMATCH");
  if (!existing) await input.runtime.create({ id: definition.id, appId: definition.appId, dataset: definition.dataset,
    publicationKey: definition.key, phase: definition.phase, handlerId: definition.handlerId,
    enabled: definition.enabled, name: manifest.name, executionIdentity: definition.executionIdentity });
  return published;
}
