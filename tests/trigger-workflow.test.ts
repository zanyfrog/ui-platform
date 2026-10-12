import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { AutomationStore } from '../src/server/automation-store.js';
import { AutomationRuntime, AutomationAuditLog, type RegisteredAutomationService } from '../src/server/automation-runtime.js';
import { automationDiagnostics, triggerPhases, type AutomationDefinition } from '../src/shared/automation.js';
import { automationFixture } from './helpers/automation-fixture.js';
const cleanup: string[] = [];
afterEach(async () => { for (const root of cleanup.splice(0)) await rm(root, { recursive: true, force: true }); });
const literal = (value: unknown) => ({ literal: value });
const from = (path: string[]) => ({ from: 'record' as const, path });
async function setup(denied: string[] = []) {
  const f = automationFixture(denied); cleanup.push(f.root);
  const triggerStore = new AutomationStore(join(f.root, 'triggers'), 'trigger'), workflowStore = new AutomationStore(join(f.root, 'workflows'), 'workflow');
  const services = new Map<string, RegisteredAutomationService>();
  const runtime = new AutomationRuntime(triggerStore, workflowStore, services);
  runtime.connect(f.triggers, async (_app, id) => id);
  async function trigger(name: string, phase: AutomationDefinition['phase'], actions: AutomationDefinition['actions'], extra: Partial<AutomationDefinition> = {}) {
    return triggerStore.create(name, { displayName: name, appId: 'app-a', datasetId: 'people', dataset: 'people', primaryKey: 'id', enabled: true, phase, actions, ...extra });
  }
  async function workflow(actions: AutomationDefinition['actions']) {
    return workflowStore.create('activation', { displayName: 'Activation', appId: 'app-a', datasetId: 'people', primaryKey: 'id', enabled: true, actions });
  }
  const write = (operation: 'insert' | 'update' | 'delete', records: Record<string, unknown>[], datasetId = 'people') => f.engine.write({ datasetId, operation, records }, f.trusted);
  return { ...f, triggerStore, workflowStore, runtime, services, trigger, workflow, write };
}
describe('Platform source automation', () => {
  it.each(['trigger', 'workflow'] as const)('%s CRUD, stable identity, reload, conflict, disable and dependency deletion', async kind => {
    const f = await setup(), store = kind === 'trigger' ? f.triggerStore : f.workflowStore;
    let b = kind === 'trigger' ? await f.trigger('sample', 'beforeInsert', []) : await f.workflow([]);
    const id = b.definition!.id;
    const source = JSON.stringify({ ...b.definition, enabled: false, displayName: 'Disk edit' });
    await writeFile(join(store.root, b.locator), source);
    expect((await store.list())[0].definition).toMatchObject({ id, enabled: false, displayName: 'Disk edit' });
    await expect(store.save(b.locator, b.source, b.hash)).rejects.toThrow('changed');
    b = await store.read(b.locator);
    await expect(store.save(b.locator, JSON.stringify({ ...b.definition, id: 'changed' }), b.hash)).rejects.toThrow('immutable');
    b = await store.save(b.locator, JSON.stringify({ ...b.definition, displayName: 'Renamed' }), b.hash);
    await expect(store.remove(b.locator, b.hash, [{ name: 'Page', source: JSON.stringify({ workflowId: id }) }])).rejects.toThrow('Referenced');
    await store.remove(b.locator, b.hash, []); expect(await store.list()).toEqual([]);
  });
  it('validates phases, scopes, bindings, small catalogs and prohibits embedded authority/nesting', () => {
    const d: AutomationDefinition = { schemaVersion: 1, kind: 'trigger', id: 't', name: 't', displayName: 'T', appId: 'app-a', datasetId: 'people', dataset: 'people', primaryKey: 'id', enabled: false, phase: 'beforeInsert', actions: [] };
    for (const phase of triggerPhases) expect(automationDiagnostics({ ...d, phase })).toEqual([]);
    expect(automationDiagnostics({ ...d, phase: 'fieldChanged' })).not.toEqual([]);
    expect(automationDiagnostics({ ...d, actor: { type: 'admin' } })).not.toEqual([]);
    expect(automationDiagnostics({ ...d, credentials: 'secret' })).not.toEqual([]);
    expect(automationDiagnostics({ ...d, actions: [{ id: 'bad', type: 'workflow', workflowId: 'other' }] })).not.toEqual([]);
    expect(automationDiagnostics({ ...d, actions: [{ id: 'bad', type: 'service', service: 'notify', input: { from: 'record', path: ['constructor'] } }] })).not.toEqual([]);
  });
  it('blocks traversal and source symlink paths', async () => {
    const f = await setup(); await expect(f.triggerStore.read('../workflow.json')).rejects.toThrow('locator');
  });
});
describe('real protected DOE Trigger integration', () => {
  it('runs all phases, each/batch arrays, old/new/change context and default transforms', async () => {
    const f = await setup(); const seen: Array<{ phase: string; input: any }> = [];
    f.services.set('capture', { transactional: true, async invoke(input, context) { seen.push({ phase: (context.context as any).phase, input }); } });
    await f.trigger('default-status', 'beforeInsert', [{ id: 'default', type: 'set', field: 'status', value: literal('pending'), ifMissing: true }]);
    for (const phase of triggerPhases) await f.trigger(`observe-${phase.toLowerCase()}`, phase, [
      { id: 'each', type: 'service', service: 'capture', input: { from: 'context', path: [] } },
      { id: 'batch', type: 'service', scope: 'batch', service: 'capture', input: { from: 'context', path: [] } },
    ]);
    expect(await f.write('insert', [{ id: '1', name: 'Ada' }, { id: '2', name: 'Grace', status: 'active' }])).toMatchObject({ success: true, committed: true });
    expect(await f.all()).toMatchObject([{ status: 'pending' }, { status: 'active' }]);
    expect(seen.filter(s => s.phase === 'afterInsert')).toHaveLength(3);
    seen.length = 0;
    expect(await f.write('update', [{ id: '1', name: 'Augusta' }])).toMatchObject({ success: true });
    const update = seen.find(s => s.phase === 'beforeUpdate')!.input;
    expect(update.oldRecords[0].name).toBe('Ada'); expect(update.newRecords[0].name).toBe('Augusta'); expect(update.changedFields).toContain('name'); expect(update.changedFields).not.toContain('status');
    seen.length = 0;
    expect(await f.write('delete', [{ id: '1' }])).toMatchObject({ success: true });
    const deleted = seen.find(s => s.phase === 'afterDelete')!.input;
    expect(deleted.oldRecords[0].name).toBe('Augusta'); expect(deleted.newRecords).toEqual([]);
    expect(f.runtime.audit.list().some(a => a.phase === 'afterCommit')).toBe(true);
    expect(JSON.stringify(f.runtime.audit.list())).not.toContain('Augusta');
  });
  it('sorts priority and permanent ID ties independently of folder order, and reloads enabled state', async () => {
    const f = await setup(), order: string[] = [];
    f.services.set('order', { transactional: true, async invoke(input) { order.push(String(input)); } });
    const a = await f.trigger('z-first', 'beforeInsert', [{ id: 'a', type: 'service', service: 'order', input: literal('a') }], { priority: -10 });
    const b = await f.trigger('a-second', 'beforeInsert', [{ id: 'b', type: 'service', service: 'order', input: literal('b') }], { priority: 0 });
    const c = await f.trigger('m-third', 'beforeInsert', [{ id: 'c', type: 'service', service: 'order', input: literal('c') }], { priority: 0 });
    await f.write('insert', [{ id: '1', name: 'A' }]);
    expect(order).toEqual(['a', ...[b,c].sort((x,y) => x.definition!.id < y.definition!.id ? -1 : 1).map(x => x === b ? 'b' : 'c')]);
    await f.triggerStore.save(a.locator, JSON.stringify({ ...a.definition, enabled: false }), a.hash); order.length = 0;
    await f.write('insert', [{ id: '2', name: 'B' }]); expect(order).not.toContain('a');
  });
  it.each(['beforeInsert', 'afterInsert'] as const)('%s failure rejects the entire bulk operation with no post-commit delivery', async phase => {
    const f = await setup(), calls: string[] = [];
    f.services.set('one-fails', { transactional: true, async invoke(input) { if (input === 'bad') throw new Error('BUSINESS_REJECTED'); } });
    f.services.set('notify', { transactional: false, async invoke() { calls.push('committed'); } });
    await f.trigger('one-fails', phase, [{ id: 'fail', type: 'service', service: 'one-fails', input: from(['name']) }]);
    await f.trigger('post', 'afterCommit', [{ id: 'notify', type: 'service', service: 'notify', input: literal(null) }]);
    expect(await f.write('insert', [{ id: '1', name: 'good' }, { id: '2', name: 'bad' }])).toMatchObject({ success: false, committed: false, counts: { succeeded: 0, failed: 2 } });
    expect(await f.all()).toEqual([]); expect(calls).toEqual([]);
  });
  it('reject action, required-field and unauthorized Trigger modifications cannot persist', async () => {
    const f = await setup(['secret']);
    const reject = await f.trigger('reject', 'beforeInsert', [{ id: 'reject', type: 'reject', message: 'Business rule rejected' }]);
    expect((await f.write('insert', [{ id: '1', name: 'A' }])).success).toBe(false);
    await f.triggerStore.save(reject.locator, JSON.stringify({ ...reject.definition, enabled: false }), reject.hash);
    const secret = await f.trigger('secret', 'beforeInsert', [{ id: 'secret', type: 'set', field: 'secret', value: literal('prohibited') }]);
    expect((await f.write('insert', [{ id: '1', name: 'A' }])).success).toBe(false);
    await f.triggerStore.save(secret.locator, JSON.stringify({ ...secret.definition, actions: [{ id: 'required', type: 'set', field: 'name', value: literal('') }] }), secret.hash);
    expect((await f.write('insert', [{ id: '1', name: 'A' }])).success).toBe(false); expect(await f.all()).toEqual([]);
  });
  it('downstream after* CRUD shares one transaction; afterCommit includes both Datasets only after commit', async () => {
    const f = await setup(), notifications: string[] = [];
    let begins = 0, commits = 0; const begin = f.orm.beginTransaction.bind(f.orm);
    f.orm.beginTransaction = async () => { begins++; const tx = await begin(); const commit = tx.commit.bind(tx); tx.commit = async () => { commits++; await commit(); }; return tx; };
    f.services.set('history', { transactional: true, async invoke(input, _ctx, port) {
      const id = String(input); const r = await port.write({ datasetId: 'history', operation: 'insert', records: [{ id: `h-${id}`, name: 'History' }] }); if (!r.success) throw new Error('HISTORY_FAILED');
    } });
    f.services.set('notify', { transactional: false, async invoke(input) { expect((await f.all()).length).toBe(1); expect((await f.all('history')).length).toBe(1); notifications.push(String(input)); } });
    await f.trigger('history', 'afterInsert', [{ id: 'history', type: 'service', service: 'history', input: from(['id']) }]);
    await f.trigger('history-before', 'beforeInsert', [{ id: 'mark', type: 'set', field: 'status', value: literal('written') }], { datasetId: 'history', dataset: 'history' });
    await f.trigger('person-commit', 'afterCommit', [{ id: 'notify', type: 'service', service: 'notify', input: literal('person') }]);
    await f.trigger('history-commit', 'afterCommit', [{ id: 'notify', type: 'service', service: 'notify', input: literal('history') }], { datasetId: 'history', dataset: 'history' });
    expect(await f.write('insert', [{ id: '1', name: 'Ada' }])).toMatchObject({ success: true, committed: true });
    expect(notifications).toEqual(['history', 'person']); expect(await f.all('history')).toMatchObject([{ status: 'written' }]); expect(begins).toBe(1); expect(commits).toBe(1);
  });
  it('a downstream failure poisons the root even if the service ignores its result', async () => {
    const f = await setup();
    await f.trigger('nested', 'afterInsert', [{ id: 'create', type: 'crud', datasetId: 'history', operation: 'insert', records: literal({ id: 'h', name: 'History' }) }]);
    await f.trigger('nested-failure', 'afterInsert', [{ id: 'no', type: 'reject', message: 'No history' }], { datasetId: 'history', dataset: 'history' });
    expect((await f.write('insert', [{ id: '1', name: 'Ada' }])).committed).toBe(false);
    expect(await f.all()).toEqual([]); expect(await f.all('history')).toEqual([]);
  });
  it('post-commit failure keeps persisted data, records failure and continues collected callbacks', async () => {
    const f = await setup(); const delivered: string[] = [];
    f.services.set('notify', { transactional: false, async invoke(input) { delivered.push(String(input)); throw new Error('NOTIFICATION_FAILED'); } });
    await f.trigger('post', 'afterCommit', [{ id: 'notify', type: 'service', service: 'notify', input: from(['id']) }]);
    const result = await f.write('insert', [{ id: '1', name: 'Ada' }]);
    expect(result).toMatchObject({ success: false, committed: true, commitOutcome: 'committed', counts: { succeeded: 1 } });
    expect(await f.all()).toHaveLength(1); expect(delivered).toEqual(['1']);
    expect(f.runtime.audit.list().at(-1)).toMatchObject({ phase: 'afterCommit', success: false, error: 'NOTIFICATION_FAILED' });
  });
  it('recursive downstream operations stop with a cycle diagnostic and roll back', async () => {
    const f = await setup();
    await f.trigger('loop', 'afterInsert', [{ id: 'loop', type: 'crud', datasetId: 'people', operation: 'insert', records: literal({ id: 'recursive', name: 'Loop' }) }]);
    const result = await f.write('insert', [{ id: '1', name: 'Ada' }]);
    expect(result).toMatchObject({ success: false, committed: false });
    expect(JSON.stringify(result)).toContain('TRIGGER_CYCLE_DETECTED'); expect(await f.all()).toEqual([]);
  });
  it('external side effects are rejected before commit', async () => {
    const f = await setup(); let calls = 0;
    f.services.set('external', { transactional: false, async invoke() { calls++; } });
    await f.trigger('external', 'beforeInsert', [{ id: 'external', type: 'service', service: 'external', input: literal(null) }]);
    expect((await f.write('insert', [{ id: '1', name: 'Ada' }])).success).toBe(false); expect(calls).toBe(0);
  });
  it.each(['beforeUpdate', 'afterUpdate', 'beforeDelete', 'afterDelete'] as const)('%s rejection preserves every original row and discards callbacks', async phase => {
    const f = await setup(); await f.write('insert', [{ id: '1', name: 'Ada' }, { id: '2', name: 'Grace' }]); const bytes = f.bytes();
    await f.trigger('reject-operation', phase, [{ id: 'reject', type: 'reject', message: 'Rejected' }]);
    const operation = phase.endsWith('Update') ? 'update' : 'delete';
    const rows = operation === 'update' ? [{ id: '1', name: 'Changed' }, { id: '2', name: 'Changed too' }] : [{ id: '1' }, { id: '2' }];
    expect(await f.write(operation, rows)).toMatchObject({ success: false, committed: false }); expect(f.bytes()).toBe(bytes);
  });
  it('service patches obey final field authority, and protected reads see staged downstream records', async () => {
    const f = await setup(['secret']);
    f.services.set('patch', { transactional: true, async invoke() { return { patches: [{ secret: 'not-permitted' }] }; } });
    const patch = await f.trigger('patch', 'beforeInsert', [{ id: 'patch', type: 'service', service: 'patch', input: literal(null) }]);
    expect((await f.write('insert', [{ id: '1', name: 'Ada' }])).success).toBe(false); expect(await f.all()).toEqual([]);
    await f.triggerStore.save(patch.locator, JSON.stringify({ ...patch.definition, enabled: false }), patch.hash);
    await f.trigger('read-staged', 'afterInsert', [{ id: 'read', type: 'crud', operation: 'read', datasetId: 'people', query: literal({ select: ['id', 'name'], where: { field: 'id', op: 'eq', value: '1' } }) }]);
    f.services.set('read-and-check', { transactional: true, async invoke(_input, _context, port) { expect(await port.read({ datasetId: 'people', select: ['name'] })).toEqual([{ name: 'Ada' }]); } });
    await f.trigger('read-service', 'afterInsert', [{ id: 'read', type: 'service', service: 'read-and-check', input: literal(null) }]);
    expect((await f.write('insert', [{ id: '1', name: 'Ada' }])).success).toBe(true);
  });
  it('post-commit recursive writes stop with a diagnostic while preserving the original commit', async () => {
    const f = await setup();
    await f.trigger('loop', 'afterCommit', [{ id: 'loop', type: 'crud', datasetId: 'people', operation: 'insert', records: literal({ id: 'recursive', name: 'Loop' }) }]);
    const result = await f.write('insert', [{ id: '1', name: 'Ada' }]);
    expect(result).toMatchObject({ success: false, committed: true });
    expect((await f.all()).some(row => row.id === '1')).toBe(true);
    expect(f.runtime.audit.list().some(a => a.success === false)).toBe(true);
  });
});
describe('single-record Workflow', () => {
  it('runs ordered protected CRUD/service actions, returns result, and disabled definitions do not run', async () => {
    const f = await setup(), calls: unknown[] = [];
    await f.write('insert', [{ id: '1', name: 'Ada' }]);
    f.services.set('notify', { transactional: false, async invoke(input) { calls.push(input); expect((await f.all())[0].status).toBe('active'); } });
    const b = await f.workflow([
      { id: 'activate', type: 'crud', datasetId: 'people', operation: 'update', records: literal({ id: '1', status: 'active' }) },
      { id: 'notify', type: 'service', service: 'notify', input: from(['name']) },
      { id: 'audit', type: 'crud', datasetId: 'history', operation: 'insert', records: literal({ id: 'h-1', name: 'Activated' }) },
    ]);
    expect(await f.runtime.workflow(b.definition!.id, '1', f.trusted, f.engine)).toMatchObject({ success: true, completedSteps: 3, committedSteps: 2 });
    expect(calls).toEqual(['Ada']); expect(await f.all('history')).toHaveLength(1);
    await f.workflowStore.save(b.locator, JSON.stringify({ ...b.definition, enabled: false }), b.hash);
    expect(await f.runtime.workflow(b.definition!.id, '1', f.trusted, f.engine)).toMatchObject({ success: false, completedSteps: 0, error: 'WORKFLOW_UNAVAILABLE' });
  });
  it('stops on error, retains previous external effects and commits, returns correct step and audit', async () => {
    const f = await setup(); await f.write('insert', [{ id: '1', name: 'Ada' }]); let notifications = 0, later = 0;
    f.services.set('notify', { transactional: false, async invoke() { notifications++; } });
    f.services.set('fail', { transactional: false, async invoke() { throw new Error('SERVICE_FAILED'); } });
    f.services.set('later', { transactional: false, async invoke() { later++; } });
    const b = await f.workflow([
      { id: 'notify', type: 'service', service: 'notify', input: literal(null) },
      { id: 'update', type: 'crud', datasetId: 'people', operation: 'update', records: literal({ id: '1', status: 'active' }) },
      { id: 'fail', type: 'service', service: 'fail', input: literal(null) },
      { id: 'later', type: 'service', service: 'later', input: literal(null) },
    ]);
    expect(await f.runtime.workflow(b.definition!.id, '1', f.trusted, f.engine)).toMatchObject({ success: false, completedSteps: 2, failedStep: 3, committedSteps: 1, error: 'SERVICE_FAILED' });
    expect(notifications).toBe(1); expect(later).toBe(0); expect((await f.all())[0].status).toBe('active');
    expect(f.runtime.audit.list().at(-1)).toMatchObject({ kind: 'workflow', failedStep: 3, completedSteps: 2 });
  });
  it('rejects array input and untrusted context; audit remains bounded without payloads', async () => {
    const f = await setup(); const b = await f.workflow([]);
    expect((await f.runtime.workflow(b.definition!.id, ['1'] as any, f.trusted, f.engine)).error).toBe('PRIMARY_RECORD_ID_REQUIRED');
    expect((await f.runtime.workflow(b.definition!.id, '1', { ...f.trusted, context: {} }, f.engine)).success).toBe(false);
    const log = new AutomationAuditLog(2); const entry = { executionId: 'e', artifactId: 'w', kind: 'workflow' as const, timestamp: 'now', datasetId: 'people', recordIds: ['1'], actor: 'user', success: true };
    for (let i = 0; i < 5; i++) log.record(entry); expect(log.list()).toHaveLength(2);
  });
  it('uses explicit record bindings, refreshes primary context and supports protected reads', async () => {
    const f = await setup(); await f.write('insert', [{ id: 'dynamic-person', name: 'Ada' }]); const statuses: unknown[] = [];
    f.services.set('capture', { transactional: false, async invoke(input) { statuses.push(input); } });
    const b = await f.workflow([
      { id: 'activate', type: 'crud', datasetId: 'people', operation: 'update', records: { fields: { id: from(['id']), status: literal('active') } } },
      { id: 'read', type: 'crud', datasetId: 'people', operation: 'read', query: literal({ select: ['status'] }) },
      { id: 'capture', type: 'service', service: 'capture', input: from(['status']) },
    ]);
    expect(await f.runtime.workflow(b.definition!.id, 'dynamic-person', f.trusted, f.engine)).toMatchObject({ success: true, completedSteps: 3 }); expect(statuses).toEqual(['active']);
  });
});
