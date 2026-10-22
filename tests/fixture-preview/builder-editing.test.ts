import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorRuntimeContext } from '../../src/client/artifact-editor/context.js';
import { EditorWorkingCopy } from '../../src/client/artifact-editor/working-copy.js';
import { configureAutosave } from '../../src/client/artifact-editor/autosave-configuration.js';
import { invalidateEditorSession } from '../../src/client/artifact-editor/session.js';
import { BuilderWorkspaceCoordinator } from '../../src/client/builder-workspace/coordinator.js';
import { selectFixturePreview } from '../../src/client/builder-workspace/fixture-preview-binding.js';
import { workspaceIdentityKey, type WorkspaceArtifact } from '../../src/shared/builder-workspace.js';
import type { ArtifactEditorTransport, EditorArtifactDto, EditorSaveDto } from '../../src/shared/artifact-editor.js';
import { PreviewLifecycle, type PreviewIdentity } from '../../src/client/fixture-preview/lifecycle.js';
function artifact(locator = 'one'): EditorArtifactDto {
  const manifest = { artifactId: `synthetic-${locator}`, artifactType: 'fixture', schemaVersion: 1, definitionVersion: 1, name: locator, files: { definition: 'one.json' } };
  return { locator, manifest, manifestContent: JSON.stringify(manifest), files: [{ path: 'one.json', role: 'definition', content: '{"synthetic":1}' }, { path: 'two.txt', role: 'notes', content: 'synthetic saved notes' }], checksum: 'synthetic-baseline', capabilities: { edit: true, format: true }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] } } as EditorArtifactDto;
}
const identity: PreviewIdentity = { subjectId: 'synthetic-subject', sessionId: 'synthetic-session', applicationId: 'synthetic-app-id', artifactKey: '["application","synthetic-app-id","generic","synthetic-one"]' };
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function fixture() {
  const originalFetch = globalThis.fetch, sessions: string[] = [], saves: Array<{ time: number; locator: string; changes: EditorSaveDto }> = [];
  invalidateEditorSession();
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/editor/session'); assert.equal(init?.method ?? 'GET', 'GET'); sessions.push(String(url));
    return Response.json({ revision: 'synthetic-session', csrfToken: 'synthetic-not-a-credential', principal: { subjectId: 'synthetic-subject', label: 'Synthetic', roleIds: [], applicationKeys: ['synthetic'], isDevelopmentFixture: true }, fixtures: [] });
  };
  const stored = new Map(['one', 'two'].map(key => [key, artifact(key)])); let release: (() => void) | undefined, hold = false;
  const transport: ArtifactEditorTransport = {
    load: async key => { assert(stored.has(key)); return structuredClone(stored.get(key)!); },
    save: async (locator, changes) => {
      saves.push({ time: Date.now(), locator, changes: structuredClone(changes) });
      if (hold) await new Promise<void>(resolve => { release = resolve; });
      const next = structuredClone(stored.get(locator)!); assert.equal(changes.expectedChecksum, next.checksum);
      for (const file of next.files) if (changes.files && Object.hasOwn(changes.files, file.path)) file.content = changes.files[file.path]!;
      next.checksum += '-saved'; stored.set(locator, next); return { saved: true, artifact: structuredClone(next), validation: next.validation };
    }, validateSaved: async () => ({ valid: true, diagnostics: [] }), getReferences: async () => ({ outgoing: [] }), subscribe: () => () => {},
  };
  const contexts: EditorRuntimeContext[] = [];
  const context = new EditorRuntimeContext('synthetic', () => transport, undefined); contexts.push(context); await context.open('one');
  return { context, transport, stored, saves, sessions, hold() { hold = true; }, release() { hold = false; release?.(); }, async cleanup() { for (const item of contexts) { await item.discard(); await item.dispose(); } globalThis.fetch = originalFetch; invalidateEditorSession(); } };
}
function previewOperations() {
  const preview = new PreviewLifecycle(identity); const request = preview.refresh();
  preview.succeed(request, { identity, captureId: 'synthetic-capture', provenance: { kind: 'fixture', fixtureId: 'native-card-v1' }, content: 'synthetic' });
  preview.invalidate('sample'); preview.fail(preview.refresh(), 'denied'); preview.revoke('SIMULATED'); preview.dispose();
}
test('actual context and working copy preserve source, baseline/checksum and history with autosave disabled', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 }); configureAutosave({ enabled: false, delayMs: 2000 }); const f = await fixture();
  try {
    f.context.setFile('two.txt', 'dirty synthetic one'); f.context.setFile('two.txt', 'dirty synthetic two'); f.context.undo();
    const before = f.context.snapshot; const stored = structuredClone([...f.stored]);
    previewOperations(); t.mock.timers.tick(10000); await settle();
    assert.deepEqual(f.context.snapshot, before); assert.deepEqual([...f.stored], stored); assert.equal(f.saves.length, 0);
    f.context.redo(); assert.equal(f.context.snapshot?.artifact.files[1].content, 'dirty synthetic two'); f.context.undo(); assert.equal(f.context.snapshot?.artifact.files[1].content, 'dirty synthetic one');
    // Direct actual working-copy coverage exposes baseline/history size without substituting its implementation.
    const copy = new EditorWorkingCopy(artifact(), f.transport); copy.setFile('two.txt', 'dirty direct');
    const direct = structuredClone({ current: copy.lifecycle.current, baseline: copy.lifecycle.baseline, history: copy.lifecycle.historySize }); previewOperations();
    assert.deepEqual({ current: copy.lifecycle.current, baseline: copy.lifecycle.baseline, history: copy.lifecycle.historySize }, direct); await copy.discard();
  } finally { await f.cleanup(); configureAutosave({ enabled: true, delayMs: 2000 }); }
});
test('real context autosave timing is identical with and without Preview and tab changes during a pending save', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 });
  const traces = [];
  for (const withPreview of [false, true]) {
    const start = Date.now(); configureAutosave({ enabled: true, delayMs: 2000 }); const f = await fixture();
    try {
      f.hold(); f.context.setFile('two.txt', 'synthetic timer edit');
      t.mock.timers.tick(1000); if (withPreview) previewOperations();
      t.mock.timers.tick(999); await settle(); assert.equal(f.saves.length, 0);
      t.mock.timers.tick(1); await settle(); assert.equal(f.saves.length, 1); assert.equal(f.context.snapshot?.saveState, 'saving');
      const artifact: WorkspaceArtifact = { identity: { owner: { kind: 'application', id: 'synthetic-app-id' }, format: 'generic', id: 'synthetic-one' }, applicationId: 'synthetic-app-id', applicationKey: 'synthetic', locator: 'one', name: 'Synthetic', group: 'Other', kind: 'fixture', editable: true };
      const coordinator = new BuilderWorkspaceCoordinator(async (_app, target) => ({ ...artifact, identity: target.identity }), async () => ({ element: {} as HTMLElement, state: () => ({ dirty: !!f.context.snapshot?.dirty, pending: f.context.snapshot?.saveState === 'saving' }), focus: async () => {}, deactivate: () => {}, suspend: () => {}, guardClose: async () => false, dispose: async () => {} }), () => 'synthetic-subject');
      await coordinator.open('synthetic', { identity: artifact.identity }); coordinator.park(); await coordinator.open('synthetic', { identity: artifact.identity });
      if (withPreview) previewOperations(); assert.equal(f.saves.length, 1); assert.equal(f.context.snapshot?.saveState, 'saving');
      t.mock.timers.tick(500); f.release(); await settle();
      traces.push({ saves: f.saves.map(event => ({ ...event, time: event.time - start })), snapshot: f.context.snapshot, identity: workspaceIdentityKey(coordinator.tabs.values().next().value!.artifact.identity) });
      assert.equal(f.context.snapshot?.dirty, false); await coordinator.dispose();
    } finally { f.release(); await f.cleanup(); }
  }
  assert.deepEqual(traces[1], traces[0]);
});
test('shared Preview binding transmits only original owner-qualified identity and dirty status', () => {
  const artifact: WorkspaceArtifact = { identity: { owner: { kind: 'application', id: 'synthetic-owner' }, format: 'generic', id: 'synthetic-artifact' }, applicationId: 'permanent-application', applicationKey: 'mutable-key', locator: 'synthetic', name: 'Synthetic', kind: 'fixture', group: 'Other', editable: true };
  const calls: unknown[][] = []; const sink = { select: (...values: unknown[]) => { calls.push(values); } };
  selectFixturePreview(sink, { artifact, subjectId: 'original', sessionId: 'session', dirty: true });
  assert.deepEqual(calls[0], [{ subjectId: 'original', sessionId: 'session', applicationId: 'permanent-application', artifactKey: workspaceIdentityKey(artifact.identity) }, true]);
  assert(!JSON.stringify(calls).includes('mutable-key')); selectFixturePreview(sink); assert.deepEqual(calls[1], [undefined, false]);
});
