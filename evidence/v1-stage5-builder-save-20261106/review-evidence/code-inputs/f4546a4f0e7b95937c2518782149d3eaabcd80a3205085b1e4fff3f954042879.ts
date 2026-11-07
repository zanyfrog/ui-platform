import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EditorWorkingCopyHost } from '../src/client/artifact-editor/working-copy.js';
import type { EditorArtifactDto } from '../src/shared/artifact-editor.js';
import type { EditorSessionDto } from '../src/shared/editor-security.js';

class Events extends EventTarget {
  static instances: Events[] = [];
  closed = false;
  constructor(readonly url: string) { super(); Events.instances.push(this); }
  close() { this.closed = true; }
}
beforeEach(() => { vi.resetModules(); Events.instances = []; vi.stubGlobal('EventSource', Events); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function session(role = 'editor', revision = 'one'): EditorSessionDto {
  return { revision, csrfToken: 'csrf', principal: { subjectId: `dev-${role}`, label: `${role}@uib.test`, roleIds: [role], applicationKeys: ['alpha'], isDevelopmentFixture: true }, fixtures: ['editor', 'reviewer', 'admin'].map(role => ({ id: `dev-${role}`, label: `${role}@uib.test` })) };
}
function artifact(content = 'original', checksum = 'one'): EditorArtifactDto {
  const manifest = { artifactId: 'public-form', artifactType: 'form', schemaVersion: 1, definitionVersion: 1, name: 'Form', files: { definition: 'form.json' } };
  return { locator: 'opaque', manifest, manifestContent: JSON.stringify(manifest), files: [{ path: 'form.json', role: 'definition', content }], checksum, capabilities: { edit: true, format: true }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] } };
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
async function setup() {
  let identity = session();
  const saves: RequestInit[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/editor/session') {
      if (init?.method === 'POST') identity = session(JSON.parse(String(init.body)).fixtureId.replace('dev-', ''), 'two');
      return json(identity);
    }
    if (init?.method === 'PUT') {
      saves.push(init); const changes = JSON.parse(String(init.body)), saved = artifact(changes.files?.['form.json'], 'two');
      return json({ saved: true, artifact: saved, validation: saved.validation });
    }
    return json(artifact());
  });
  vi.stubGlobal('fetch', fetchMock);
  const state = await import('../src/client/artifact-editor/session.js');
  const transport = await import('../src/client/artifact-editor/transport.js');
  const host = new EditorWorkingCopyHost(transport.createArtifactEditorTransport('alpha'));
  const copy = await host.open('opaque');
  return { state, transport, host, copy, saves, fetchMock, setIdentity: (next: EditorSessionDto) => { identity = next; } };
}

it('preserves the existing two-second debounce and binds saves to server session headers', async () => {
  vi.useFakeTimers(); const f = await setup();
  expect(await f.host.open('opaque')).toBe(f.copy);
  f.copy.setFile('form.json', 'first'); await vi.advanceTimersByTimeAsync(1900);
  f.copy.setFile('form.json', 'second'); await vi.advanceTimersByTimeAsync(1999); expect(f.saves).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1); expect(f.saves).toHaveLength(1);
  expect(f.saves[0].headers).toMatchObject({ 'x-editor-revision': 'one', 'x-editor-csrf': 'csrf' });
  expect(f.copy.snapshot.saveState).toBe('saved'); expect(await f.host.close('opaque')).toBe(true);
});
it.each(['reviewer', 'admin'])('blocks queued writes when switching to %s, preserving local contents and failed-close behavior', async role => {
  vi.useFakeTimers(); const f = await setup(); f.copy.setFile('form.json', 'unsaved local');
  await f.state.selectEditorIdentity(`dev-${role}`);
  await vi.advanceTimersByTimeAsync(2000);
  expect(f.saves).toHaveLength(0); expect(f.copy.snapshot.saveState).toBe('error');
  expect(f.copy.snapshot.artifact.files[0].content).toBe('unsaved local'); expect(f.copy.snapshot.dirty).toBe(true);
  expect(await f.host.close('opaque')).toBe(false); expect(Events.instances[0].closed).toBe(true);
  // Changing back must never reactivate an old copy's pending writes.
  f.setIdentity(session('editor', 'three')); await f.state.refreshEditorSession(); await f.copy.flush(); expect(f.saves).toHaveLength(0);
});
it('rejects stale in-flight responses after switching, without accepting old formatting or sending the next save', async () => {
  vi.useFakeTimers(); const f = await setup();
  let resolve!: (response: Response) => void;
  const original = f.fetchMock.getMockImplementation()!;
  f.fetchMock.mockImplementation((url, init) => init?.method === 'PUT' ? new Promise(done => { resolve = done; }) : original(url, init));
  f.copy.setFile('form.json', 'first'); const saving = f.copy.flush(); await vi.advanceTimersByTimeAsync(0);
  f.copy.setFile('form.json', 'newer local');
  await f.state.selectEditorIdentity('dev-reviewer');
  const saved = artifact('formatted first', 'two'); resolve(json({ saved: true, artifact: saved, validation: saved.validation })); await saving;
  expect(f.copy.snapshot.artifact.files[0].content).toBe('newer local'); expect(f.copy.snapshot.saveState).toBe('error');
  await vi.advanceTimersByTimeAsync(2500);
  expect(f.fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
});
it('detects a session changed by another tab or server revocation and locks controls immediately', async () => {
  const f = await setup();
  const { guardEditorControls } = await import('../src/client/artifact-editor/identity-selector.js');
  const mutation = { disabled: false }, editOnly = { hidden: false };
  const container = { hidden: false, querySelectorAll: (selector: string) => selector === '[data-editor-mutation]' ? [mutation] : [editOnly], toggleAttribute: vi.fn() };
  const cleanup = guardEditorControls(container as unknown as HTMLElement, true);
  expect(mutation.disabled).toBe(false);
  f.state.invalidateEditorSession();
  expect(mutation.disabled).toBe(true); expect(editOnly.hidden).toBe(true); expect(container.hidden).toBe(true);
  f.copy.setFile('form.json', 'retained'); await f.copy.flush(); expect(f.saves).toHaveLength(0);
  expect(f.copy.snapshot.error).toContain('Access changed'); cleanup();
});
it('locks a denied transport and stops retrying unauthorized saves', async () => {
  const f = await setup();
  f.fetchMock.mockResolvedValueOnce(json({ code: 'editor.forbidden', error: 'Denied' }, 403));
  f.copy.setFile('form.json', 'retained'); await f.copy.flush();
  expect(f.copy.snapshot.saveState).toBe('error'); expect(f.state.editorSessionSnapshot()).toBeUndefined();
  const count = f.fetchMock.mock.calls.length; await f.copy.flush(); expect(f.fetchMock).toHaveBeenCalledTimes(count);
});
it('refreshes identity after SSE disconnect and closes subscriptions when its revision changes', async () => {
  const f = await setup(); f.setIdentity(session('reviewer', 'revoked'));
  Events.instances[0].dispatchEvent(new Event('error'));
  await vi.waitFor(() => expect(Events.instances[0].closed).toBe(true));
  f.copy.setFile('form.json', 'local'); await f.copy.flush(); expect(f.saves).toHaveLength(0);
});
it('does not show editing actions for an authorized read-only artifact', async () => {
  await setup(); const { guardEditorControls } = await import('../src/client/artifact-editor/identity-selector.js');
  const mutation = { disabled: false }, editOnly = { hidden: false };
  const container = { querySelectorAll: (selector: string) => selector === '[data-editor-mutation]' ? [mutation] : [editOnly], toggleAttribute: vi.fn() };
  const cleanup = guardEditorControls(container as unknown as HTMLElement, false);
  expect(mutation.disabled).toBe(true); expect(editOnly.hidden).toBe(true); cleanup();
});

it('suspends at identity change and permits recovery only after the original user is reauthorized', async () => {
  const f = await setup(); const { suspendCopyOnIdentityChange, recoverSuspendedCopy } = await import('../src/client/artifact-editor/recovery.js');
  f.copy.setFile('form.json', 'sensitive local recovery'); const detach = suspendCopyOnIdentityChange(f.copy, 'dev-editor');
  f.state.invalidateEditorSession(); expect(f.copy.snapshot.artifact.files[0].content).toBe('sensitive local recovery');
  f.setIdentity(session('reviewer', 'two')); await f.state.refreshEditorSession();
  await expect(recoverSuspendedCopy({ copy: f.copy, originalSubjectId: 'dev-editor', applicationKey: 'alpha', transport: f.transport.createArtifactEditorTransport('alpha') })).rejects.toMatchObject({ code: 'editor.recovery-forbidden' });
  f.state.invalidateEditorSession(); f.setIdentity(session('editor', 'three')); await f.state.refreshEditorSession();
  const transport = f.transport.createArtifactEditorTransport('alpha');
  f.fetchMock.mockImplementation(async (url, init) => url === '/api/editor/session' ? json(session('editor', 'three')) : init?.method === 'PUT' ? json({ saved: true, artifact: artifact('server changed', 'remote'), validation: artifact().validation }) : json(artifact('server changed', 'remote')));
  await expect(recoverSuspendedCopy({ copy: f.copy, originalSubjectId: 'dev-editor', applicationKey: 'alpha', transport })).rejects.toMatchObject({ code: 'editor.recovery-conflict' });
  expect(f.copy.snapshot.saveState).toBe('pending');
  // Restore the authorized session mock and explicitly merge onto the fresh server snapshot.
  await recoverSuspendedCopy({ copy: f.copy, originalSubjectId: 'dev-editor', applicationKey: 'alpha', transport, resolution: { merged: artifact('merged local and remote', 'remote') } });
  expect(f.copy.snapshot.artifact.files[0].content).toBe('merged local and remote');
  detach();
});
