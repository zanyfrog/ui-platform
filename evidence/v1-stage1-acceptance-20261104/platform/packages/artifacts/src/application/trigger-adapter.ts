/** Structural subset of Data Services TriggerRegistry.list; no second trigger store. */
export interface CentralTriggerRegistration {
  id: string;
  appId: string;
  dataset: string;
  enabled: boolean;
  handlerId: string;
}
export interface CentralTriggerRegistry {
  list(appId: string): Promise<CentralTriggerRegistration[]>;
}
/** Legacy enabled registrations are runtime-active; source identity is always mapped explicitly. */
export async function activeTriggerArtifactIds(
  registry: CentralTriggerRegistry,
  applicationId: string,
  artifactForRegistration: (
    registration: CentralTriggerRegistration,
  ) => Promise<string | undefined>,
): Promise<string[]> {
  const ids = new Set<string>();
  for (const registration of await registry.list(applicationId)) {
    if (registration.appId !== applicationId || !registration.enabled) continue;
    if (!registration.dataset)
      throw new Error(
        "Active central trigger requires explicit dataset identity.",
      );
    const id = await artifactForRegistration(registration);
    if (!id)
      throw new Error(
        `Central trigger ${registration.id} has no artifact identity mapping.`,
      );
    ids.add(id);
  }
  return [...ids].sort();
}
