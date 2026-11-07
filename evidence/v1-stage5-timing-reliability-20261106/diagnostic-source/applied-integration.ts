import {step} from './refusal-trace.js';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { inspectDevelopmentDataset, registerTriggerDataset, TriggerRegistry, type SecuredDevelopmentHostConfig } from '@ui-platform/dataset-operations';
import type { DatasetResourceRegistry } from '@ui-platform/i-am/dataset-security';
import type { SecuredDatasetOperationEngine } from '@ui-platform/dataset-operations';
import type { SecurityResourceRef } from '@ui-platform/i-am/definitions';
import { deny, digest } from './boundary.js';

export type AppliedConfiguration = SecuredDevelopmentHostConfig;
export const appliedIdentity = (binding: Awaited<ReturnType<typeof inspectDevelopmentDataset>>) => digest(JSON.stringify({ resource: binding.resource, environmentId: binding.environmentId,
  schemaVersion: binding.schemaVersion, schemaDigest: binding.schemaDigest, physical: binding.physical, fields: binding.fields }));
/** Reuse the Data-owned canonical publication/applied/registry verifier. No developer actor is authenticated here. */
export async function openAppliedData(config: AppliedConfiguration, artifactExists: (ref: SecurityResourceRef) => Promise<boolean>) {
  config = structuredClone(config);
  const inspect = () => step('applied','inspect',()=>inspectDevelopmentDataset(config));
  await inspect();
  // Resolve the existing ORM through its owning package's declared dependency, without a second installation or source import.
  const require = createRequire(import.meta.url), dataRequire = createRequire(require.resolve('@ui-platform/dataset-operations'));
  const { JsonFileDatasetOrm } = await import(pathToFileURL(dataRequire.resolve('@ui-platform/orm')).href);
  const orm = new JsonFileDatasetOrm(config.paths.ormData) as ConstructorParameters<typeof SecuredDatasetOperationEngine>[0] & { register(value: unknown): void };
  for(const name of ['query','insert','update','delete','persist','beginTransaction']){const target=orm as any;if(typeof target[name]==='function'){const original=target[name].bind(target);target[name]=(...args:any[])=>step('database',name,()=>original(...args));}}
  orm.register(config.registration); registerTriggerDataset(orm); const triggers = new TriggerRegistry(orm);
  const root: SecurityResourceRef = { authorityId: config.identity.authorityId, applicationId: null, kind: 'system', id: config.systemResourceId ?? 'platform' };
  const app: SecurityResourceRef = { authorityId: root.authorityId, applicationId: config.pin.appId, kind: 'application', id: config.pin.appId };
  const resources: DatasetResourceRegistry = {
    async revision() { return (await inspect()).registryRevision; },
    async bindDataset(applicationId, datasetId) { if (applicationId !== config.pin.appId || datasetId !== config.pin.datasetId) deny(); const { schema: _, ...binding } = await inspect(); return binding; },
    async resolve(ref) {
      if (ref.authorityId !== root.authorityId) return undefined;
      const binding = await inspect();
      if (ref.kind === 'system' && ref.applicationId === null && ref.id === root.id) return { ref, status: 'active' };
      if (ref.applicationId !== config.pin.appId) return undefined;
      if (ref.kind === 'application' && ref.id === app.id) return { ref, parent: root, status: 'active' };
      if (ref.kind === 'dataset' && ref.id === binding.resource.id) return { ref, parent: app, status: 'active' };
      if (ref.kind === 'field' && ref.parentId === binding.resource.id && binding.fields.some(f => f.fieldId === ref.id)) return { ref, parent: binding.resource, status: 'active' };
      if (['page', 'form', 'artifact', 'security-definition'].includes(ref.kind) && ref.parentId === app.id && await artifactExists(ref)) return { ref, parent: app, status: 'active' };
      return undefined;
    },
  };
  return { orm, triggers, resources, inspect, async schemaCurrent(applicationId: string, identity: string) { try { return applicationId === config.pin.appId && appliedIdentity(await inspect()) === identity; } catch { return false; } } };
}
