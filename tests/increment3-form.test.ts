import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachFormRuntime } from '../packages/visual-artifacts/src/form-runtime.js';
class Root extends EventTarget {
  dataset = { uipNode: 'form' };
  querySelector() { return null; }
}
async function formRun(initial: any[], write: (intent: any) => any) {
  const previous = (globalThis as any).HTMLElement; (globalThis as any).HTMLElement = Root;
  const root = new Root(), state: any = {}; let saved: any[] = initial, queries = 0;
  const metadata: any = { form: { assignment: true, node: 'form', datasetId: 'assignments', primaryKey: 'id', fields: [{ id: 'patrol', node: 'patrol', key: 'patrolId', datasetFieldId: 'p', type: 'string', editable: true }], submit: { service: 'write', readService: 'read' } }, public: { events: {} } };
  let writes = 0;
  const runtime = attachFormRuntime(metadata, root as any, state, { services: {
    read: async () => { queries++; return saved; },
    write: async (intent: any) => { writes++; const result = await write(intent); if (result?.committed) saved = [{ ...intent.records[0], revision: 'new-revision' }]; return result; },
  } }, () => ({ operation: 'edit', recordId: 'scout-permanent-id' }), () => {}, () => {});
  runtime.paint(); await new Promise(resolve => setImmediate(resolve));
  state.values.patrolId = 'selected-patrol-id';
  root.dispatchEvent(new Event('uib-forms-form-submit')); await new Promise(resolve => setImmediate(resolve));
  runtime.destroy(); (globalThis as any).HTMLElement = previous;
  return { state, writes, queries };
}
test('Assignment Form uses Scout ID for first creation and does not send a client revision', async () => {
  const run = await formRun([], intent => {
    assert.equal(intent.operation, 'insert'); assert.equal(intent.records[0].id, 'scout-permanent-id');
    assert.equal(intent.expectedRevision, undefined); assert.equal(intent.records[0].revision, undefined);
    return { success: true, committed: true };
  });
  assert.equal(run.writes, 1); assert.equal(run.state.savedRecord.revision, 'new-revision');
});
test('Assignment Form sends the read revision separately for an update', async () => {
  const run = await formRun([{ id: 'scout-permanent-id', patrolId: '', revision: 'read-revision' }], intent => {
    assert.equal(intent.operation, 'update'); assert.equal(intent.expectedRevision, 'read-revision');
    assert.deepEqual(intent.records, [{ id: 'scout-permanent-id', patrolId: 'selected-patrol-id' }]);
    return { success: true, committed: true };
  });
  assert.equal(run.writes, 1);
});
test('Assignment Form reports conflict and never automatically retries unknown outcomes', async () => {
  const conflict = await formRun([{ id: 'scout-permanent-id', revision: 'read-revision' }], () => ({ success: false, committed: false, commitOutcome: 'not-committed', errors: [{ code: 'ASSIGNMENT_REVISION_CONFLICT' }] }));
  assert.match(conflict.state.submitError, /ASSIGNMENT_REVISION_CONFLICT/); assert.equal(conflict.writes, 1);
  const unknown = await formRun([], () => { throw Error('connection interrupted'); });
  assert.equal(unknown.state.commitOutcome, 'unknown'); assert.equal(unknown.writes, 1); assert.match(unknown.state.submitError, /outcome is unknown/);
});
