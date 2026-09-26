import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EditorArtifactDto, EditorSaveDto } from '../src/shared/artifact-editor.js';
import type { EditorSessionDto } from '../src/shared/editor-security.js';

function artifact(locator = 'one', content = 'original', checksum = 'baseline', editable = true): EditorArtifactDto {
  const manifest = { artifactId: locator, artifactType: 'form', schemaVersion: 1, definitionVersion: 1, name: locator, files: { definition: 'form.json' } };
  return { locator, manifest, manifestContent: JSON.stringify(manifest), files: [{ path: 'form.json', role: 'definition', content }], checksum,
    capabilities: { edit: editable, format: editable }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] } };
}
class Events extends EventTarget {
  static instances: Events[] = [];
  closed = false;
  constructor() { super(); Events.instances.push(this); }
  close() { this.closed = true; }
}
const cleanups: (() => Promise<unknown>)[] = [];
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); Events.instances = []; vi.stubGlobal('EventSource', Events); });
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function setup(editable = true) {
  let identity: EditorSessionDto = { revision: 'r1', csrfToken: 'csrf', principal: { subjectId: 'editor', label: 'Editor', roleIds: ['editor'], applicationKeys: ['alpha'], isDevelopmentFixture: true }, fixtures: [] };
  const disk = new Map(['one', 'two'].map(id => [id, artifact(id, 'original', 'baseline', editable)]));
  let saveError = 0;
  const saves: EditorSaveDto[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
    if (url === '/api/editor/session') return json(identity);
    const locator = url.split('/').at(-1)!;
    const saved = structuredClone(disk.get(locator)!);
    if (init?.method === 'PUT') {
      const changes = JSON.parse(String(init.body)) as EditorSaveDto; saves.push(changes);
      if (saveError) return json({ error: 'Save rejected', code: 'test.rejected' }, saveError);
      if (changes.expectedChecksum !== saved.checksum) return json({ error: 'Conflict', code: 'test.conflict' }, 409);
      if (changes.files?.['form.json']) saved.files[0].content = changes.files['form.json'];
      if (typeof changes.manifest === 'string') { saved.manifestContent = changes.manifest; saved.manifest = JSON.parse(changes.manifest); }
      saved.checksum += '-saved'; disk.set(locator, saved);
      return json({ saved: true, artifact: saved, validation: saved.validation });
    }
    return json(saved);
  });
  vi.stubGlobal('fetch', fetchMock);
  const session = await import('../src/client/artifact-editor/session.js');
  const { EditorRuntimeContext } = await import('../src/client/artifact-editor/context.js');
  const browser = new EventTarget();
  const added = vi.spyOn(browser, 'addEventListener'), removed = vi.spyOn(browser, 'removeEventListener');
  const context = new EditorRuntimeContext('alpha', undefined, browser as unknown as Window);
  cleanups.push(async () => { await context.discard(); await context.dispose(); });
  await context.open('one');
  return { context, disk, session, saves, fetchMock, added, removed,
    fail: (status: number) => { saveError = status; },
    switch: async (subjectId: string, revision: string) => {
      session.invalidateEditorSession(); identity = { ...identity, revision, principal: { ...identity.principal!, subjectId } }; await session.refreshEditorSession();
    } };
}
it('shares the latest copy across panel subscriptions and flushes it before artifact navigation', async () => {
  const f = await setup(); const seen: string[][] = [[], []];
  const detaches = seen.map(values => f.context.subscribe(() => { if (f.context.snapshot) values.push(f.context.snapshot.artifact.files[0].content); }));
  f.context.setFile('form.json', 'panel one');
  f.context.setManifest(JSON.stringify({ ...f.context.snapshot!.artifact.manifest, name: 'Panel two' }));
  expect(seen[0]).toEqual(seen[1]); expect(seen[0]).toContain('panel one');
  const detached = f.context.snapshot!; detached.artifact.files[0].content = 'not an edit';
  expect(f.context.snapshot!.artifact.files[0].content).toBe('panel one');
  expect(await f.context.open('two')).toBe(true); expect(f.saves).toHaveLength(1);
  expect(f.disk.get('one')?.manifest?.name).toBe('Panel two'); expect(f.disk.get('one')?.files[0].content).toBe('panel one');
  expect(f.added).toHaveBeenCalledTimes(2); expect(f.removed).toHaveBeenCalledTimes(1);
  detaches.forEach(detach => detach());
});
it('retains failed unsaved copies on navigation and cleanup until deliberate discard', async () => {
  const f = await setup(); f.fail(500); f.context.setFile('form.json', 'retained');
  expect(await f.context.open('two')).toBe(false); expect(f.context.snapshot?.artifact.locator).toBe('one');
  expect(await f.context.dispose()).toBe(false); expect(f.context.snapshot?.dirty).toBe(true);
  await f.context.discard(); expect(f.context.hasCopy).toBe(false); expect(Events.instances.every(e => e.closed)).toBe(true);
  expect(f.removed).toHaveBeenCalledTimes(1); await vi.advanceTimersByTimeAsync(5000); expect(f.saves).toHaveLength(2);
  f.fail(0); expect(await f.context.open('two')).toBe(true);
});
it('guards read-only mutations and does not expose edit actions through the context', async () => {
  const f = await setup(false); expect(f.context.canEdit).toBe(false);
  expect(() => f.context.setFile('form.json', 'forbidden')).toThrow('not authorized');
  expect(() => f.context.setManifest('{}')).toThrow('not authorized');
  await expect(f.context.flush()).rejects.toThrow('not authorized'); expect(f.saves).toHaveLength(0);
});
it('hides revoked source synchronously, cancels debounce, and requires the original identity for recovery', async () => {
  const f = await setup(); f.context.setFile('form.json', 'sensitive');
  await f.switch('reviewer', 'r2'); expect(f.context.snapshot).toBeUndefined(); expect(f.context.suspended).toBe(true);
  expect(f.context.canRecover).toBe(false); await expect(f.context.compare()).rejects.toThrow('original authorized');
  expect(f.context.reviewedComparison).toBeUndefined(); await vi.advanceTimersByTimeAsync(2500); expect(f.saves).toHaveLength(0);
  await f.switch('editor', 'r3'); expect(f.context.snapshot).toBeUndefined();
  await f.context.compare(); expect(f.context.reviewedComparison?.local.files[0].content).toBe('sensitive');
  await f.context.decide('resume'); expect(f.context.snapshot?.artifact.files[0].content).toBe('sensitive');
  await f.context.flush(); expect(f.disk.get('one')?.files[0].content).toBe('sensitive');
});
it.each(['reload', 'keep-local'] as const)('requires explicit changed-checksum recovery decision: %s', async choice => {
  const f = await setup(); f.context.setFile('form.json', 'local'); f.context.suspend();
  f.disk.set('one', artifact('one', 'external', 'changed')); await f.context.compare();
  await expect(f.context.decide('resume')).rejects.toThrow('Server source changed');
  expect(f.saves).toHaveLength(0); await f.context.decide(choice);
  expect(f.context.snapshot?.artifact.files[0].content).toBe(choice === 'reload' ? 'external' : 'local');
  await f.context.flush(); expect(f.disk.get('one')?.files[0].content).toBe(choice === 'reload' ? 'external' : 'local');
});
it('rejects a recovery decision when disk changed after the comparison', async () => {
  const f = await setup(); f.context.setFile('form.json', 'local'); f.context.suspend(); await f.context.compare();
  f.disk.set('one', artifact('one', 'changed again', 'new'));
  await expect(f.context.decide('keep-local')).rejects.toThrow('changed again');
  expect(f.context.suspended).toBe(true); expect(f.context.reviewedComparison).toBeUndefined(); expect(f.saves).toHaveLength(0);
});
it('does not recover dirty edits into read-only authorization and reload adopts fresh capabilities', async () => {
  const f = await setup(); f.context.setFile('form.json', 'local'); f.context.suspend();
  f.disk.set('one', artifact('one', 'original', 'baseline', false)); await f.context.compare();
  await expect(f.context.decide('resume')).rejects.toThrow('reading only');
  await f.context.decide('reload'); expect(f.context.canEdit).toBe(false); expect(f.context.snapshot?.dirty).toBe(false);
});
it('handles ordinary save conflicts through fresh comparison and explicit replacement', async () => {
  const f = await setup(); f.context.setFile('form.json', 'local'); f.disk.set('one', artifact('one', 'external', 'changed'));
  await f.context.flush(); expect(f.context.snapshot?.saveState).toBe('conflict');
  expect(await f.context.open('two')).toBe(false); await f.context.compare(); await f.context.decide('keep-local');
  await f.context.flush(); expect(f.saves.at(-1)?.expectedChecksum).toBe('changed'); expect(f.disk.get('one')?.files[0].content).toBe('local');
});
it('removes comparison source on another identity change and removes subscriptions on disposal', async () => {
  const f = await setup(); await f.context.compare(); expect(f.context.reviewedComparison).toBeDefined();
  await f.switch('reviewer', 'r2'); expect(f.context.reviewedComparison).toBeUndefined();
  const listener = vi.fn(); f.context.subscribe(listener); await f.context.discard(); await f.context.dispose();
  listener.mockClear(); f.session.invalidateEditorSession(); expect(listener).not.toHaveBeenCalled();
  expect(f.removed).toHaveBeenCalledTimes(1); expect(Events.instances.every(e => e.closed)).toBe(true);
  // Already disposed; prevent the test cleanup from calling operations again.
  cleanups.splice(0);
});

it('rejects a late open response from the previous session and permits a fresh open', async () => {
  const f = await setup(); const original = f.fetchMock.getMockImplementation()!;
  let release!: (value: Response) => void;
  f.fetchMock.mockImplementation((url, init) => url.endsWith('/two') ? new Promise(resolve => { release = resolve; }) : original(url, init));
  const opening = f.context.open('two'); const rejected = expect(opening).rejects.toThrow('Access changed');
  await vi.advanceTimersByTimeAsync(0); await f.switch('reviewer', 'r2');
  release(Response.json(artifact('two', 'must stay hidden'))); await rejected;
  expect(f.context.snapshot).toBeUndefined(); expect(f.context.hasCopy).toBe(false);
  f.fetchMock.mockImplementation(original); expect(await f.context.open('two')).toBe(true);
});

it('waits for an admitted save before comparing a suspended copy, without claiming cancellation', async () => {
  const f = await setup(); const original = f.fetchMock.getMockImplementation()!;
  let release!: (value: Response) => void;
  f.fetchMock.mockImplementation((url, init) => init?.method === 'PUT' ? new Promise(resolve => { release = resolve; }) : original(url, init));
  f.context.setFile('form.json', 'admitted'); await vi.advanceTimersByTimeAsync(2000);
  expect(f.context.snapshot?.saveState).toBe('saving'); await f.switch('editor', 'r2');
  const comparing = f.context.compare(); await vi.advanceTimersByTimeAsync(0);
  expect(f.context.reviewedComparison).toBeUndefined();
  const saved = artifact('one', 'admitted', 'committed'); f.disk.set('one', saved);
  release(Response.json({ saved: true, artifact: saved, validation: saved.validation })); await comparing;
  expect(f.context.reviewedComparison?.remote.checksum).toBe('committed');
  expect(f.context.suspended).toBe(true); expect(f.context.reviewedComparison?.local.files[0].content).toBe('admitted');
});
