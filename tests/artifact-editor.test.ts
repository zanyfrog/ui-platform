import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ArtifactEditorWorkspace, editorError } from '../src/server/artifact-editor.js';
import { EditorWorkingCopy, EditorWorkingCopyHost } from '../src/client/artifact-editor/working-copy.js';
import { EditorTransportError, type EditorArtifactDto, type ArtifactEditorTransport, type EditorSaveResponse } from '../src/shared/artifact-editor.js';

const roots: string[] = [];
afterEach(async () => { vi.useRealTimers(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const manifest = { schemaVersion: 1, definitionVersion: 1, artifactId: 'form_test', artifactType: 'form', name: 'test', files: { definition: 'form.json' } };
async function fixture(source = JSON.stringify(manifest)) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'editor-')); roots.push(root);
  const bundle = path.join(root, 'forms', 'test'); await mkdir(bundle, { recursive: true });
  await writeFile(path.join(bundle, 'artifact.json'), source); await writeFile(path.join(bundle, 'form.json'), '{"fields":[]}');
  const publish = vi.fn(), build = { onSourceChanged: vi.fn(async () => {}) };
  const workspace = new ArtifactEditorWorkspace(root, 'test', publish, build);
  const [summary] = await workspace.discover();
  return { root, bundle, workspace, publish, build, locator: summary.locator };
}
it('preserves malformed manifests and unknown types, uses opaque scoped locators, and repairs source', async () => {
  const { workspace, locator, root, publish, build } = await fixture('{broken');
  const artifact = await workspace.load(locator);
  expect(artifact.manifest).toBeNull(); expect(artifact.manifestContent).toBe('{broken');
  expect(JSON.stringify(artifact)).not.toContain(root); expect(artifact).not.toHaveProperty('definition');
  await expect(workspace.load(root)).rejects.toMatchObject({ status: 404 });
  await expect(workspace.save(locator, {})).rejects.toMatchObject({ status: 400 });
  const saved = await workspace.save(locator, { expectedChecksum: artifact.checksum, manifest: { ...manifest, artifactType: 'unknown' } });
  expect(saved.saved).toBe(true); expect(saved.artifact.manifest?.artifactType).toBe('unknown');
  expect(publish).toHaveBeenCalledOnce(); expect(build.onSourceChanged).toHaveBeenCalledOnce();
  expect(JSON.stringify(saved)).not.toContain(root);
});
it('retains invalid source diagnostics and maps stale checksums without overwriting disk', async () => {
  const { workspace, locator, bundle } = await fixture();
  const artifact = await workspace.load(locator);
  const saved = await workspace.save(locator, { expectedChecksum: artifact.checksum, files: { 'form.json': '{broken' } });
  expect(saved.saved).toBe(true); expect(saved.validation.valid).toBe(false);
  expect(saved.artifact.files[0].content).toBe('{broken');
  expect(saved.validation.diagnostics).toEqual(expect.arrayContaining((await workspace.validate(locator)).diagnostics));
  expect(saved.validation.diagnostics.some(d => d.code === 'format.failed')).toBe(true);
  try { await workspace.save(locator, { expectedChecksum: artifact.checksum, files: { 'form.json': '{}' } }); throw new Error('Expected conflict'); }
  catch (error) { expect(editorError(error).status).toBe(409); }
  expect(await readFile(path.join(bundle, 'form.json'), 'utf8')).toBe('{broken');
});
it('shares the watched service and does not duplicate save notifications', async () => {
  const { workspace, locator, bundle, publish, build } = await fixture();
  const watcher = await workspace.service.startWatching({ debounceMs: 10, pollIntervalMs: 30, onChange: event => workspace.changed(event) });
  try {
    const before = await workspace.load(locator);
    await workspace.save(locator, { expectedChecksum: before.checksum, files: { 'form.json': '{"fields":[]}' } });
    await new Promise(resolve => setTimeout(resolve, 120));
    expect(publish).toHaveBeenCalledOnce();
    await writeFile(path.join(bundle, 'form.json'), '{broken');
    await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
    expect(build.onSourceChanged).toHaveBeenCalledTimes(2);
  } finally { await watcher.close(); }
});

function dto(content = 'original', checksum = 'one'): EditorArtifactDto {
  return { locator: 'opaque', manifest, manifestContent: JSON.stringify(manifest), files: [{ path: 'form.json', role: 'definition', content }], checksum, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] }, capabilities: { edit: true, format: true } };
}
function transport() {
  return { load: vi.fn(async () => dto()), save: vi.fn(async (_locator, changes) => ({ saved: true, artifact: dto(changes.files?.['form.json'] ?? 'original', 'two'), validation: { valid: true, diagnostics: [] } })), validateSaved: vi.fn(), getReferences: vi.fn() } satisfies ArtifactEditorTransport;
}
it('debounces for two seconds of inactivity and shares one copy across simultaneous opens', async () => {
  vi.useFakeTimers(); const api = transport(); const host = new EditorWorkingCopyHost(api);
  const [copy, other] = await Promise.all([host.open('opaque'), host.open('opaque')]); expect(copy).toBe(other);
  copy.setFile('form.json', 'first'); await vi.advanceTimersByTimeAsync(1900); copy.setFile('form.json', 'second');
  await vi.advanceTimersByTimeAsync(1999); expect(api.save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(api.save).toHaveBeenCalledOnce(); expect(copy.snapshot.saveState).toBe('saved');
  expect(await host.close('opaque')).toBe(true);
});
it('serializes edit-during-save and never replaces newer text with formatted old text', async () => {
  vi.useFakeTimers(); const api = transport(); let complete!: (value: EditorSaveResponse) => void;
  api.save.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const copy = new EditorWorkingCopy(dto(), api); copy.setFile('form.json', 'first');
  const saving = copy.flush(); copy.setFile('form.json', 'newer');
  await vi.advanceTimersByTimeAsync(2500); expect(api.save).toHaveBeenCalledOnce();
  complete({ saved: true, artifact: dto('formatted first', 'two'), validation: { valid: true, diagnostics: [] } }); await saving;
  expect(copy.snapshot.artifact.files[0].content).toBe('newer'); expect(copy.snapshot.baselineChecksum).toBe('two');
  await vi.advanceTimersByTimeAsync(0); expect(api.save).toHaveBeenCalledTimes(2);
  expect(api.save.mock.calls[1][1]).toMatchObject({ expectedChecksum: 'two', files: { 'form.json': 'newer' } });
  await copy.close();
});
it('pauses conflicts, retains edits, protects close, and saves an explicitly resolved merge', async () => {
  const api = transport(); api.save.mockRejectedValueOnce(new EditorTransportError(409, 'Conflict', 'editor.conflict'));
  const copy = new EditorWorkingCopy(dto(), api); copy.setFile('form.json', 'local'); await copy.flush();
  expect(copy.snapshot.saveState).toBe('conflict'); expect(await copy.close()).toBe(false);
  expect(copy.snapshot.artifact.files[0].content).toBe('local');
  copy.resolve(dto('external', 'remote'), dto('merged', 'remote')); await copy.flush();
  expect(api.save.mock.calls[1][1].expectedChecksum).toBe('remote'); expect(await copy.close()).toBe(true);
});
it('reloads clean external changes and preserves dirty edits in conflict', async () => {
  const api = transport(); api.load.mockResolvedValue(dto('external', 'remote'));
  const copy = new EditorWorkingCopy(dto(), api);
  await copy.externalChange({ appKey: 'test', locator: 'opaque', kind: 'changed', checksum: 'remote' });
  expect(copy.snapshot.artifact.files[0].content).toBe('external');
  copy.setFile('form.json', 'local'); api.load.mockResolvedValue(dto('external again', 'new'));
  await copy.externalChange({ appKey: 'test', locator: 'opaque', kind: 'changed', checksum: 'new' });
  expect(copy.snapshot.saveState).toBe('conflict'); expect(copy.snapshot.artifact.files[0].content).toBe('local');
  await copy.reload(); expect(await copy.close()).toBe(true);
});

it('keeps failed saves pending for explicit retry and refuses navigation until acknowledged', async () => {
  const api = transport(); api.save.mockRejectedValue(new Error('Connection lost'));
  const copy = new EditorWorkingCopy(dto(), api); copy.setFile('form.json', 'unsaved');
  expect(await copy.close()).toBe(false); expect(copy.snapshot.saveState).toBe('error');
  expect(copy.snapshot.dirty).toBe(true); expect(copy.snapshot.artifact.files[0].content).toBe('unsaved');
  api.save.mockResolvedValue({ saved: true, artifact: dto('unsaved', 'two'), validation: { valid: true, diagnostics: [] } });
  expect(await copy.close()).toBe(true);
});

it('does not lose edits made while a clean external refresh is loading', async () => {
  const api = transport(); let complete!: (value: EditorArtifactDto) => void;
  api.load.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const copy = new EditorWorkingCopy(dto(), api);
  const refresh = copy.externalChange({ appKey: 'test', locator: 'opaque', kind: 'changed' });
  copy.setFile('form.json', 'new local'); complete(dto('external', 'remote')); await refresh;
  expect(copy.snapshot.saveState).toBe('conflict'); expect(copy.snapshot.artifact.files[0].content).toBe('new local');
  await copy.reload(); await copy.close();
});

it('adopts formatting for unchanged files while preserving an edit to a different file', async () => {
  const api = transport(); let complete!: (value: EditorSaveResponse) => void;
  api.save.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const copy = new EditorWorkingCopy(dto(), api); copy.setFile('form.json', 'first');
  const saving = copy.flush(); copy.setManifest('{broken');
  complete({ saved: true, artifact: dto('formatted first', 'two'), validation: { valid: true, diagnostics: [] } }); await saving;
  expect(copy.snapshot.artifact.files[0].content).toBe('formatted first');
  expect(copy.snapshot.artifact.manifestContent).toBe('{broken'); expect(copy.snapshot.artifact.manifest).toBeNull();
  await copy.close();
});

it('does not treat its own save notification as an external conflict', async () => {
  const api = transport(); let complete!: (value: EditorSaveResponse) => void;
  api.save.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const copy = new EditorWorkingCopy(dto(), api); copy.setFile('form.json', 'first');
  const saving = copy.flush(); copy.setFile('form.json', 'second');
  await copy.externalChange({ appKey: 'test', locator: 'opaque', kind: 'changed', checksum: 'two' });
  complete({ saved: true, artifact: dto('first', 'two'), validation: { valid: true, diagnostics: [] } }); await saving;
  expect(copy.snapshot.saveState).toBe('pending'); expect(api.load).not.toHaveBeenCalled();
  await copy.close();
});

it('suspends a dirty copy without running queued saves, then recovers against a fresh checksum', async () => {
  vi.useFakeTimers(); const original = transport(), host = new EditorWorkingCopyHost(original), copy = await host.open('opaque');
  copy.setFile('form.json', 'private local recovery'); copy.suspend();
  await vi.advanceTimersByTimeAsync(10000); expect(original.save).not.toHaveBeenCalled();
  expect(copy.snapshot.artifact.files[0].content).toBe('private local recovery'); expect(copy.snapshot.dirty).toBe(true);
  expect(await host.close('opaque')).toBe(false);
  expect(() => copy.setFile('form.json', 'forbidden edit')).toThrow('suspended');
  const fresh = transport(); fresh.load.mockResolvedValue(dto('remote changed', 'remote'));
  const remote = await fresh.load('opaque');
  expect(() => copy.recover(fresh, remote)).toThrow('explicit merge');
  expect(copy.snapshot.artifact.files[0].content).toBe('private local recovery');
  copy.recover(fresh, remote, { merged: dto('explicit merge', 'remote') });
  await vi.advanceTimersByTimeAsync(2000);
  expect(fresh.save).toHaveBeenCalledWith('opaque', expect.objectContaining({ expectedChecksum: 'remote', files: { 'form.json': 'explicit merge' } }));
  expect(await host.close('opaque')).toBe(true);
});

it('deliberately discards retained copies while accurately waiting for admitted saves', async () => {
  vi.useFakeTimers(); const api = transport(); let complete!: (value: EditorSaveResponse) => void;
  api.save.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const host = new EditorWorkingCopyHost(api), copy = await host.open('opaque'); copy.setFile('form.json', 'admitted transaction');
  const saving = copy.flush(); copy.suspend();
  const discarded = host.discard('opaque'); let done = false; void discarded.then(() => { done = true; });
  expect(done).toBe(false); expect(api.save).toHaveBeenCalledOnce();
  complete({ saved: true, artifact: dto('admitted transaction', 'two'), validation: { valid: true, diagnostics: [] } }); await saving;
  expect(await discarded).toBe(true); expect(await host.open('opaque')).not.toBe(copy);
  expect(api.load).toHaveBeenCalledTimes(2);
});

it('rejects cross-workspace locators and path escapes without changing external content', async () => {
  const first = await fixture(), second = await fixture();
  await expect(second.workspace.load(first.locator)).rejects.toMatchObject({ status: 404 });
  const artifact = await first.workspace.load(first.locator);
  await expect(first.workspace.save(first.locator, { expectedChecksum: artifact.checksum, files: { '../outside.txt': 'escape' } })).rejects.toThrow();
  expect(await readFile(path.join(first.bundle, 'form.json'), 'utf8')).toBe('{"fields":[]}');
});
