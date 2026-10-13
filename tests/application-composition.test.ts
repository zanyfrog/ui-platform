import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { applyMenuOverrides, matchCompositionRoute, regions, remapPageRegions, renderMenu, themeCss, validateArtifact, validateMenu } from '@ui-platform/visual-artifacts';
import type { ApplicationMenu, CompositionRoute, CompositionSettings } from '@ui-platform/visual-artifacts';
import { applyTemplateUpdate, compareTemplate, recordTemplateProvenance, substituteTemplate } from '../src/server/template-updates.js';
import { compositionChecksum, compositionSourceFingerprint, copyCompositionSnapshot, copyReferencedSharedComponents, platformComponentSnapshotPath } from '../src/server/composition-snapshots.js';
import { VisualArtifactService } from '../src/server/visual-artifacts.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function temporary() { const root = await mkdtemp(path.join(tmpdir(), 'composition-')); roots.push(root); return root; }
const region = (id: string, content = '') => `<section class="uip-layout-item" data-uip-node="node_${id}" data-uip-region="${id}" data-uip-region-name="Display name">${content}</section>`;
const routes: CompositionRoute[] = [{ pageId: 'art_home', routeId: 'route_home', path: '/' }, { pageId: 'art_record', routeId: 'route_record', path: '/records/:recordId' }];
const menu: ApplicationMenu = { schemaVersion: 1, menuId: 'menu-main', name: 'Main', items: [{ itemId: 'home', label: 'Home', destination: { kind: 'page', pageId: 'art_home' }, children: [{ itemId: 'record', label: 'Record', destination: { kind: 'route', routeId: 'route_record', params: { recordId: '42' } }, target: '_blank' }] }, { itemId: 'external', label: 'External', destination: { kind: 'url', url: 'https://example.com' } }, { itemId: 'action', label: 'Run', destination: { kind: 'action', actions: [{ kind: 'service', reference: 'existing.service' }] } }] };

describe('Application composition contracts', () => {
  it('keeps explicit Region identity separate from display names and retains intentional emptiness', () => {
    const source = region('region-custom'); expect(regions(source)[0]).toMatchObject({ regionId: 'region-custom', displayName: 'Display name', content: '' });
    expect(regions(source.replace('Display name', 'Renamed'))[0].regionId).toBe('region-custom');
    expect(regions('')).toEqual([]);
    expect(() => regions(source + source)).toThrow('duplicate');
  });
  it('retains matching Region content and requires explicit, collision-free remap/discard for all unmatched definitions', () => {
    const old = region('region-main', '<p>Keep me</p>') + region('region-hero', '<p>Map me</p>') + region('region-sidebar');
    const shell = region('region-main') + region('region-banner');
    expect(() => remapPageRegions(old, shell, {})).toThrow('Map or explicitly discard');
    expect(() => remapPageRegions(old, shell, { 'region-hero': 'region-main', 'region-sidebar': null })).toThrow('unique');
    const next = remapPageRegions(old, shell, { 'region-hero': 'region-banner', 'region-sidebar': null });
    expect(regions(next).map(item => [item.regionId, item.content])).toEqual([['region-main', '<p>Keep me</p>'], ['region-banner', '<p>Map me</p>']]);
  });
  it('supports Shell Visual Artifact source and existing stale-save protection', async () => {
    const service = new VisualArtifactService(await temporary(), 'shell'); const shell = await service.create('public');
    expect(shell.metadata?.kind).toBe('shell'); expect(regions(shell.files.source)[0].regionId).toBe('region-main');
    expect(validateArtifact({ metadata: shell.metadata!, source: shell.files.source, css: '' }).filter(d => d.severity === 'error')).toEqual([]);
    const saved = await service.save(shell.locator, 'source', shell.files.source.replace('Main Content', 'New label'), shell.hash);
    expect(saved.hash).not.toBe(shell.hash); expect(regions(saved.files.source)[0].regionId).toBe('region-main');
    await expect(service.save(shell.locator, 'css', 'body{}', shell.hash)).rejects.toThrow('changed on disk');
    await expect(service.save(shell.locator, 'metadata', JSON.stringify({ ...saved.metadata, artifactId: 'art_other' }), saved.hash)).rejects.toThrow('immutable');
  });
  it('renders parameterized Route identity/current state and active ancestors across reusable Menus', () => {
    expect(matchCompositionRoute(routes, '/records/42')).toMatchObject({ route: { routeId: 'route_record' }, params: { recordId: '42' } });
    const rendered = renderMenu(menu, routes, 'art_record', 'route_record', { recordId: '42' });
    expect(rendered.source).toContain('href="/records/42"'); expect(rendered.source).toContain('target="_blank"'); expect(rendered.source).toContain('aria-current="page"'); expect(rendered.source).toContain('data-active-path="true"'); expect(rendered.events[0].actions[0]).toMatchObject({ kind: 'service' });
    expect(renderMenu(menu, routes, 'art_record', 'route_record', { recordId: '43' }).source).not.toContain('aria-current');
    const pageMenu = { ...menu, items: [{ itemId: 'record-page', label: 'Record', destination: { kind: 'page' as const, pageId: 'art_record', params: { recordId: '42' } } }] };
    expect(renderMenu(pageMenu, routes, 'art_record', 'route_record').source).toContain('aria-current');
    expect(renderMenu({ ...pageMenu, menuId: 'second' }, routes, 'art_record', 'route_record').source).toContain('aria-current');
  });
  it('applies Page hide/show, disable/enable and nested local additions without mutating the Application Menu', () => {
    const before = JSON.stringify(menu);
    const result = applyMenuOverrides(menu, { 'menu-main': { items: { external: { hidden: true }, action: { disabled: true } }, additions: [{ parentItemId: 'home', item: { itemId: 'local', label: 'Local', destination: { kind: 'page', pageId: 'art_home' } } }] } });
    const rendered = renderMenu(result, routes, 'art_home', 'route_home', { recordId: '42' });
    expect(rendered.source).not.toContain('https://example.com'); expect(rendered.source).toContain(' disabled'); expect(rendered.source).toContain('Local'); expect(rendered.events).toEqual([]); expect(JSON.stringify(menu)).toBe(before);
    expect(() => validateMenu({ ...menu, items: [{ ...menu.items[1], destination: { kind: 'url', url: 'javascript:alert(1)' } }] })).toThrow('HTTP');
  });
  it('emits stable CSS variables and rejects escaping the declaration block', () => {
    expect(themeCss({ theme: { '--app-color-primary': '#123' } } as CompositionSettings)).toContain('--app-color-primary:#123');
    expect(() => themeCss({ theme: { '--app-color-primary': 'red;}body{' } } as CompositionSettings)).toThrow('Invalid');
  });
});

describe('explicit source template updates and publication snapshots', () => {
  it('vendors only the referenced shared Component closure and fingerprints its source changes', async () => {
    const root = await temporary(), app = path.join(root, 'app'), shared = path.join(root, 'shared'), snapshot = path.join(root, 'snapshot');
    const service = new VisualArtifactService(shared, 'component');
    const child = await service.create('child'), parent = await service.create('parent'), unused = await service.create('unused');
    await service.save(parent.locator, 'source', `<uip-component data-uip-node="nested" data-uip-component="${child.metadata!.componentId}"></uip-component>`, parent.hash);
    const pages = new VisualArtifactService(path.join(app, 'src/pages'), 'page'), page = await pages.create('home', '/');
    await pages.save(page.locator, 'source', `<uip-component data-uip-node="parent" data-uip-component="${parent.metadata!.componentId}"></uip-component>`, page.hash);
    const fingerprint = await compositionSourceFingerprint(app, shared);
    await copyReferencedSharedComponents(app, snapshot, shared);
    for (const component of [parent, child]) expect(await readFile(path.join(snapshot, platformComponentSnapshotPath, component.metadata!.componentId!, 'component.visual.json'), 'utf8')).toContain(component.metadata!.componentId!);
    await expect(readFile(path.join(snapshot, platformComponentSnapshotPath, unused.metadata!.componentId!, 'component.visual.json'))).rejects.toThrow();
    await service.save(child.locator, 'css', 'p{color:purple}', child.hash);
    expect(await compositionSourceFingerprint(app, shared)).not.toBe(fingerprint);
    expect(await readFile(path.join(snapshot, platformComponentSnapshotPath, child.metadata!.componentId!, 'component.css'), 'utf8')).not.toContain('purple');
  });
  it('copies source, detects all categories, applies only explicit choices, preserves omissions/assets and tracks processed version', async () => {
    const root = await temporary(), template = path.join(root, 'template'), app = path.join(root, 'app'); await mkdir(template); await mkdir(app);
    const initial = { 'name.json': '{"name":"{{APP_NAME}}","id":"{{APP_ID}}"}', 'keep.txt': 'original', 'replace.txt': 'old', 'removed.txt': 'retain', 'logo.png': Buffer.from([255, 1, 2, 128]) };
    for (const [file, content] of Object.entries(initial)) await writeFile(path.join(template, file), content);
    await cp(template, app, { recursive: true }); const tokens = { APP_NAME: 'Independent', APP_ID: 'permanent' };
    await writeFile(path.join(app, 'name.json'), substituteTemplate(Buffer.from(initial['name.json']), 'name.json', tokens));
    await recordTemplateProvenance(app, template, 'standard', '1', tokens);
    await writeFile(path.join(template, 'keep.txt'), 'template update'); await writeFile(path.join(template, 'replace.txt'), 'new'); await writeFile(path.join(template, 'new.txt'), 'new file'); await rm(path.join(template, 'removed.txt')); await writeFile(path.join(app, 'only.txt'), 'application only'); await writeFile(path.join(app, 'keep.txt'), 'customized');
    const plan = await compareTemplate(app, template, 'standard', '2');
    expect(Object.fromEntries(plan.items.map(item => [item.path, item.category]))).toMatchObject({ 'name.json': 'unchanged', 'keep.txt': 'different', 'replace.txt': 'different', 'new.txt': 'new', 'removed.txt': 'removed', 'only.txt': 'application-only' });
    await expect(applyTemplateUpdate(app, template, 'standard', '2', plan.expectedHash, {})).rejects.toThrow('Choose');
    await applyTemplateUpdate(app, template, 'standard', '2', plan.expectedHash, { 'keep.txt': 'keep', 'replace.txt': 'replace', 'new.txt': 'add' });
    expect(await readFile(path.join(app, 'keep.txt'), 'utf8')).toBe('customized'); expect(await readFile(path.join(app, 'replace.txt'), 'utf8')).toBe('new'); expect(await readFile(path.join(app, 'removed.txt'), 'utf8')).toBe('retain'); expect(await readFile(path.join(app, 'only.txt'), 'utf8')).toBe('application only'); expect(await readFile(path.join(app, 'logo.png'))).toEqual(initial['logo.png']);
    expect(JSON.parse(await readFile(path.join(app, 'template.provenance.json'), 'utf8')).templateAppliedVersion).toBe('2');
    await expect(applyTemplateUpdate(app, template, 'standard', '2', plan.expectedHash, {})).rejects.toThrow('changed');
  });
  it('published snapshot remains unchanged when saved source changes', async () => {
    const root = await temporary(), app = path.join(root, 'app'), published = path.join(root, 'published'); await mkdir(path.join(app, 'shells'), { recursive: true }); await writeFile(path.join(app, 'shells/shell.html'), '<p>Published</p>');
    await copyCompositionSnapshot(app, published); const checksum = await compositionChecksum(published);
    await writeFile(path.join(app, 'shells/shell.html'), '<p>Draft change</p>');
    expect(await compositionChecksum(published)).toBe(checksum); expect(await compositionChecksum(app)).not.toBe(checksum); expect(await readFile(path.join(published, 'shells/shell.html'), 'utf8')).toContain('Published');
  });
});
