import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ArtifactEditorWorkspace } from '../src/server/artifact-editor.js';
import { editorDescriptors } from '../src/server/editor-presentation.js';
import { EditorDescriptorRegistry, assertJsonSafe } from '../src/shared/editor-presentation.js';
import { readProperty, writeProperty, collectionItems } from '../src/client/artifact-editor/property-bindings.js';
import { EditorPluginRegistry } from '../src/client/artifact-editor/plugins.js';
import { EditorFieldRegistry } from '../src/client/artifact-editor/properties.js';
import type { EditorSessionDto } from '../src/shared/editor-security.js';

const cleanups: (() => Promise<unknown>)[] = [];
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function fixture(type = 'form', version = 1, source = '{"fields":[{"id":"stable-a","field":"lastName","type":"text","label":"Last name","x:extension":{"keep":true},"validators":[{"validator":"required"},{"validator":"max-length","max":25}]}],"x:large":9007199254740993}') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wp3-properties-')); cleanups.push(() => rm(root, { recursive: true, force: true }));
  const bundle = path.join(root, 'test'); await mkdir(bundle);
  const manifest = { schemaVersion: 1, definitionVersion: version, artifactId: 'test', artifactType: type, name: 'Test', files: type === 'form' ? { definition: 'form.json' } : {}, config: { dataset: 'people', priority: 200, active: true, 'x:keep': [1, 2], 'x:unknown': { keep: 'yes' } } };
  await writeFile(path.join(bundle, 'artifact.json'), JSON.stringify(manifest));
  await writeFile(path.join(bundle, 'form.json'), source);
  const workspace = new ArtifactEditorWorkspace(root, 'alpha'); const [{ locator }] = await workspace.discover();
  let session: EditorSessionDto = { revision: 'r1', csrfToken: 'csrf', principal: { subjectId: 'editor', label: 'Editor', roleIds: ['editor'], applicationKeys: ['alpha'], isDevelopmentFixture: true }, fixtures: [] };
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(session)));
  const { EditorRuntimeContext } = await import('../src/client/artifact-editor/context.js');
  const state = await import('../src/client/artifact-editor/session.js');
  const transport = { load: (id: string) => workspace.load(id), save: workspace.save.bind(workspace), validateSaved: workspace.validate.bind(workspace), getReferences: workspace.references.bind(workspace) };
  const context = new EditorRuntimeContext('alpha', () => transport, undefined); await context.open(locator);
  cleanups.push(async () => { await context.discard(); await context.dispose(); });
  const descriptor = context.snapshot?.artifact.presentation;
  return { context, workspace, locator, bundle, descriptor, state, switchIdentity: async (subjectId: string) => { state.invalidateEditorSession(); session = { ...session, revision: session.revision + 'x', principal: { ...session.principal!, subjectId } }; await state.refreshEditorSession(); } };
}
it('selects exact registered type/version descriptors without serializing executable definitions', async () => {
  const f = await fixture(); expect(f.descriptor?.artifactType).toBe('form'); expect(f.descriptor?.definitionVersion).toBe(1);
  expect(JSON.parse(JSON.stringify(f.descriptor))).toEqual(f.descriptor); expect(f.context.snapshot!.artifact).not.toHaveProperty('definition');
  const registry = new EditorDescriptorRegistry(); registry.register(f.descriptor!);
  expect(() => registry.register(f.descriptor!)).toThrow('already registered');
  registry.register({ ...f.descriptor!, id: 'form-v2', definitionVersion: 2 });
  expect(registry.resolve('form', 2)?.id).toBe('form-v2'); expect(registry.resolve('form', 3)).toBeUndefined();
  const clone = registry.resolve('form', 1)!; clone.sections.splice(0);
  expect(registry.resolve('form', 1)?.sections.length).toBeGreaterThan(0);
});
it.each([['unknown', 1], ['form', 999]] as const)('omits descriptors for unsupported %s version %s', async (type, version) => {
  const f = await fixture(type, version); expect(f.descriptor).toBeUndefined();
});
it('rejects executable/non-JSON metadata, ambiguous registration and unsafe bindings', () => {
  for (const value of [() => {}, undefined, Infinity, new Date(), { fn: () => {} }, [, 1]]) expect(() => assertJsonSafe(value)).toThrow();
  const cycle: any = {}; cycle.self = cycle; expect(() => assertJsonSafe(cycle)).toThrow();
  let invoked = false; expect(() => assertJsonSafe({ get value() { invoked = true; return 1; } })).toThrow(); expect(invoked).toBe(false);
  const descriptor = editorDescriptors.resolve('form', 1)!;
  descriptor.sections[0].fields[0].path = ['__proto__', 'bad'];
  expect(() => new EditorDescriptorRegistry().register(descriptor)).toThrow('binding');
  const identity = editorDescriptors.resolve('form', 1)!; identity.sections[0].fields[0].readOnly = false;
  expect(() => new EditorDescriptorRegistry().register(identity)).toThrow('read-only');
});
it('patches fields against the newest shared snapshot, preserving unmodeled source and numeric lexemes', async () => {
  const f = await fixture(); const section = f.descriptor!.sections[2], field = section.fields[0].fields!.find(field => field.id === 'field-label')!;
  const row = { key: 'id', value: 'stable-a' };
  const observations: string[] = []; const detach = f.context.subscribe(() => { if (f.context.snapshot) observations.push(f.context.snapshot.artifact.files[0].content); });
  f.context.setFile('form.json', f.context.snapshot!.artifact.files[0].content.replace('"keep":true', '"keep":"newer panel edit"'));
  writeProperty(f.context, section, field, ['fields', row, 'label'], 'Changed');
  const text = f.context.snapshot!.artifact.files[0].content;
  expect(text).toContain('"keep":"newer panel edit"'); expect(text).toContain('9007199254740993'); expect(text).toContain('"label":"Changed"');
  expect(readProperty(f.context, section, ['fields', row, 'label']).value).toBe('Changed'); expect(observations.at(-1)).toBe(text);
  await f.context.flush(); expect(await readFile(path.join(f.bundle, 'form.json'), 'utf8')).toContain('9007199254740993');
  detach();
});
it('creates missing optional paths while preserving manifest extensions and identity', async () => {
  const f = await fixture(); const section = f.descriptor!.sections[0]; const field = section.fields.find(field => field.id === 'description')!;
  writeProperty(f.context, section, field, field.path, 'Description');
  expect(f.context.snapshot?.artifact.manifest?.description).toBe('Description');
  expect(f.context.snapshot?.artifact.manifest?.config?.['x:unknown']).toEqual({ keep: 'yes' });
  expect(() => writeProperty(f.context, section, section.fields[0], ['artifactId'], 'changed')).toThrow('read-only');
});
it('resolves stable collection IDs after another panel reorders items, refusing ambiguous identities', async () => {
  const f = await fixture(); const section = f.descriptor!.sections[2], field = section.fields[0].fields![3];
  f.context.setFile('form.json', '{"fields":[{"id":"stable-b","field":"other","type":"text","label":"Other"},{"id":"stable-a","field":"lastName","type":"text","label":"Original"}]}');
  writeProperty(f.context, section, field, ['fields', { key: 'id', value: 'stable-a' }, 'label'], 'Right item');
  expect(JSON.parse(f.context.snapshot!.artifact.files[0].content).fields[0].label).toBe('Other');
  expect(() => collectionItems([{ field: 'same' }, { field: 'same' }], ['field'])).toThrow('unique');
  expect(() => writeProperty(f.context, section, field, ['fields', { key: 'id', value: 'deleted' }, 'label'], 'no')).toThrow('identity');
});
it.each(['{broken', '{"fields":[],"duplicate":1,"duplicate":2}', '{"fields":{"unsupported":true}}'])('preserves incompatible file content: %s', async source => {
  const f = await fixture('form', 1, source); const section = f.descriptor!.sections[2];
  expect(() => { const value = readProperty(f.context, section, ['fields']).value; collectionItems(value, ['id', 'field']); }).toThrow();
  expect(f.context.snapshot!.artifact.files[0].content).toBe(source); expect(f.context.snapshot?.dirty).toBe(false);
  // Independent manifest fields remain editable even if this file cannot be represented.
  writeProperty(f.context, f.descriptor!.sections[0], f.descriptor!.sections[0].fields[1], ['name'], 'Rename only');
  expect(f.context.snapshot!.artifact.files[0].content).toBe(source);
});
it('rejects stale scalar writes if another panel replaced that field with an object', async () => {
  const f = await fixture(); const section = f.descriptor!.sections[2], field = section.fields[0].fields![3];
  f.context.setFile('form.json', '{"fields":[{"id":"stable-a","field":"lastName","type":"text","label":{"extension":true}}]}');
  expect(() => writeProperty(f.context, section, field, ['fields', { key: 'id', value: 'stable-a' }, 'label'], 'overwrite')).toThrow('latest source');
  expect(f.context.snapshot!.artifact.files[0].content).toContain('"extension":true');
});
it('allows invalid numeric drafts, autosaves through Phase 1, and retains authoritative saved diagnostics', async () => {
  const f = await fixture('trigger'); const section = f.descriptor!.sections[1], field = section.fields.find(field => field.id === 'priority')!;
  const oldDiagnostics = f.context.snapshot!.artifact.validation;
  writeProperty(f.context, section, field, field.path, '-');
  expect(f.context.snapshot?.artifact.manifest?.config?.priority).toBe('-'); expect(f.context.snapshot?.artifact.validation).toEqual(oldDiagnostics);
  await f.context.flush(); expect(f.context.snapshot?.saveState).toBe('saved');
  expect(f.context.snapshot?.artifact.validation.diagnostics.some(issue => issue.code === 'trigger.priority')).toBe(true);
  writeProperty(f.context, section, field, field.path, 300); await f.context.flush();
  expect(f.context.snapshot?.artifact.validation.diagnostics.some(issue => issue.code === 'trigger.priority')).toBe(false);
});
it('keeps malformed manifests available as source without inventing descriptors', async () => {
  const f = await fixture(); f.context.setManifest('{broken'); await f.context.flush();
  expect(f.context.snapshot?.artifact.presentation).toBeUndefined(); expect(f.context.snapshot?.artifact.manifest).toBeNull(); expect(f.context.snapshot?.artifact.manifestContent).toBe('{broken');
});
it('prevents field writes after permission changes and recovers the same dirty source only for the original user', async () => {
  const f = await fixture(); const section = f.descriptor!.sections[0], field = section.fields[1];
  writeProperty(f.context, section, field, field.path, 'Retained draft'); await f.switchIdentity('reviewer');
  expect(() => writeProperty(f.context, section, field, field.path, 'Denied')).toThrow('read-only'); expect(f.context.snapshot).toBeUndefined();
  await expect(f.context.compare()).rejects.toThrow('original');
  await f.switchIdentity('editor'); await f.context.compare(); await f.context.decide('resume');
  expect(f.context.snapshot?.artifact.manifest?.name).toBe('Retained draft');
  writeProperty(f.context, section, field, field.path, 'Recovered edit'); await f.context.flush(); expect(f.context.snapshot?.saveState).toBe('saved');
});
it('registers multiple compatible plugins with deterministic order and read-only filtering', async () => {
  const f = await fixture(); const registry = new EditorPluginRegistry(); const render = vi.fn();
  const one = { id: 'one', artifactTypes: ['form'], definitionVersions: [1], contributes: [{ id: 'edit', label: 'Edit', slot: 'tab' as const, requiresEdit: true, order: 2 }] };
  registry.register(one, { edit: render }); registry.register({ ...one, id: 'two', contributes: [{ id: 'inspect', label: 'Inspect', slot: 'context', order: 1 }] }, { inspect: render });
  registry.register({ ...one, id: 'future', definitionVersions: [2] }, { edit: render });
  expect(() => registry.register(one, { edit: render })).toThrow('already registered');
  expect(registry.select(f.context).selected.map(value => value.key)).toEqual(['plugin:two:inspect', 'plugin:one:edit']);
  expect(registry.select(f.context).issues[0]).toContain('incompatible');
  const snapshot = f.context.snapshot!; snapshot.artifact.capabilities.edit = false;
  const readOnly = { snapshot } as typeof f.context;
  expect(registry.select(readOnly).selected.map(value => value.key)).toEqual(['plugin:two:inspect']);
  await f.switchIdentity('reviewer'); expect(registry.select(f.context).selected).toHaveLength(0);
});
it('rejects duplicate field components without introducing a save or validator service', () => {
  const registry = new EditorFieldRegistry(); const factory = vi.fn(); registry.register('custom', factory);
  expect(() => registry.register('custom', factory)).toThrow('already registered'); expect(registry.get('missing')).toBeUndefined();
});

