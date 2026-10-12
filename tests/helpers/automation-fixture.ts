import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonFileDatasetOrm } from '../../../UI Platform Data Services/packages/orm/src/index.js';
import { SecuredDatasetOperationEngine, TriggerRegistry, registerTriggerDataset, type TrustedDatasetExecution } from '../../../UI Platform Data Services/packages/dataset-operations/src/index.js';
import { SecurityAuthorizationEvaluator } from '@ui-platform/i-am/evaluator';
import { DatasetSecurityPlanService } from '@ui-platform/i-am/dataset-security';
import type { AccessRequest } from '@ui-platform/i-am/evaluator';
import type { SecurityDocument, SecurityRecord, SecurityResourceRef, SecurityRule } from '@ui-platform/i-am/definitions';
/** Real evaluator, security planner, protected DOE, registry and persisted JSON ORM. Identity handle is host-owned. */
export function automationFixture(deniedFields: string[] = []) {
  const root = mkdtempSync(join(tmpdir(), 'automation-v1-'));
  const orm = new JsonFileDatasetOrm(join(root, 'data'));
  const fields = ['id', 'name', 'status', 'secret'];
  const app: SecurityResourceRef = { authorityId: 'resources', applicationId: 'app-a', kind: 'application', id: 'app-a' };
  const system: SecurityResourceRef = { authorityId: 'resources', applicationId: null, kind: 'system', id: 'system' };
  const dataset = (id: string): SecurityResourceRef => ({ authorityId: 'resources', applicationId: 'app-a', kind: 'dataset', id });
  for (const name of ['people', 'history']) orm.register({ reference: { appId: 'app-a', dataset: name }, primaryKey: 'id', fields: fields.map(name => ({ name, type: 'string', required: name === 'id' || name === 'name' })) });
  registerTriggerDataset(orm); const triggers = new TriggerRegistry(orm);
  const ids = ['read', 'create', 'update', 'delete', 'write', 'filter', 'sort'];
  const rules: SecurityRule[] = ids.map(id => ({ id: `allow-${id}`, permissionId: `p-${id}`, effect: 'allow', scope: { resource: app, descendants: true } }));
  if (deniedFields.length) rules.push({ id: 'deny-fields', permissionId: 'p-write', effect: 'deny', fields: deniedFields, scope: { resource: app, descendants: true } });
  const docs: SecurityRecord[] = [
    { kind: 'user', id: 'user-a', displayName: 'Reference user', status: 'active' },
    ...ids.map(id => ({ kind: 'permission', id: `p-${id}`, key: `p-${id}`, name: id, status: 'active', owner: { kind: 'application', applicationId: 'app-a' }, lifecycle: 'active', applicableKinds: ['dataset'] } as SecurityRecord)),
    { kind: 'permission-set', id: 'set-a', key: 'set-a', name: 'Reference permissions', status: 'active', owner: { kind: 'application', applicationId: 'app-a' }, includes: [], rules },
    { kind: 'role', id: 'role-a', key: 'role-a', name: 'Reference role', status: 'active', owner: { kind: 'application', applicationId: 'app-a' }, permissionSets: [{ id: 'set-a' }] },
    { kind: 'role-assignment', id: 'assignment-a', status: 'active', userId: 'user-a', roleId: 'role-a', scope: { resource: app, descendants: true }, startsAt: '2026-01-01T00:00:00Z', endsAt: null },
  ];
  const context = {}, capability = {}, attested = new WeakSet<object>();
  const resourceList = [{ ref: system }, { ref: app, parent: system }, ...['people', 'history'].flatMap(id => [
    { ref: dataset(id), parent: app }, ...fields.map(field => ({ ref: { ...dataset(id), kind: 'field' as const, id: field, parentId: id }, parent: dataset(id) })),
  ])];
  const resources = {
    async revision() { return 'r1'; },
    async resolve(ref: SecurityResourceRef) { const found = resourceList.find(x => JSON.stringify(x.ref) === JSON.stringify(ref)); return found && { ...found, status: 'active' as const }; },
    async bindDataset(appId: string, id: string) {
      if (appId !== 'app-a' || !['people', 'history'].includes(id)) throw new Error('DATASET_RESOURCE_UNKNOWN');
      return { resource: dataset(id), environmentId: 'dev', schemaVersion: 1, schemaDigest: 'sha256:reference', registryRevision: 'r1', physical: { appId, dataset: id }, fields: fields.map(fieldId => ({ fieldId, key: fieldId })) };
    },
  };
  const policy = { async read() { return { revision: '1', documents: docs.map(definition => ({ format: 'ui-platform.security', formatVersion: 1, definition } as SecurityDocument)) }; } };
  const evaluator = new SecurityAuthorizationEvaluator({ policy, resources, identity: {
    async verify(handle) { if (handle !== context) throw new Error('IDENTITY_UNTRUSTED'); return { principal: { type: 'user', id: 'user-a' }, principalRevision: 'p1', sessionRevision: 's1' }; },
    async assertRequest(request) { if (!attested.has(request)) throw new Error('REQUEST_UNATTESTED'); },
  }, facts: { async revision() { return 'f1'; }, async resolve() { return { present: false }; } }, clock: () => new Date('2026-10-11T00:00:00Z'), freshnessMs: 1000, plannerCapability: capability });
  const identity = { async attest(input: AccessRequest) { const request = { ...input, fields: [...input.fields] }; attested.add(request); return request; } };
  const planner = new DatasetSecurityPlanService(resources, evaluator, policy, identity, { operation: id => `p-${id}`, field: id => `p-${id}` }, capability);
  const engine = new SecuredDatasetOperationEngine(orm, resources, planner, triggers);
  const trusted: TrustedDatasetExecution = { context, actor: { type: 'user', userId: 'user-a' }, authorityId: 'resources', applicationId: 'app-a', source: { type: 'api' } };
  return { root, engine, trusted, triggers, orm, rules,
    async all(dataset = 'people') { const fresh = new JsonFileDatasetOrm(join(root, 'data')); fresh.register(await orm.getDatasetDefinition('app-a', dataset)); return fresh.query({ resource: { appId: 'app-a', dataset } }); },
    bytes(dataset = 'people') { const file = join(root, 'data', `app-a__default__${dataset}.json`); return existsSync(file) ? readFileSync(file, 'utf8') : ''; },
  };
}
