import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {statSync,realpathSync} from 'node:fs';
import { inspectDevelopmentDataset, registerTriggerDataset, TriggerRegistry, type SecuredDevelopmentHostConfig, type bootstrapDevelopmentDataset } from '@ui-platform/dataset-operations';
import type { DatasetResourceRegistry } from '@ui-platform/i-am/dataset-security';
import type { SecuredDatasetOperationEngine, DatasetSecurityPlanner } from '@ui-platform/dataset-operations';
import type { SecurityResourceRef } from '@ui-platform/i-am/definitions';
import { deny, digest } from './boundary.js';

export type AppliedConfiguration = SecuredDevelopmentHostConfig;
type AppliedBinding=Omit<Awaited<ReturnType<typeof inspectDevelopmentDataset>>,'schema'>;
export const appliedIdentity = (binding: AppliedBinding) => digest(JSON.stringify({ resource: binding.resource, environmentId: binding.environmentId,
  schemaVersion: binding.schemaVersion, schemaDigest: binding.schemaDigest, physical: binding.physical, fields: binding.fields }));
/** Reuse the Data-owned canonical publication/applied/registry verifier. No developer actor is authenticated here. */
type ServingOwner = NonNullable<Awaited<ReturnType<typeof bootstrapDevelopmentDataset>>['servingOwner']>;
export async function openAppliedData(config: AppliedConfiguration, artifactExists: (ref: SecurityResourceRef) => Promise<boolean>, servingOwner?: ServingOwner) {
  config = structuredClone(config);
  await inspectDevelopmentDataset(config);
  // Resolve the existing ORM through its owning package's declared dependency, without a second installation or source import.
  const require = createRequire(import.meta.url), dataRequire = createRequire(require.resolve('@ui-platform/dataset-operations'));
  const { JsonFileDatasetOrm } = await import(pathToFileURL(dataRequire.resolve('@ui-platform/orm')).href);
  const [{SchemaManager},{AppliedResourceRegistry,CanonicalSchemaReader,QualifiedAppliedResolver}]=await Promise.all([
    import(pathToFileURL(dataRequire.resolve('@ui-platform/schema-manager')).href),
    import(pathToFileURL(dataRequire.resolve('@ui-platform/schema-application')).href),
  ]);
  const orm = (servingOwner?.orm ?? new JsonFileDatasetOrm(config.paths.ormData)) as ConstructorParameters<typeof SecuredDatasetOperationEngine>[0] & { register(value: unknown): void };
  if (!servingOwner) orm.register(config.registration);
  registerTriggerDataset(orm); const triggers = new TriggerRegistry(orm);
  const manager=new SchemaManager(config.paths.schemaPublications);
  const resolver=new QualifiedAppliedResolver({stateRoot:config.paths.schemaApplicationState,pin:config.pin,reader:new CanonicalSchemaReader(manager),
    runtime:{generation:config.serving.generation,orm,async assertServing(input:{generation:string;fingerprint:string}){
      if(input.generation!==config.serving.generation||input.fingerprint!==config.serving.fingerprint)deny();
    }}});
  const owner=servingOwner?.registry ?? new AppliedResourceRegistry(config.paths.resourceRegistry,config.identity.authorityId,config.systemResourceId??'platform',config.pin.environmentId,
    {async assertApplicationOwner(){throw Error('OWNER_MUTATION_UNAVAILABLE');},async assertDatasetRetired(){throw Error('OWNER_MUTATION_UNAVAILABLE');}},manager,resolver);
  const fileIdentity=()=>{const file=realpathSync(config.paths.resourceRegistry),info=statSync(file,{bigint:true});return JSON.stringify([file,String(info.dev),String(info.ino)]);};
  const ownerFile=fileIdentity(),assertOwnerFile=()=>{if(fileIdentity()!==ownerFile)throw Error('APPLIED_OWNER_FILE_CHANGED');};
  // Same canonical owner composition as inspectDevelopmentDataset, with a live
  // registry instance so its existing validation-scoped snapshot API can operate.
  const bind=async():Promise<AppliedBinding>=>{assertOwnerFile();const binding=await owner.bindDataset(config.pin.appId,config.pin.datasetId);assertOwnerFile();return binding;};
  const inspect=async()=>{const binding={...await bind(),schema:(await manager.readVerifiedVersion(config.pin.reference,config.pin.publication.version)).definition.value};assertOwnerFile();return binding;};
  const withSnapshot=async<T>(action:()=>Promise<T>):Promise<T>=>{assertOwnerFile();const result=await owner.withVerifiedSnapshot(action);assertOwnerFile();return result;};
  const guardPlanner=(planner:DatasetSecurityPlanner):DatasetSecurityPlanner=>({
    plan:request=>withSnapshot(()=>planner.plan(request)),
    assertCurrent:(plan,request)=>withSnapshot(()=>planner.assertCurrent(plan,request)),
  });
  const root: SecurityResourceRef = { authorityId: config.identity.authorityId, applicationId: null, kind: 'system', id: config.systemResourceId ?? 'platform' };
  const app: SecurityResourceRef = { authorityId: root.authorityId, applicationId: config.pin.appId, kind: 'application', id: config.pin.appId };
  const resources: DatasetResourceRegistry = {
    async revision() { return (await bind()).registryRevision; },
    async bindDataset(applicationId, datasetId) { if (applicationId !== config.pin.appId || datasetId !== config.pin.datasetId) deny(); return bind(); },
    async resolve(ref) {
      if (ref.authorityId !== root.authorityId) return undefined;
      const binding = await bind();
      if (ref.kind === 'system' && ref.applicationId === null && ref.id === root.id) return { ref, status: 'active' };
      if (ref.applicationId !== config.pin.appId) return undefined;
      if (ref.kind === 'application' && ref.id === app.id) return { ref, parent: root, status: 'active' };
      if (ref.kind === 'dataset' && ref.id === binding.resource.id) return { ref, parent: app, status: 'active' };
      if (ref.kind === 'field' && ref.parentId === binding.resource.id && binding.fields.some(f => f.fieldId === ref.id)) return { ref, parent: binding.resource, status: 'active' };
      if (['page', 'form', 'artifact', 'security-definition'].includes(ref.kind) && ref.parentId === app.id && await artifactExists(ref)) return { ref, parent: app, status: 'active' };
      return undefined;
    },
  };
  return { orm, triggers, resources, inspect, guardPlanner, close(){ if (!servingOwner) owner.close(); }, async schemaCurrent(applicationId: string, identity: string) { try { return applicationId === config.pin.appId && appliedIdentity(await bind()) === identity; } catch { return false; } } };
}
