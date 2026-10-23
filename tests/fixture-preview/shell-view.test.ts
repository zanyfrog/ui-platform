import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderWorkspaceCoordinator, type WorkspaceEditorAdapter } from '../../src/client/builder-workspace/coordinator.js';
import { workspaceIdentityKey, type AuthorizedWorkspaceArtifact } from '../../src/shared/builder-workspace.js';

test('shared view module import creates no DOM, request, scheduler or session subscription', async () => {
  const calls: string[] = [], keys = ['document', 'window', 'fetch', 'setTimeout', 'setInterval'];
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { calls.push(key); throw new Error(`IMPORT_EFFECT:${key}`); } });
    const module = await import('../../src/client/builder-workspace/shell-view.js');
    assert.equal(typeof module.createBuilderShellView, 'function'); assert.deepEqual(calls, []);
  } finally { for (const key of keys) { const descriptor = previous.get(key); if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } }
});
test('production tab formatter preserves dirty/pending/conflict and suspension labels', async () => {
  const { shellTabLabel } = await import('../../src/client/builder-workspace/shell-view.js');
  const tab = { artifact: { name: 'Synthetic' } as AuthorizedWorkspaceArtifact, suspended: false, state: { dirty: true, pending: true, conflict: true } };
  assert.equal(shellTabLabel(tab), 'Synthetic • (pending) (conflict)');
  assert.equal(shellTabLabel({ ...tab, suspended: true }), 'Suspended artifact');
  assert.equal(shellTabLabel({ ...tab, state: { dirty: false, pending: false } }), 'Synthetic');
});
const artifact = (id: string): AuthorizedWorkspaceArtifact => ({ identity: { owner: { kind: 'application', id: 'synthetic-owner' }, format: 'generic', id }, applicationId: 'synthetic-owner', applicationKey: 'synthetic-key', locator: id, name: id, group: 'Other artifacts', kind: 'fixture', editable: true });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function editor(overrides: Partial<WorkspaceEditorAdapter> = {}): WorkspaceEditorAdapter { return { element: {} as HTMLElement, state: () => ({ dirty: true, pending: false }), focus: async () => {}, deactivate() {}, suspend() {}, guardClose: async () => false, dispose: async () => {}, ...overrides }; }
test('actual coordinator rejects late synthetic authorization without retargeting the newest selection', async () => {
  const slow = deferred<AuthorizedWorkspaceArtifact>();
  const coordinator = new BuilderWorkspaceCoordinator(async (_key, target) => target.identity.id === 'one' ? slow.promise : artifact('two'), async () => editor(), () => 'synthetic-subject');
  const first = coordinator.open('synthetic-key', { identity: artifact('one').identity });
  assert(await coordinator.open('synthetic-key', { identity: artifact('two').identity }));
  slow.resolve(artifact('one')); assert.equal(await first, false);
  assert.equal(coordinator.focused, workspaceIdentityKey(artifact('two').identity)); await coordinator.dispose();
});
test('actual coordinator rejects superseded focus completion and deactivates the outgoing adapter', async () => {
  const slow = deferred<void>(), entered = deferred<void>(); let deactivated = 0;
  const coordinator = new BuilderWorkspaceCoordinator(async (_key, target) => artifact(target.identity.id!), async value => value.identity.id === 'one' ? editor({ focus: async () => { entered.resolve(); await slow.promise; }, deactivate() { deactivated++; } }) : editor(), () => 'synthetic-subject');
  const first = coordinator.open('synthetic-key', { identity: artifact('one').identity }); await entered.promise;
  assert(await coordinator.open('synthetic-key', { identity: artifact('two').identity }));
  slow.resolve(); assert.equal(await first, false); assert.equal(deactivated, 1);
  assert.equal(coordinator.focused, workspaceIdentityKey(artifact('two').identity)); await coordinator.dispose();
});
test('park and local subject suspension cancel pending focus without discarding retained tabs', async () => {
  const slow = deferred<AuthorizedWorkspaceArtifact>(); let subject = 'synthetic-subject', suspended = 0, disposed = 0;
  const coordinator = new BuilderWorkspaceCoordinator(async (_key, target) => target.identity.id === 'late' ? slow.promise : artifact('one'), async () => editor({ suspend() { suspended++; }, dispose: async () => { disposed++; } }), () => subject);
  await coordinator.open('synthetic-key', { identity: artifact('one').identity });
  const pending = coordinator.open('synthetic-key', { identity: artifact('late').identity }); coordinator.park();
  slow.resolve(artifact('late')); assert.equal(await pending, false); assert.equal(coordinator.tabs.size, 1); assert.equal(disposed, 0);
  subject = 'replacement'; coordinator.suspend(); assert.equal(suspended, 1); assert.equal(coordinator.focused, undefined);
  assert(coordinator.tabs.values().next().value!.suspended); await coordinator.dispose(); assert.equal(disposed, 1);
});
