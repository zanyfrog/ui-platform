import { afterEach, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { automationFixture } from './helpers/automation-fixture.js';
import { AutomationStore } from '../src/server/automation-store.js';
import { AutomationRuntime, AutomationAuditLog, AutomationServiceFailure, type RegisteredAutomationService } from '../src/server/automation-runtime.js';
import { referenceNotification } from '../src/server/automation-services.js';
import { notificationInput, notificationOutput, notificationServiceId, notificationPermission } from '../src/shared/automation-service-contract.js';
import { createApplicationDataServices } from '../packages/platform-core/src/application-data.js';
const cleanup: string[] = [];
afterEach(async () => { vi.unstubAllGlobals(); for (const root of cleanup.splice(0)) await rm(root, { recursive: true, force: true }); });
async function fixture() {
  const f = automationFixture(); cleanup.push(f.root); const sink: unknown[] = [];
  const services = new Map<string, RegisteredAutomationService>([[notificationServiceId, referenceNotification(sink)]]);
  const triggers = new AutomationStore(join(f.root, 'triggers'), 'trigger'), workflows = new AutomationStore(join(f.root, 'workflows'), 'workflow');
  const runtime = new AutomationRuntime(triggers, workflows, services, new AutomationAuditLog(), true);
  runtime.connect(f.triggers, async (_a, id) => id, { appId: 'app-a', datasetId: 'people', primaryKey: 'id' });
  const resource = { ...f.app, kind: 'artifact' as const, id: notificationServiceId, parentId: 'app-a' };
  f.resourceList.push({ ref: resource, parent: f.app });
  f.docs.push({ kind: 'permission', id: notificationPermission, key: notificationPermission, name: 'Invoke reference', status: 'active', owner: { kind: 'platform' }, lifecycle: 'active', applicableKinds: ['artifact'] });
  const grant = { id: 'service-grant', permissionId: notificationPermission, effect: 'allow' as const, scope: { resource, descendants: false } };
  f.rules.push(grant);
  let revokeAtAdmission = false;
  f.engine.configureServiceInvocation(async (id, trusted, effect) => {
    if (id !== notificationServiceId || trusted.applicationId !== 'app-a' || trusted.authorityId !== 'resources') throw new Error('SERVICE_AUTHORITY_DENIED');
    const request = await f.identity.attest({ context: trusted.context, resource, permissionId: notificationPermission, operationId: 'notification', fields: [] });
    const decision = await f.evaluator.authorize(request);
    if (decision.effect !== 'allow') throw new Error('SERVICE_AUTHORITY_DENIED');
    if (revokeAtAdmission) f.rules.splice(f.rules.indexOf(grant), 1);
    await f.evaluator.assertCurrent(decision, request); return effect();
  });
  await f.engine.write({ datasetId: 'people', operation: 'insert', records: [{ id: 'selected', name: 'Ada' }, { id: 'unrelated', name: 'Keep' }] }, f.trusted);
  const action = { id: 'notify', type: 'service' as const, service: notificationServiceId, input: { fields: { message: { from: 'record' as const, path: ['name'] } } } };
  const workflow = async (actions: any[] = [action]) => workflows.create('test', { displayName: 'Test', appId: 'app-a', datasetId: 'people', primaryKey: 'id', enabled: true, actions });
  return { ...f, sink, services, runtime, triggers, workflows, action, workflow, grant, revokeAtAdmission: () => { revokeAtAdmission = true; } };
}
it.each([null, [], {}, { message: '' }, { message: 12 }, { message: 'x', actor: 'forged' }, { message: 'x'.repeat(2001) }])('rejects invalid typed input %j', value => { expect(notificationInput(value)).toBe(false); });
it('validates exact fixed input/output without coercion', () => {
  expect(notificationInput({ message: ' ' })).toBe(true); expect(notificationInput({ message: 'x'.repeat(2000) })).toBe(true);
  expect(notificationOutput({ delivered: true })).toBe(true); expect(notificationOutput({ delivered: true, patches: [] })).toBe(false);
});
it('runs the approved inherited service and isolates sinks/normal records', async () => {
  const f = await fixture(), other = await fixture(); const w = await f.workflow();
  const result = await f.runtime.workflow(w.definition!.id, 'selected', f.trusted, f.engine);
  expect(result).toMatchObject({ success: true, completedSteps: 1, committedSteps: 0, serviceEffects: [{ actionId: 'notify', outcome: 'occurred' }] });
  expect(f.sink).toEqual([{ message: 'Ada' }]); expect(other.sink).toEqual([]); expect(await f.all()).toContainEqual({ id: 'unrelated', name: 'Keep' });
});
it.each(['revoked', 'admission-race', 'forged-identity', 'cross-application', 'missing-record', 'missing-input', 'unregistered', 'stale-contract'])("fails closed for %s", async scenario => {
  const f = await fixture(); let trusted = f.trusted, record = 'selected';
  if (scenario === 'revoked') f.rules.splice(f.rules.indexOf(f.grant), 1);
  if (scenario === 'admission-race') f.revokeAtAdmission();
  if (scenario === 'forged-identity') trusted = { ...trusted, context: {} };
  if (scenario === 'cross-application') trusted = { ...trusted, applicationId: 'other' };
  if (scenario === 'missing-record') record = 'missing';
  if (scenario === 'missing-input') f.action.input.fields.message.path = ['absent'];
  const w = await f.workflow();
  if (scenario === 'unregistered') f.services.clear();
  if (scenario === 'stale-contract') f.services.set(notificationServiceId, { ...referenceNotification(f.sink), contract: { ...referenceNotification(f.sink).contract!, digest: 'tampered' } });
  const before = f.bytes(); const result = await f.runtime.workflow(w.definition!.id, record, trusted, f.engine);
  expect(result.success).toBe(false); expect(f.sink).toEqual([]); expect(f.bytes()).toBe(before);
});
it('retains earlier committed writes and reports a failed service without global rollback', async () => {
  const f = await fixture(); f.rules.splice(f.rules.indexOf(f.grant), 1);
  const w = await f.workflow([{ id: 'persist', type: 'crud', operation: 'update', datasetId: 'people', records: { literal: { id: 'selected', name: 'Updated' } } }, f.action]);
  expect(await f.runtime.workflow(w.definition!.id, 'selected', f.trusted, f.engine)).toMatchObject({ success: false, completedSteps: 1, committedSteps: 1, failedStep: 2, failedActionId: 'notify', serviceEffects: [{ outcome: 'not-performed' }] });
  expect(await f.all()).toContainEqual({ id: 'selected', name: 'Updated' }); expect(f.sink).toEqual([]);
});
it('invalid output after an effect reports unknown, never a fictional rollback', async () => {
  const f = await fixture(); f.services.set(notificationServiceId, { ...referenceNotification(f.sink), async invoke(input) { f.sink.push(input); return { bad: true }; } });
  const w = await f.workflow(); expect(await f.runtime.workflow(w.definition!.id, 'selected', f.trusted, f.engine)).toMatchObject({ success: false, error: 'SERVICE_OUTPUT_INVALID', serviceEffects: [{ outcome: 'unknown' }] }); expect(f.sink).toHaveLength(1);
});
it('an approved deterministic fail-before-effect substitute retains authorization and reports its honest outcome', async () => {
  const f = await fixture();
  f.services.set(notificationServiceId, { ...referenceNotification(f.sink), async invoke() { throw new AutomationServiceFailure('NOTIFICATION_FAILED', 'not-performed'); } });
  const w = await f.workflow();
  expect(await f.runtime.workflow(w.definition!.id, 'selected', f.trusted, f.engine)).toMatchObject({ success: false, error: 'NOTIFICATION_FAILED', serviceEffects: [{ outcome: 'not-performed' }] });
  expect(f.sink).toEqual([]);
  f.rules.splice(f.rules.indexOf(f.grant), 1);
  expect(await f.runtime.workflow(w.definition!.id, 'selected', f.trusted, f.engine)).toMatchObject({ error: 'SERVICE_AUTHORITY_DENIED', serviceEffects: [{ outcome: 'not-performed' }] });
});
it('afterCommit denial preserves the protected commit and audits the failed service', async () => {
  const f = await fixture(); f.rules.splice(f.rules.indexOf(f.grant), 1);
  await f.triggers.create('post', { displayName: 'Post', appId: 'app-a', datasetId: 'people', dataset: 'people', primaryKey: 'id', phase: 'afterCommit', enabled: true, actions: [f.action] });
  const result = await f.engine.write({ datasetId: 'people', operation: 'update', records: [{ id: 'selected', name: 'Committed' }] }, f.trusted);
  expect(result).toMatchObject({ success: false, committed: true }); expect(await f.all()).toContainEqual({ id: 'selected', name: 'Committed' }); expect(f.sink).toEqual([]);
  expect(f.runtime.audit.list().find(a => !a.success)).toMatchObject({ serviceEffects: [{ outcome: 'not-performed' }] });
});
it('rejects unsupported phases before effects', async () => {
  const f = await fixture(); await f.triggers.create('pre', { displayName: 'Pre', appId: 'app-a', datasetId: 'people', dataset: 'people', primaryKey: 'id', phase: 'beforeInsert', enabled: true, actions: [f.action] });
  const before = f.bytes(); expect((await f.engine.write({ datasetId: 'people', operation: 'insert', records: [{ id: 'denied', name: 'No' }] }, f.trusted)).success).toBe(false); expect(f.bytes()).toBe(before); expect(f.sink).toEqual([]);
});
it('rejects multi-Dataset automation even when the actor can access both Datasets', async () => {
  const f = await fixture();
  const w = await f.workflow([{ id: 'other-dataset', type: 'crud', datasetId: 'history', operation: 'insert', records: { literal: { id: 'other', name: 'Forbidden host target' } } }]);
  const before = f.bytes('history');
  expect(await f.runtime.workflow(w.definition!.id, 'selected', f.trusted, f.engine)).toMatchObject({ success: false, error: 'MULTI_DATASET_AUTOMATION_UNSUPPORTED', committedSteps: 0 });
  expect(f.bytes('history')).toBe(before); expect(f.sink).toEqual([]);
});

it.each([401, 403, 404])('Workflow transport reports confirmed HTTP %s denial as not committed', async status => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })));
  await expect(createApplicationDataServices()['workflow.run']({ workflowId: 'w', primaryRecordId: 'selected' })).rejects.toMatchObject({ commitOutcome: 'not-committed', code: 'WORKFLOW_REQUEST_DENIED' });
});
it('Workflow timeout/server failure remains unknown and is never automatically retried', async () => {
  const request = vi.fn(async () => new Response('', { status: 503 })); vi.stubGlobal('fetch', request);
  await expect(createApplicationDataServices()['workflow.run']({ workflowId: 'w', primaryRecordId: 'selected' })).rejects.toThrow('outcome is unknown'); expect(request).toHaveBeenCalledTimes(1);
});

it('automation creation rechecks management admission before writing source', async () => {
  const f = await fixture();
  await expect(f.workflows.create('revoked-origin', { displayName: 'Denied', appId: 'app-a', datasetId: 'people', primaryKey: 'id', enabled: false, actions: [] }, async () => { throw new Error('AUTHORIZATION_REVOKED'); })).rejects.toThrow('AUTHORIZATION_REVOKED');
  expect(await f.workflows.list()).toEqual([]);
});
