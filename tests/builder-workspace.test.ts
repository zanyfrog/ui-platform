import { expect, it, vi } from 'vitest';
import { BuilderWorkspaceCoordinator, type WorkspaceEditorAdapter } from '../src/client/builder-workspace/coordinator.js';
import { workspaceIdentityKey, type AuthorizedWorkspaceArtifact, type WorkspaceIdentity } from '../src/shared/builder-workspace.js';

const artifact = (id: string, app = 'a', format: WorkspaceIdentity['format'] = 'visual'): AuthorizedWorkspaceArtifact => ({
  identity: { owner: { kind: 'application', id: app }, format, id }, applicationKey: app, applicationId: app, locator: `${id}.json`, name: id, group: 'Pages', kind: 'page', editable: true,
});
function harness() {
  let subject: string | undefined = 'original';
  const editors: Array<WorkspaceEditorAdapter & { selectedNode: string; section: string; dirty: boolean }> = [];
  const authorize = vi.fn(async (app: string, target: { identity: WorkspaceIdentity }) => ({ ...artifact(target.identity.id!, app, target.identity.format), identity: target.identity }));
  const mount = vi.fn(async () => {
    const editor = { element: {} as HTMLElement, selectedNode: 'node-1', section: 'metadata', dirty: false,
      focus: vi.fn(async () => {}), deactivate: vi.fn(), suspend: vi.fn(), state: () => ({ dirty: editor.dirty, pending: false }),
      guardClose: vi.fn(async () => !editor.dirty), dispose: vi.fn(async () => {}),
    }; editors.push(editor); return editor;
  });
  const host = new BuilderWorkspaceCoordinator(authorize, mount, () => subject);
  return { host, authorize, mount, editors, subject: (next: string | undefined) => { subject = next; } };
}
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
it('WP4 A18 retains an owner-qualified link origin and rejects canceled ownership, closed tabs and identity changes', async () => {
  const h = harness(), form = artifact('form'); form.identity.owner = { kind:'platform', id:'platform' };
  await h.host.open('a', form); const origin = h.host.captureLinkOrigin();
  await h.host.open('a', artifact('dataset', 'a', 'generic')); expect(h.host.assertLinkOrigin(origin).key).toBe(origin.key);
  h.subject('another'); expect(() => h.host.assertLinkOrigin(origin)).toThrow('STALE'); h.subject('original');
  await h.host.close(origin.key); expect(() => h.host.assertLinkOrigin(origin)).toThrow('STALE');
  await h.host.open('a', form); const next = h.host.captureLinkOrigin(); h.host.suspend(); expect(() => h.host.assertLinkOrigin(next)).toThrow('STALE'); await h.host.dispose();
});

it('A/B/A reuses independent editors and retains selected node, section and invalid local draft without saving', async () => {
  const h = harness(), a = artifact('page'), b = artifact('dataset', 'a', 'generic');
  await h.host.open('a', a); h.editors[0].dirty = true;
  await h.host.open('a', b); await h.host.open('a', a);
  expect(h.mount).toHaveBeenCalledTimes(2); expect(h.authorize).toHaveBeenCalledTimes(3);
  expect(h.editors[0]).toMatchObject({ selectedNode: 'node-1', section: 'metadata', dirty: true });
  expect(h.host.focused).toBe(workspaceIdentityKey(a.identity));
  expect(await h.host.close(workspaceIdentityKey(a.identity))).toBe(false);
  expect(await h.host.close(workspaceIdentityKey(b.identity))).toBe(true);
  expect(h.editors[1].dispose).toHaveBeenCalledOnce(); expect(h.editors[0].dispose).not.toHaveBeenCalled();
});
it('owner-qualified identities prevent Application collisions; repair locators cannot impersonate permanent identities', () => {
  expect(workspaceIdentityKey(artifact('same', 'a').identity)).not.toBe(workspaceIdentityKey(artifact('same', 'b').identity));
  const id = artifact('same').identity;
  expect(workspaceIdentityKey({ ...id, id: undefined, repairLocator: 'same' })).not.toBe(workspaceIdentityKey(id));
  expect(() => workspaceIdentityKey({ ...id, repairLocator: 'same' })).toThrow();
  expect(() => workspaceIdentityKey({ ...id, id: undefined })).toThrow();
});
it('shared Form and Component use one Platform definition tab across Applications with fresh contextual authorization', async () => {
  const h = harness(), component = artifact('form'); component.identity.owner = { kind: 'platform', id: 'platform' };
  await h.host.open('a', component); await h.host.open('b', component);
  expect(h.mount).toHaveBeenCalledOnce(); expect(h.host.tabs.size).toBe(1);
  expect(h.authorize.mock.calls.map(call => call[0])).toEqual(['a', 'b']);
  expect([...h.host.tabs.values()][0].artifact.applicationKey).toBe('b');
});
it('stale authorization cannot mount, reveal or focus an old target', async () => {
  const h = harness(), wait = deferred<AuthorizedWorkspaceArtifact>(), a = artifact('a'), b = artifact('b');
  h.authorize.mockImplementationOnce(() => wait.promise);
  const first = h.host.open('a', a); await h.host.open('a', b); wait.resolve(a);
  expect(await first).toBe(false); expect(h.mount).toHaveBeenCalledOnce();
  expect(h.host.focused).toBe(workspaceIdentityKey(b.identity));
});
it('closing a retained tab cancels its in-flight reauthorization instead of reopening it', async () => {
  const h = harness(), a = artifact('a'); await h.host.open('a', a);
  const wait = deferred<AuthorizedWorkspaceArtifact>(); h.authorize.mockImplementationOnce(() => wait.promise);
  const pending = h.host.open('a', a);
  await h.host.close(workspaceIdentityKey(a.identity)); wait.resolve(a);
  expect(await pending).toBe(false); expect(h.mount).toHaveBeenCalledOnce();
  expect(h.host.tabs.size).toBe(0); expect(h.host.focused).toBeUndefined();
});
it('stale mount is disposed without affecting the focused editor', async () => {
  const h = harness(), a = artifact('a'), b = artifact('b');
  const editor = await h.mount(), wait = deferred<WorkspaceEditorAdapter>();
  h.mount.mockImplementationOnce(() => wait.promise as ReturnType<typeof h.mount>);
  const first = h.host.open('a', a); await Promise.resolve(); await Promise.resolve();
  await h.host.open('a', b); wait.resolve(editor); expect(await first).toBe(false);
  expect(editor.dispose).toHaveBeenCalledOnce(); expect(h.host.focused).toBe(workspaceIdentityKey(b.identity));
});
it('revocation quarantines every retained editor and another subject cannot recover original source', async () => {
  const h = harness(), a = artifact('a'); await h.host.open('a', a); h.host.suspend();
  expect(h.host.focused).toBeUndefined(); expect(h.editors[0].suspend).toHaveBeenCalledOnce();
  h.subject('other'); await expect(h.host.open('a', a)).rejects.toThrow('original identity');
  h.subject('original'); await h.host.open('a', a); expect(h.mount).toHaveBeenCalledOnce();
});
it('denied direct navigation and mismatched permanent identity never focus source', async () => {
  const h = harness(), a = artifact('a'); await h.host.open('a', a);
  h.authorize.mockRejectedValueOnce(new Error('denied')); await expect(h.host.open('a', artifact('b'))).rejects.toThrow('denied');
  expect(h.host.focused).toBeUndefined();
  h.authorize.mockResolvedValueOnce(artifact('forged')); await expect(h.host.open('a', a)).rejects.toThrow('WORKSPACE_IDENTITY_CHANGED');
  expect(h.mount).toHaveBeenCalledOnce();
});
it('adapter focus failure suspends only its tab and disposal failure cannot remove another tab', async () => {
  const h = harness(), a = artifact('a'), b = artifact('b'); await h.host.open('a', a); await h.host.open('a', b);
  h.editors[0].focus.mockRejectedValueOnce(new Error('adapter failure'));
  await expect(h.host.open('a', a)).rejects.toThrow('adapter failure'); expect(h.editors[0].suspend).toHaveBeenCalledOnce();
  h.editors[0].dispose.mockRejectedValueOnce(new Error('cleanup failure'));
  await expect(h.host.close(workspaceIdentityKey(a.identity))).rejects.toThrow('cleanup failure');
  await h.host.open('a', b); expect(h.host.tabs.size).toBe(1); expect(h.editors[1].dispose).not.toHaveBeenCalled();
});
it('park and pending close do not save or dispose retained work; full disposal isolates failures', async () => {
  const h = harness(); await h.host.open('a', artifact('a')); h.editors[0].guardClose.mockResolvedValueOnce(false);
  expect(await h.host.close(workspaceIdentityKey(artifact('a').identity))).toBe(false);
  h.host.park(); expect(h.editors[0].dispose).not.toHaveBeenCalled();
  await h.host.dispose(); expect(h.editors[0].dispose).toHaveBeenCalledOnce();
  expect(await h.host.open('a', artifact('b'))).toBe(false);
});
