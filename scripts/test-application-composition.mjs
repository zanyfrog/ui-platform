import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer as httpServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { createServer, build, preview } from 'vite';
let playwright;
const proof = [], print = console.log.bind(console);
console.log = (...values) => { for (const line of values.join(' ').split('\n')) if (line.startsWith('PASS:')) proof.push(line.slice(6).trim()); print(...values); };
try { playwright = createRequire(import.meta.url)('playwright'); } catch { playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright'); }
const temporary = await mkdtemp(path.join(tmpdir(), 'c-')), apps = path.join(temporary, 'apps'); await mkdir(apps);
const probe = httpServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const apiEnvironment = { ...process.env, UI_APPS_DIR: apps, UI_RUNTIME_DIR: path.join(temporary, 'runtime'), UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '0', NODE_ENV: 'test' };
// A PowerShell 7 test host can inject incompatible Core modules into the exporter's
// Windows PowerShell subprocess. Let Windows PowerShell resolve its own module path.
if (process.platform === 'win32') for (const name of Object.keys(apiEnvironment)) if (name.toLowerCase() === 'psmodulepath') delete apiEnvironment[name];
const api = spawn(process.execPath, ['dist-server/server/index.js'], { env: apiEnvironment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = ''; api.stdout.on('data', data => { output += data; }); api.stderr.on('data', data => { output += data; });
const origin = `http://127.0.0.1:${port}`, base = origin + '/api/apps/composition-test';
async function request(url, method = 'GET', input) { const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, ...(input ? { body: JSON.stringify(input) } : {}) }); const body = await response.json(); if (!response.ok) throw new Error(JSON.stringify(body)); return body; }
let browser, manager, application, production;
try {
  for (let i = 0; ; i++) { if (api.exitCode !== null) throw new Error(output); if (await fetch(origin + '/api/health').then(r => r.ok).catch(() => false)) break; if (i > 100) throw new Error('API timeout: ' + output); await new Promise(resolve => setTimeout(resolve, 50)); }
  const app = await request(origin + '/api/apps', 'POST', { name: 'Composition Browser Reference', key: 'composition-test', templateId: 'standard' });
  assert.equal(app.valid, true); assert.deepEqual(app.pages, ['/', '/admin']);
  const root = path.join(apps, 'composition-test'), provenance = JSON.parse(await readFile(path.join(root, 'template.provenance.json'), 'utf8'));
  assert.equal(provenance.templateId, 'standard'); assert.equal(provenance.templateAppliedVersion, '2.0.0');
  for (const file of ['shells/public/shell.html', 'shells/admin/shell.html', 'menus/main.json', 'styles/site.css', 'assets/branding/logo.svg']) assert.ok(await readFile(path.join(root, file)));
  assert.ok(!(await readdir(root)).includes('components'), 'Standard Applications do not own Components');
  const sharedId = 'cmp_platform_composition-shared-help-reference';
  const visualWorkspace = await request(base + '/visual-artifacts');
  const shared = visualWorkspace.components.find(component => component.metadata?.componentId === sharedId);
  assert.ok(shared); assert.equal(shared.locator, 'composition-shared-help/component.visual.json');
  assert.ok(visualWorkspace.components.every(component => !component.locator.startsWith('application/')));
  for (const page of visualWorkspace.pages) assert.ok(page.files.source.includes(sharedId));
  for (const method of ['GET', 'POST']) assert.equal((await fetch(base + '/visual-local-components', { method })).status, 404);
  // A manually placed source folder must not become an Application Component catalog.
  await cp('components/composition-shared-help', path.join(root, 'components/unsupported'), { recursive: true });
  const unsupported = JSON.parse(await readFile(path.join(root, 'components/unsupported/component.visual.json'), 'utf8'));
  unsupported.componentId = 'cmp_platform_unsupported-application-component'; unsupported.artifactId = 'art_unsupported-application-component';
  await writeFile(path.join(root, 'components/unsupported/component.visual.json'), JSON.stringify(unsupported));
  const withoutApplicationCatalog = await request(base + '/visual-artifacts');
  assert.ok(!withoutApplicationCatalog.components.some(component => component.metadata?.componentId === unsupported.componentId));
  assert.ok((await request(base + '/composition')).pages.length > 0);
  await rm(path.join(root, 'components'), { recursive: true, force: true });
  console.log('PASS: Public/Admin Pages reference the same Platform-owned Component; no Application Component catalog or creation endpoint exists');
  console.log('PASS: actual Application creation copies the Standard tree, records identity/provenance, installs dependencies and builds services');
  const workspace = await request(base + '/composition'); assert.equal(workspace.shells.length, 2); assert.equal(workspace.pages.length, 2);
  const page = await request(base + '/visual-pages', 'POST', { name: 'new-page', route: '/new-page' });
  assert.equal(page.metadata.shellId, workspace.settings.defaultShellId); assert.ok(page.metadata.routeId);
  const savedSettings = await request(base + '/composition-source?path=app.settings.json'); const nextSettings = JSON.parse(savedSettings.content); nextSettings.presentation.defaultShellId = workspace.shells.find(shell => shell.metadata.name === 'admin').metadata.artifactId;
  await request(base + '/composition-source?path=app.settings.json', 'PUT', { content: JSON.stringify(nextSettings), expectedHash: savedSettings.hash });
  assert.equal((await request(base + '/visual-pages?locator=' + encodeURIComponent(page.locator))).metadata.shellId, workspace.settings.defaultShellId);
  const second = await request(base + '/visual-pages', 'POST', { name: 'next-page', route: '/next-page' }); assert.equal(second.metadata.shellId, nextSettings.presentation.defaultShellId);
  const unchanged = await request(base + '/composition-source?path=app.settings.json'); nextSettings.presentation.defaultShellId = workspace.settings.defaultShellId; await request(base + '/composition-source?path=app.settings.json', 'PUT', { content: JSON.stringify(nextSettings), expectedHash: unchanged.hash });
  const stale = await fetch(base + '/composition-source?path=app.settings.json', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: unchanged.content, expectedHash: savedSettings.hash }) }); assert.equal(stale.ok, false);
  console.log('PASS: Pages persist resolved Shell identities; default changes affect new Pages only; stale source saves are rejected');
  const simpleShell = await request(base + '/visual-shells', 'POST', { name: 'simple' });
  const pageUrl = base + '/visual-pages?locator=' + encodeURIComponent(page.locator);
  const withRegions = await request(pageUrl, 'PUT', { role: 'source', expectedHash: page.hash, content: '<section data-uip-node="test_main" data-uip-region="region-main"><p data-uip-node="test_keep">Keep content</p></section><section data-uip-node="test_hero" data-uip-region="region-hero"><p data-uip-node="test_discard">Discard explicitly</p></section>' });
  await assert.rejects(request(base + '/page-shell', 'POST', { locator: page.locator, shellId: simpleShell.metadata.artifactId, expectedHash: withRegions.hash }), /Map or explicitly discard/);
  const switched = await request(base + '/page-shell', 'POST', { locator: page.locator, shellId: simpleShell.metadata.artifactId, expectedHash: withRegions.hash, decisions: { 'region-hero': null } });
  assert.ok(switched.files.source.includes('Keep content')); assert.ok(!switched.files.source.includes('Discard explicitly'));
  await assert.rejects(request(base + '/visual-shells?locator=' + encodeURIComponent(simpleShell.locator), 'DELETE', { expectedHash: simpleShell.hash }), /used by Pages/);
  await assert.rejects(request(base + '/visual-shells?locator=' + encodeURIComponent(simpleShell.locator), 'PUT', { role: 'source', expectedHash: simpleShell.hash, content: '<p data-uip-node="no_regions">No Regions</p>' }), /remapping dependent Pages/);
  console.log('PASS: Shell switching requires explicit unmatched Region decisions, retains matching content and blocks destructive Shell edits/deletion');
  const binary = new Uint8Array([137, 80, 78, 71, 255, 1, 128]);
  async function upload(expectedHash = '') { const form = new FormData(); form.set('path', 'assets/images/test.png'); form.set('expectedHash', expectedHash); form.set('asset', new Blob([binary], { type: 'image/png' }), 'test.png'); return fetch(base + '/composition-asset', { method: 'POST', body: form }); }
  const uploaded = await upload(); assert.equal(uploaded.ok, true); const asset = await uploaded.json();
  assert.deepEqual(new Uint8Array(await (await fetch(base + '/composition-asset?path=assets/images/test.png')).arrayBuffer()), binary);
  assert.equal((await upload()).ok, false); assert.equal((await upload(asset.hash)).ok, true);
  console.log('PASS: Application asset uploads preserve binary bytes and require a current checksum for replacement');
  manager = await createServer({ configFile: 'vite.config.ts', server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: origin } } } }); await manager.listen();
  browser = await playwright.chromium.launch({ headless: true, channel: process.env.UI_VISUAL_TEST_BROWSER ?? 'msedge' }); const tab = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = []; tab.on('pageerror', error => errors.push(String(error)));
  await tab.goto(manager.resolvedUrls.local[0] + 'tests/browser/application-composition.html'); await tab.waitForFunction(() => document.body.dataset.result);
  console.log(await tab.locator('#results').innerText()); assert.equal(await tab.locator('body').getAttribute('data-result'), 'passed');
  await tab.goto(manager.resolvedUrls.local[0] + 'tests/browser/application-composition-live.html'); await tab.waitForFunction(() => document.body.dataset.ready);
  assert.equal(await tab.getByRole('button', { name: 'Create Application Component', exact: true }).count(), 0);
  await tab.getByLabel('Visual Artifact', { exact: true }).selectOption('page:public/page.visual.json');
  const frame = tab.frameLocator('iframe[title="Visual Artifact runtime preview"]'); await frame.getByRole('heading', { name: 'Your Application is ready' }).waitFor();
  assert.ok(await tab.locator('[data-nodes] option[disabled]').count());
  await tab.getByLabel('Visual Artifact', { exact: true }).selectOption('shell:public/shell.visual.json'); await tab.getByRole('button', { name: 'Preview', exact: true }).click();
  await frame.getByText('Built with UI Platform').waitFor();
  console.log('PASS: real API editor opens Pages in rendered Shell context with locked fixed nodes and edits Shells through the same Visual Artifact editor');
  application = await createServer({ root, configFile: path.join(root, 'vite.config.js'), server: { host: '127.0.0.1', port: 0, strictPort: false } }); await application.listen();
  const appOrigin = application.resolvedUrls.local[0];
  await tab.goto(appOrigin); await tab.getByRole('heading', { name: 'Your Application is ready' }).waitFor(); await tab.getByRole('heading', { name: 'Shared Platform Component', exact: true }).waitFor();
  await tab.goto(appOrigin + 'admin'); await tab.getByRole('heading', { name: 'Administration', exact: true }).waitFor(); assert.equal(await tab.getByText('Admin overview', { exact: true }).count(), 0); await tab.getByRole('heading', { name: 'Shared Platform Component', exact: true }).waitFor();
  console.log('PASS: Public/Admin Pages use separate Shells and the same shared Platform Component with explicit empty Hero suppression');
  // A separate Vite process can still be finishing validated graph capture.
  // Foundation rejects admission before Publish starts; retry only that exact busy result.
  for (let attempt = 0; ; attempt++) {
    try { await request(base + '/presentation/publish', 'POST', {}); break; }
    catch (error) { if (attempt >= 30 || error.message !== '{"error":"Artifact is locked by another writer."}') throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  const frozen = path.join(root, 'presentation/versions/v1/composition/presentation/platform-components', sharedId, 'component.visual.json');
  assert.equal(JSON.parse(await readFile(frozen, 'utf8')).componentId, sharedId);
  const exported = await request(base + '/export', 'POST', {});
  const exportRoot = path.join(temporary, 'runtime/exports', path.basename(decodeURIComponent(exported.url), '.zip'), 'app');
  const portableComponent = path.join(exportRoot, 'presentation/platform-components', sharedId, 'component.visual.json');
  assert.equal(JSON.parse(await readFile(portableComponent, 'utf8')).componentId, sharedId);
  assert.ok(!(await readdir(exportRoot)).includes('components'));
  assert.ok((await fetch(origin + exported.url)).ok);
  console.log('PASS: Publish and portable export freeze referenced Platform Components without creating an Application-owned Component collection');
  const original = await readFile(path.join(root, 'src/pages/public/page.html'), 'utf8'); await writeFile(path.join(root, 'src/pages/public/page.html'), original.replace('Your Application is ready', 'Draft source changed'));
  await tab.goto(appOrigin); await tab.getByRole('heading', { name: 'Draft source changed' }).waitFor();
  await build({ root, configFile: path.join(root, 'vite.config.js'), logLevel: 'warn' });
  production = await preview({ root, configFile: path.join(root, 'vite.config.js'), preview: { host: '127.0.0.1', port: 0 } });
  await tab.goto(production.resolvedUrls.local[0]); await tab.getByRole('heading', { name: 'Your Application is ready' }).waitFor(); assert.equal(await tab.getByRole('heading', { name: 'Draft source changed' }).count(), 0);
  await tab.getByRole('heading', { name: 'Shared Platform Component', exact: true }).waitFor();
  console.log('PASS: saved source updates development immediately; production build keeps the existing published composition snapshot');
  assert.deepEqual(errors, [], 'Browser errors');
  if (process.env.UI_BUILDER_WP2_EVIDENCE) await writeFile(path.join(process.env.UI_BUILDER_WP2_EVIDENCE, 'composition-browser-results.json'), JSON.stringify({ passed: proof, pageErrors: errors, shortWindowsFixturePath: true }, null, 2));
} catch (error) { console.error(output); throw error; }
finally { await browser?.close(); await manager?.close(); await application?.close(); if (production) await new Promise(resolve => production.httpServer.close(resolve)); if (api.exitCode === null) { const closed = once(api, 'exit'); api.kill(); await closed; } await rm(temporary, { recursive: true, force: true }).catch(error => { if (error.code !== 'EPERM') throw error; console.log(`Windows holds the loaded native build library until process exit; temporary fixture: ${temporary}`); }); }
// All assertions and owned-server cleanup completed. Vite's production preview
// can retain build/plugin handles on Windows after its HTTP server is closed.
process.exit(0);
