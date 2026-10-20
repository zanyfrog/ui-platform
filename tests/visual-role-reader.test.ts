import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer, type Server } from 'node:http';
import { createServer, type ViteDevServer } from 'vite';
import { visualArtifacts, applicationComposition } from '@ui-platform/visual-artifacts/vite';
import { validateArtifact, type ArtifactMetadata } from '@ui-platform/visual-artifacts';
import { readRoleBundle, saveRoleBundle, type RoleBundleLocation } from '@ui-platform/artifacts/storage';

const roots: string[] = [], servers: ViteDevServer[] = [];
const httpServers: Server[] = [];
afterEach(async () => { await Promise.all(httpServers.splice(0).map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }))); await Promise.all(servers.splice(0).map(server => server.close())); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
function gate() { let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; }); return { wait, release }; }
async function fixture(revisionPinned: true | undefined = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'visual-reader-')); roots.push(root);
  const directory = path.join(root, 'src/pages/example'); await mkdir(directory, { recursive: true });
  const metadata = (node: string): ArtifactMetadata => ({ schemaVersion: 1, artifactId: 'art_example', kind: 'page', name: 'example', displayName: node, route: '/example', state: { label: node }, bindings: [{ node, target: 'text', value: 'local.label' }] });
  const files = (node: string) => ({ 'page.html': `<section data-uip-node="${node}">${node}</section>`, 'page.css': `/* ${node} */`, 'page.visual.json': JSON.stringify(metadata(node)), 'page.fixtures.json': '{}', 'page.functions.ts': 'export {};' });
  const original = files('old-node'), candidate = files('new-node');
  for (const [name, value] of Object.entries(original)) await writeFile(path.join(directory, name), value);
  // Same independent source/metadata imports used by the accepted generated Page entry.
  await writeFile(path.join(directory, 'index.ts'), "import source from './page.html?raw'; import metadata from './page.visual.json'; export const page={source,metadata};");
  await writeFile(path.join(root, 'package.json'), '{"dependencies":{}}');
  await writeFile(path.join(root, 'app.manifest.json'), '{}');
  const server = await createServer({ configFile: false, root, plugins: [visualArtifacts({ applicationRoot: root, revisionPinned })], optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, watch: null }, appType: 'custom' }); servers.push(server);
  const location: RoleBundleLocation = { root: path.join(root, 'src/pages'), directory, anchor: 'page.visual.json', paths: Object.keys(original) };
  const before = await readRoleBundle(location);
  return { root, directory, metadata, original, candidate, server, location, before };
}
it('pins metadata and HTML together while a real transaction is paused between roles', async () => {
  const f = await fixture(), entered = gate(), release = gate();
  for (const files of [f.original, f.candidate]) expect(validateArtifact({ metadata: JSON.parse(files['page.visual.json']), source: files['page.html'], css: files['page.css'] }).filter(d => d.severity === 'error')).toEqual([]);
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  const oldModule = await f.server.transformRequest(id); expect(oldModule!.code).toContain('old-node');
  const saving = saveRoleBundle(f.location, { files: f.candidate, expectedChecksum: f.before.checksum, validate() {}, admit() {}, async beforeWrite(name) { if (name === 'page.visual.json') { entered.release(); await release.wait; } } });
  await entered.wait;
  try {
    await expect(f.server.transformRequest('/src/pages/example/page.html?raw')).rejects.toThrow('Direct Visual role imports are blocked');
    await expect(f.server.transformRequest('/src/pages/example/page.visual.json?import')).rejects.toThrow('Direct Visual role imports are blocked');
    f.server.moduleGraph.invalidateModule(f.server.moduleGraph.getModuleById(id)!);
    let completed = false;
    const fresh = f.server.transformRequest(id).then(value => { completed = true; return value; });
    await new Promise(resolve => setTimeout(resolve, 40)); expect(completed).toBe(false);
    release.release(); await saving;
    const current = await fresh;
    expect(current!.code).toContain('new-node'); expect(current!.code).not.toContain('old-node');
    expect(current!.code).not.toContain('page.html?raw');
    // An already loaded reader still owns the immutable valid prior output.
    expect(oldModule!.code).toContain('old-node'); expect(oldModule!.code).not.toContain('new-node');
  } finally { release.release(); await saving; }
});
it('rechecks cached HTTP modules for new readers and blocks direct HTTP raw requests', async () => {
  const f = await fixture();
  const http = createHttpServer(f.server.middlewares); httpServers.push(http);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
  const id = 'virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  const url = origin + '/@id/__x00__' + encodeURI(id);
  const first = await fetch(url); expect(first.status).toBe(200); expect(await first.text()).toContain('old-node');
  await saveRoleBundle(f.location, { expectedChecksum: f.before.checksum, files: f.candidate, validate() {}, admit() {} });
  const fresh = await fetch(url); expect(fresh.status).toBe(200); const code = await fresh.text(); expect(code).toContain('new-node'); expect(code).not.toContain('old-node');
  const raw = await fetch(origin + '/src/pages/example/page.html?raw'); expect(raw.status).toBe(409); expect(await raw.text()).not.toContain('new-node');
  const invalid = { ...f.candidate, 'page.visual.json': '{broken' };
  await saveRoleBundle(f.location, { expectedChecksum: (await readRoleBundle(f.location)).checksum, files: invalid, validate() {}, admit() {} });
  const blocked = await fetch(url); expect(blocked.ok).toBe(false); expect(blocked.status).toBeGreaterThanOrEqual(400); expect(await blocked.text()).not.toContain('var page =');
});
it('blocks both the pinned runtime and raw Vite bypass when recovery is required', async () => {
  const f = await fixture();
  await expect(saveRoleBundle(f.location, { files: f.candidate, expectedChecksum: f.before.checksum, validate() {}, admit() {}, beforeWrite(name) { if (name === 'page.visual.json') throw new Error('Commit failed'); }, beforeRollbackWrite() { throw new Error('Rollback failed'); } })).rejects.toMatchObject({ code: 'source.recovery-required' });
  // Force recovery itself to fail without relying on platform-specific file sharing flags.
  const { storageKey } = await import('../packages/artifacts/src/storage.js');
  const journal = path.join(f.location.root, '.uib/transactions', storageKey(path.join(f.directory, f.location.anchor)), 'pending.json');
  await writeFile(journal, '{corrupt');
  await expect(readRoleBundle(f.location)).rejects.toMatchObject({ code: 'source.recovery-required' });
  await expect(f.server.transformRequest('/src/pages/example/page.html?raw')).rejects.toThrow('Direct Visual role imports are blocked');
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  await expect(f.server.transformRequest(id)).rejects.toMatchObject({ code: 'source.recovery-required' });
});
it('validates one captured Page, Shell and shared Component graph and refuses incompatible external revisions', async () => {
  const f = await fixture(), shared = path.join(f.root, 'components'), shellDirectory = path.join(f.root, 'shells/public');
  await mkdir(shared); await mkdir(path.join(shared, 'card')); await mkdir(shellDirectory, { recursive: true }); await mkdir(path.join(f.root, 'menus')); await mkdir(path.join(f.root, 'assets')); await mkdir(path.join(f.root, 'styles'));
  await writeFile(path.join(f.root, 'app.settings.json'), JSON.stringify({ presentation: { model: 'composition-v1', defaultShellId: 'art_public', theme: {}, siteStyles: [], branding: { applicationName: 'Reader probe' }, assetsRoot: 'assets' } }));
  const shell = { schemaVersion: 1, artifactId: 'art_public', kind: 'shell', name: 'public', displayName: 'Public' };
  const component = { schemaVersion: 1, artifactId: 'art_card', componentId: 'cmp_platform_card', kind: 'component', name: 'card', displayName: 'Card', public: { properties: { title: { type: 'string', required: true } }, events: {}, slots: [] } };
  for (const [directory, stem, metadata, source] of [[shellDirectory, 'shell', shell, '<main data-uip-node="shell-main" data-uip-region="region-main"></main>'], [path.join(shared, 'card'), 'component', component, '<p data-uip-node="card-text">Card</p>']] as const) for (const [extension, value] of [['.visual.json', JSON.stringify(metadata)], ['.html', source], ['.css', ''], ['.fixtures.json', '{}'], ['.functions.ts', 'export {};']]) await writeFile(path.join(directory, stem + extension), value);
  const page = { ...f.metadata('page-main'), shellId: 'art_public', routeId: 'route_example', bindings: [] };
  const source = '<section data-uip-node="page-main" data-uip-region="region-main"><uip-component data-uip-node="card" data-uip-component="cmp_platform_card" data-uip-settings=\'{"title":"Hello"}\'></uip-component></section>';
  await writeFile(path.join(f.directory, 'page.visual.json'), JSON.stringify(page)); await writeFile(path.join(f.directory, 'page.html'), source);
  const server = await createServer({ configFile: false, root: f.root, plugins: [applicationComposition({ root: f.root, sharedComponentsRoot: shared, revisionPinned: true }), visualArtifacts({ applicationRoot: f.root, revisionPinned: true })], optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, watch: null }, appType: 'custom' }); servers.push(server);
  const id = '\0virtual:uip-application-composition';
  const first = await server.transformRequest(id); expect(first!.code).toContain('cmp_platform_card'); expect(first!.code).not.toContain('.html?raw');
  const reset = () => server.moduleGraph.invalidateModule(server.moduleGraph.getModuleById(id)!);
  await writeFile(path.join(shared, 'card/component.visual.json'), JSON.stringify({ ...component, public: { ...component.public, properties: { heading: { type: 'string', required: true } } } })); reset();
  await expect(server.transformRequest(id)).rejects.toThrow('Unknown public property');
  await writeFile(path.join(f.directory, 'page.html'), source.replace('"title"', '"heading"')); reset();
  expect((await server.transformRequest(id))!.code).toContain('heading');
  await writeFile(path.join(shellDirectory, 'shell.html'), '<main data-uip-node="shell-main" data-uip-region="region-other"></main>'); reset();
  await expect(server.transformRequest(id)).rejects.toThrow('unmatched Regions');
  // A live reader still retains its prior compatible graph, without a server generation store.
  expect(first!.code).toContain('region-main'); expect(first!.code).not.toContain('region-other');
});
it('preserves the same ordinary helper module instance for Application code and pinned Visual functions', async () => {
  const f = await fixture();
  await writeFile(path.join(f.directory, 'helper.ts'), 'export const state = { value: 0 };');
  await writeFile(path.join(f.directory, 'page.functions.ts'), "import { state } from './helper'; export function increment() { return ++state.value; }");
  await writeFile(path.join(f.root, 'src/main.ts'), "export { state } from './pages/example/helper';");
  const application = await f.server.ssrLoadModule('/src/main.ts');
  expect(application.state.value).toBe(0);
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  const pinned = await f.server.ssrLoadModule(id);
  expect(pinned.page.functions.increment()).toBe(1); expect(application.state.value).toBe(1);
  expect(pinned.page.functions.increment()).toBe(2); expect(application.state.value).toBe(2);
  expect((await f.server.transformRequest(id))!.code).toContain('/src/pages/example/helper.ts');
  const guard = await f.server.ssrLoadModule('/@fs/' + path.resolve('packages/visual-artifacts/dist/revision-guard.js').replaceAll('\\', '/'));
  expect(() => { pinned.page.metadata.displayName = 'mutated'; }).toThrow();
  expect(() => guard.assertManagedVisualRevision({ ...pinned.page, metadata: structuredClone(pinned.page.metadata) })).toThrow('Cloned managed Visual metadata');
  expect(() => guard.assertManagedVisualRevision({ ...pinned.page, css: 'unvalidated' })).toThrow('different runtime revisions');
});
it('protects the default loader against the original mixed cached-metadata and new-HTML counterexample', async () => {
  const f = await fixture(undefined), entered = gate(), release = gate();
  await expect(f.server.transformRequest('/src/pages/example/page.visual.json?import')).rejects.toThrow('Direct Visual role imports are blocked');
  const saving = saveRoleBundle(f.location, { expectedChecksum: f.before.checksum, files: f.candidate, validate() {}, admit() {}, async beforeWrite(name) { if (name === 'page.visual.json') { entered.release(); await release.wait; } } });
  await entered.wait;
  try { await expect(f.server.transformRequest('/src/pages/example/page.html?raw')).rejects.toThrow('Direct Visual role imports are blocked'); }
  finally { release.release(); await saving; }
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  const current = await f.server.transformRequest(id);
  expect(current!.code).toContain('new-node'); expect(current!.code).not.toContain('old-node');
});
it.each(['static', 'transitive', 'dynamic', 'cached'])('blocks %s helper imports of managed Visual roles', async pattern => {
  const f = await fixture();
  await writeFile(path.join(f.directory, 'page.functions.ts'), "import { value } from './helper'; export function action() { return value; }");
  if (pattern === 'cached') {
    await writeFile(path.join(f.directory, 'helper.ts'), 'export const value = 1;');
    await f.server.transformRequest('/src/pages/example/helper.ts');
  }
  if (pattern === 'transitive') {
    await writeFile(path.join(f.directory, 'helper.ts'), "export { value } from './nested';");
    await writeFile(path.join(f.directory, 'nested.ts'), "import value from './page.visual.json'; export { value };");
  } else await writeFile(path.join(f.directory, 'helper.ts'), pattern === 'dynamic' ? "export const value = () => import('./page.html?raw');" : "import value from './page.visual.json'; export { value };");
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  await expect(f.server.transformRequest(id)).rejects.toThrow('Direct Visual role imports are blocked');
});
it('preserves literal dynamic helper imports and rejects computed or cached-graph imports', async () => {
  const f = await fixture();
  await writeFile(path.join(f.directory, 'helper.ts'), 'export const state = { value: 0 }; export function increment() { return ++state.value; }');
  await writeFile(path.join(f.root, 'src/main.ts'), "export { state } from './pages/example/helper';");
  await writeFile(path.join(f.directory, 'page.functions.ts'), "export async function increment() { const helper = await import('./helper'); return helper.increment(); }");
  const application = await f.server.ssrLoadModule('/src/main.ts');
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  const pinned = await f.server.ssrLoadModule(id);
  expect(await pinned.page.functions.increment()).toBe(1); expect(application.state.value).toBe(1);
  await writeFile(path.join(f.directory, 'helper.ts'), 'export function load(name) { return import(name); }');
  await writeFile(path.join(f.directory, 'page.functions.ts'), "import { load } from './helper'; export const action = () => load('./page.html?raw');");
  f.server.moduleGraph.invalidateModule(f.server.moduleGraph.getModuleById(id)!);
  await expect(f.server.transformRequest(id)).rejects.toThrow('computed import');
});
it('rejects retaining context, callbacks and managed metadata through helper aliases before mutation', async () => {
  const f = await fixture();
  await writeFile(path.join(f.directory, 'helper.ts'), 'export const state = {}; export function keep(value) { state.value = value; }');
  await writeFile(path.join(f.root, 'src/main.ts'), "export { state } from './pages/example/helper';");
  await writeFile(path.join(f.directory, 'page.functions.ts'), "import * as helpers from './helper'; function alias() { return helpers.keep; } export function action(context) { const keep = alias(); keep(context); } export function callback(context) { helpers.keep(() => context.root); }");
  const application = await f.server.ssrLoadModule('/src/main.ts');
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  const pinned = await f.server.ssrLoadModule(id), context = { root: {}, local: {}, setState() {} };
  expect(() => pinned.page.functions.action(context)).toThrow('Visual revision state');
  expect(() => pinned.page.functions.callback(context)).toThrow('Visual callback');
  expect(application.state).toEqual({});
  expect(() => pinned.page.functions.action(f.metadata('old-node'))).toThrow('Visual revision state');
  expect(application.state).toEqual({});
});
it('rejects a particular helper with private mutable cache state and offers a local-state adjustment', async () => {
  const f = await fixture();
  await writeFile(path.join(f.directory, 'helper.ts'), 'let cache; export function keep(value) { cache = value; } export function read() { return cache; }');
  await writeFile(path.join(f.directory, 'page.functions.ts'), "import { keep } from './helper'; export function action(context) { keep(context); }");
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  await expect(f.server.transformRequest(id)).rejects.toThrow('helper.ts has opaque private mutable state');
});
it('recovers a lost metadata anchor before runtime discovery and blocks orphan/journal HTTP bypasses', async () => {
  const f = await fixture();
  await expect(saveRoleBundle(f.location, { expectedChecksum: f.before.checksum, files: f.candidate, validate() {}, admit() {}, async beforeWrite(name) {
    if (name === 'page.visual.json') { await rm(path.join(f.directory, name)); throw new Error('Metadata replacement interrupted'); }
  }, beforeRollbackWrite() { throw new Error('Rollback unavailable'); } })).rejects.toMatchObject({ code: 'source.recovery-required' });
  const http = createHttpServer(f.server.middlewares); httpServers.push(http); await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
  const orphan = await fetch(origin + '/src/pages/example/page.html?raw'); expect(orphan.status).toBe(409);
  expect((await fetch(origin + '/src/pages/example/PAGE.HTML?raw')).status).toBe(409);
  expect((await fetch(origin + '/src/pages/example/PAGE.VISUAL.JSON?import')).status).toBe(409);
  const { storageKey } = await import('../packages/artifacts/src/storage.js');
  const journalPath = '/src/pages/.uib/transactions/' + storageKey(path.join(f.directory, f.location.anchor)) + '/pending.json?raw';
  expect((await fetch(origin + journalPath)).status).toBe(409);
  expect((await fetch(origin + journalPath.replace('/.uib/transactions/', '/.UIB/TRANSACTIONS/'))).status).toBe(409);
  const id = '\0virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
  const restored = await f.server.transformRequest(id); expect(restored!.code).toContain('old-node'); expect(restored!.code).not.toContain('new-node');
  expect((await readRoleBundle(f.location)).files).toEqual(f.original);
});
it('renders coherent revisions in a real browser, refreshes after commit, and retains the prior render on recovery failure', async () => {
  const f = await fixture(); await f.server.close();
  const runtime = fileURLToPath(new URL('../packages/visual-artifacts/dist/runtime.js', import.meta.url)).replaceAll('\\', '/');
  await writeFile(path.join(f.root, 'index.html'), '<!doctype html><html><body><label>Live draft<input aria-label="Live draft"></label><script type="module" src="/src/pages/example/live.ts"></script></body></html>');
  await writeFile(path.join(f.directory, 'live.ts'), `import {page,components,packages,runtimeRevision} from 'virtual:uip-visual-page'; import {mountVisualArtifact} from ${JSON.stringify(runtime)}; const instance=mountVisualArtifact(page,{components,packages}); document.body.append(instance.host); document.body.dataset.revision=runtimeRevision; document.body.dataset.name=page.metadata.displayName; document.body.dataset.css=page.css;`);
  const server = await createServer({ configFile: false, root: f.root, plugins: [visualArtifacts({ applicationRoot: f.root })], optimizeDeps: { noDiscovery: true }, server: { host: '127.0.0.1', port: 0, fs: { allow: [f.root, path.resolve('.')] } } }); servers.push(server); await server.listen();
  const origin = server.resolvedUrls!.local[0];
  const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
  const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(), errors: string[] = []; page.on('pageerror', (error: Error) => errors.push(error.message));
    const messages: any[] = [];
    page.on('websocket', (socket: any) => socket.on('framereceived', (frame: any) => { try { messages.push(JSON.parse(String(frame.payload))); } catch {} }));
    await page.goto(origin); await expect.poll(() => page.locator('[data-uip-node="old-node"]').innerText()).toBe('old-node');
    await page.getByRole('textbox', { name: 'Live draft' }).fill('unsubmitted local input');
    await page.evaluate(() => { document.body.dataset.instance = 'original-document'; });
    // Deterministic delayed watcher hint for bytes already loaded by this browser.
    // It must still validate, but must not tear down the current document.
    server.watcher.emit('change', path.join(f.directory, 'page.html'));
    await expect.poll(() => messages.some(message => message.event === 'uip:validated-visual-refresh')).toBe(true);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    expect(await page.getByRole('textbox', { name: 'Live draft' }).inputValue()).toBe('unsubmitted local input');
    expect(await page.locator('body').getAttribute('data-instance')).toBe('original-document');
    const old = await page.locator('body').getAttribute('data-revision'), entered = gate(), release = gate();
    const saving = saveRoleBundle(f.location, { expectedChecksum: f.before.checksum, files: f.candidate, validate() {}, admit() {}, async beforeWrite(name) { if (name === 'page.visual.json') { entered.release(); await release.wait; } } });
    await entered.wait;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(await page.locator('[data-uip-node="old-node"]').innerText()).toBe('old-node');
      expect((await fetch(origin + 'src/pages/example/page.html?raw')).status).toBe(409);
    } finally { release.release(); await saving; }
    await expect.poll(() => page.locator('[data-uip-node="new-node"]').innerText(), { timeout: 15000 }).toBe('new-node');
    expect(await page.locator('body').getAttribute('data-css')).toBe('/* new-node */');
    expect(await page.locator('body').getAttribute('data-name')).toBe('new-node');
    expect(await page.locator('body').getAttribute('data-revision')).not.toBe(old);
    const fresh = await browser.newPage(); await fresh.goto(origin);
    await expect.poll(() => fresh.locator('[data-uip-node="new-node"]').innerText()).toBe('new-node');
    const original = await readRoleBundle(f.location);
    await expect(saveRoleBundle(f.location, { expectedChecksum: original.checksum, files: f.original, validate() {}, admit() {}, beforeWrite(name) { if (name === 'page.visual.json') throw new Error('Injected commit failure'); }, beforeRollbackWrite() { throw new Error('Injected rollback failure'); } })).rejects.toMatchObject({ code: 'source.recovery-required' });
    const { storageKey } = await import('../packages/artifacts/src/storage.js');
    await writeFile(path.join(f.location.root, '.uib/transactions', storageKey(path.join(f.directory, f.location.anchor)), 'pending.json'), '{corrupt');
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(await page.locator('[data-uip-node="new-node"]').innerText()).toBe('new-node');
    const id = 'virtual:uip-visual-page:' + encodeURIComponent(path.join(f.directory, 'page.visual.json')) + '.js';
    const blocked = await fetch(origin + '@id/__x00__' + encodeURI(id)); expect(blocked.ok).toBe(false);
    expect(await blocked.text()).not.toContain('export const runtimeRevision');
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
}, 30000);
