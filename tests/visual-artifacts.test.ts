import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { evaluate, insertNode, moveNode, parseSource, serializeSource, setNodeAttribute, validateArtifact, valueErrors } from '@ui-platform/visual-artifacts';
import type { PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';
import { VisualArtifactService, toRuntime } from '../src/server/visual-artifacts.js';
import { discoverComponents } from '../src/server/component-registry.js';
import { managementCheck } from '../src/server/v1-management-routes.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function service(kind: 'page' | 'component' = 'component') { const root = await mkdtemp(path.join(tmpdir(), 'visual-artifacts-')); roots.push(root); return new VisualArtifactService(root, kind); }
const component = (id = 'cmp_platform_one'): RuntimeArtifact => ({ metadata: { schemaVersion: 1, artifactId: `art_${id}`, componentId: id, kind: 'component', name: 'one', displayName: 'One', public: { properties: {}, events: {}, slots: [] } }, source: '<div class="uip-layout-item" data-uip-node="one"></div>', css: '' });

describe('authoritative Visual Artifact source', () => {
  it('preserves comments, scripts, manual regions and unrelated formatting during a targeted edit', () => {
    const source = `<!-- keep -->\n<script>const markup = '<not-an-element>'; // preserve\n</script>\n<div class='uip-layout-item' data-uip-node="wrap"><uib-card data-uip-node="card" variant='flat'></uib-card></div>\n<p manual-attribute='untouched'>Manual &amp; text</p>`;
    const next = setNodeAttribute(source, 'card', 'variant', 'outlined');
    expect(next).toBe(source.replace(" variant='flat'", ' variant="outlined"'));
    expect(serializeSource(source)).toBe(source);
    expect(parseSource(source).nodes.some(n => n.tag === 'not-an-element')).toBe(false);
    expect(parseSource(next).nodes.map(n => n.id)).toEqual(parseSource(source).nodes.map(n => n.id));
  });
  it('creates real wrappers and stable distinct IDs without assigning application HTML IDs', () => {
    let index = 0; const source = insertNode('', 'uib-card', 'cmp_platform_card', undefined, () => `node_${index++}`);
    const parsed = parseSource(source);
    expect(parsed.nodes.map(n => n.id)).toEqual(['node_0', 'node_1']);
    expect(parsed.nodes[1].parent?.attributes.class).toBe('uip-layout-item');
    expect(parsed.nodes[1].attributes.id).toBeUndefined();
    expect(setNodeAttribute(source, 'node_1', 'data-uip-settings', '{"heading":"A & B"}')).toContain('&quot;heading&quot;');
  });
  it('blocks editing ambiguous structure, duplicate IDs and private component internals', () => {
    expect(parseSource('<div data-uip-node="same"><p data-uip-node="same"></p></div>').diagnostics.some(d => d.message.includes('duplicate'))).toBe(true);
    expect(() => insertNode('<div>', 'p')).toThrow('Repair');
    expect(() => insertNode('<uip-component data-uip-node="private" data-uip-component="cmp_platform_one"></uip-component>', 'p', undefined, 'private')).toThrow('ordinary HTML');
  });
  it('accepts missing wrappers as limited/manual layout without rewriting the source', () => {
    const source = '<p data-uip-node="manual">Keep me</p>';
    expect(parseSource(source).diagnostics).toContainEqual(expect.objectContaining({ severity: 'warning', node: 'manual' }));
    expect(serializeSource(source)).toBe(source);
  });
  it('preserves valid optional-end-tag HTML while editing managed markup elsewhere', () => {
    const source = '<ul><li>One<li>Two</ul><p>Manual paragraph<div class="uip-layout-item" data-uip-node="wrapper"><h2 data-uip-node="heading">Managed</h2></div>';
    expect(parseSource(source).diagnostics.some(d => d.severity === 'error')).toBe(false);
    expect(setNodeAttribute(source, 'heading', 'class', 'title')).toBe(source.replace('data-uip-node="heading"', 'data-uip-node="heading" class="title"'));
  });
  it('reorders managed layout items without changing IDs or unrelated manual content', () => {
    const source = '<!-- preserved --><div class="uip-layout-item" data-uip-node="first"><p data-uip-node="text">A</p></div>\n<div class="uip-layout-item" data-uip-node="second"><p>B</p></div>\n<footer>Manual</footer>';
    const next = moveNode(source, 'text', 'down');
    expect(next.indexOf('data-uip-node="second"')).toBeLessThan(next.indexOf('data-uip-node="first"'));
    expect(next).toContain('<!-- preserved -->'); expect(next).toContain('<footer>Manual</footer>');
    expect(moveNode(next, 'first', 'up')).toBe(source);
  });
});

describe('shared Page/Component file service', () => {
  it.each(['page', 'component'] as const)('creates, discovers, saves and reopens a %s', async kind => {
    const store = await service(kind); const created = await store.create('example', '/example');
    expect(created.metadata?.kind).toBe(kind); expect((await store.list()).length).toBe(1);
    const saved = await store.save(created.locator, 'css', '.title { color: blue }', created.hash);
    expect((await store.read(created.locator)).files.css).toBe('.title { color: blue }');
    expect(saved.metadata?.artifactId).toBe(created.metadata?.artifactId);
    if (kind === 'page') expect(await readFile(path.join(store.root, 'example', 'index.ts'), 'utf8')).toContain('createVisualPage');
  });
  it('reloads external files and prevents stale editor saves across all companion files', async () => {
    const store = await service(); const original = await store.create('example');
    await writeFile(path.join(store.root, 'example', 'component.html'), '<p>External change</p>');
    expect((await store.read(original.locator)).files.source).toBe('<p>External change</p>');
    await expect(store.save(original.locator, 'css', 'stale', original.hash)).rejects.toThrow('changed on disk');
    expect((await store.read(original.locator)).files.source).toBe('<p>External change</p>');
  });
  it('requires a hash and serializes simultaneous editor writes', async () => {
    const store = await service(); const original = await store.create('example');
    const outcomes = await Promise.allSettled([store.save(original.locator, 'css', 'one', original.hash), store.save(original.locator, 'source', '<p>two</p>', original.hash)]);
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    await expect(store.save(original.locator, 'css', 'three', '')).rejects.toThrow('required');
  });
  it('rejects identity changes while retaining malformed metadata for repair', async () => {
    const store = await service(); const original = await store.create('example');
    const metadata = { ...original.metadata, componentId: 'cmp_platform_new' };
    await expect(store.save(original.locator, 'metadata', JSON.stringify(metadata), original.hash)).rejects.toThrow('immutable');
    const invalid = await store.save(original.locator, 'metadata', '{broken', original.hash);
    expect(invalid.files.metadata).toBe('{broken'); expect(invalid.diagnostics.some(d => d.severity === 'error')).toBe(true);
  });
  it('discovers manually created bundles and reports duplicate identities and missing source', async () => {
    const store = await service(); const original = await store.create('example');
    await mkdir(path.join(store.root, 'manual'));
    await writeFile(path.join(store.root, 'manual', 'component.visual.json'), original.files.metadata);
    const all = await store.list(); expect(all).toHaveLength(2);
    expect(all.every(b => b.diagnostics.some(d => d.message.includes('Duplicate')))).toBe(true);
    expect(all.find(b => b.locator.startsWith('manual'))!.diagnostics.some(d => d.message.includes('missing'))).toBe(true);
  });
  it('checks known references before component deletion', async () => {
    const store = await service(); const original = await store.create('example');
    const user = { ...original, locator: 'dependent/page.visual.json', files: { ...original.files, source: `<uip-component data-uip-component="${original.metadata!.componentId}"></uip-component>` } };
    await expect(store.remove(original.locator, original.hash, [user])).rejects.toThrow('used by');
  });
  it('rejects traversal and unknown file roles', async () => {
    const store = await service(); await expect(store.read('../outside.visual.json')).rejects.toThrow('Invalid');
    const original = await store.create('example'); await expect(store.save(original.locator, 'unknown' as 'source', '', original.hash)).rejects.toThrow('role');
  });
});

describe('contracts and installed definitions', () => {
  it('resolves the real installed card identity and current settings schema', async () => {
    const card = (await discoverComponents()).find(p => p.tagName === 'uib-card')!;
    expect(card.id).toBe('cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1');
    expect(card.definition?.builder.settings.variant.enum).toContain('outlined');
    const artifact = component(); artifact.source = insertNode('', card.tagName, card.id);
    const node = parseSource(artifact.source).nodes[1].id!;
    artifact.source = setNodeAttribute(artifact.source, node, 'data-uip-settings', '{"variant":"removed-value","obsolete":true}');
    const diagnostics = validateArtifact(artifact, [], [card as PackageComponent]);
    expect(diagnostics.some(d => d.message.includes('allowed values'))).toBe(true);
    expect(diagnostics.some(d => d.message.includes('Unknown installed'))).toBe(true);
    artifact.source = `<uib-card data-uip-node="manual-card" data-uip-component="${card.id}" variant="removed-value"></uib-card>`;
    expect(validateArtifact(artifact, [], [card]).some(d => d.message.includes('allowed values'))).toBe(true);
  });
  it('prohibits Page nesting, Component routes and cycles with an understandable path', () => {
    const a = component('cmp_platform_a'), b = component('cmp_platform_b');
    a.source = '<uip-component data-uip-node="a" data-uip-component="cmp_platform_b"></uip-component>';
    b.source = '<uip-component data-uip-node="b" data-uip-component="cmp_platform_a"></uip-component>';
    expect(validateArtifact(a, [a, b]).some(d => d.message.includes('cmp_platform_a → cmp_platform_b → cmp_platform_a'))).toBe(true);
    a.metadata.route = '/invalid'; a.source = '<uip-page></uip-page>';
    expect(validateArtifact(a).filter(d => d.severity === 'error').map(d => d.message).join(' ')).toMatch(/Only Pages.*Pages cannot be nested/);
  });
  it('validates public properties, slots, private boundaries and missing dependencies', () => {
    const child = component(); child.metadata.public!.properties.name = { type: 'string', required: true }; child.metadata.public!.slots = ['footer'];
    const parent = component('cmp_platform_parent'); parent.source = '<uip-component data-uip-node="child" data-uip-component="cmp_platform_one"><span slot="unknown"></span></uip-component>';
    parent.metadata.bindings = [{ node: 'child', target: 'property:grandchild', value: { literal: 'bad' } }]; parent.metadata.dependencies = ['missing'];
    const errors = validateArtifact(parent, [child]).filter(d => d.severity === 'error').map(d => d.message).join(' ');
    expect(errors).toContain('name is required'); expect(errors).toContain('Unknown public slot'); expect(errors).toContain('only declared public'); expect(errors).toContain('Unknown dependency');
  });
  it('evaluates declarative conditions and named paths without arbitrary code', () => {
    expect(evaluate({ op: 'and', args: ['local.enabled', { op: 'eq', args: ['public.name', { literal: 'Ada' }] }] }, { local: { enabled: true }, public: { name: 'Ada' } })).toBe(true);
    expect(() => evaluate('public.constructor', {})).toThrow('Unsafe'); expect(() => evaluate('document.querySelector()', {})).toThrow('named-source');
  });
  it('enforces simple type, required, enum, number and string constraints', () => {
    expect(valueErrors(undefined, { type: 'string', required: true }, 'name')).toHaveLength(1);
    expect(valueErrors(2, { type: 'number', minimum: 3 }, 'amount')).toHaveLength(1);
    expect(valueErrors('long', { type: 'string', maxLength: 2 }, 'name')).toHaveLength(1);
    expect(valueErrors([], { type: 'array' }, 'items')).toEqual([]);
  });
  it('keeps unimplemented service references explicit and diagnosable', () => {
    const a = component(); a.metadata.sources = { query: { kind: 'service', reference: 'dataset:customers' } };
    expect(validateArtifact(a).some(d => d.severity === 'warning' && d.message.includes('no executable adapter'))).toBe(true);
    expect(validateArtifact(a, [], [], ['dataset:customers']).some(d => d.message.includes('no executable'))).toBe(false);
  });
  it('requires Platform authority for shared Component writes and Page authority for Pages', () => {
    expect(managementCheck('PUT', '/api/apps/fixture/visual-components', 'app')?.permissionId).toBe('ui.platform.component.admin');
    expect(managementCheck('PUT', '/api/apps/fixture/visual-pages', 'app')?.permissionId).toBe('ui.page.edit');
  });
  it('validates the source-controlled reference compositions with current packages', async () => {
    const components = await new VisualArtifactService(path.resolve('components'), 'component').list();
    const pages = await new VisualArtifactService(path.resolve('references/visual-artifacts/src/pages'), 'page').list();
    const runtime = components.map(toRuntime) as RuntimeArtifact[];
    const packages = await discoverComponents();
    for (const bundle of [...components, ...pages]) expect(validateArtifact(toRuntime(bundle)!, runtime, packages).filter(d => d.severity === 'error')).toEqual([]);
  });
});
