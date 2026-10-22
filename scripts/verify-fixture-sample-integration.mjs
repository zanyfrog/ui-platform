// Exact four-entry verification allowlist. No application server, workspace config or live APIs.
import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'evidence/builder-v1-wp5-f-sample-integration-20261022', `run-${Date.now()}`); await mkdir(out);
const selected = ['tests/fixture-preview/lifecycle.test.ts', 'tests/fixture-preview/sample-coverage.test.ts', 'tests/fixture-preview/builder-editing.test.ts', 'tests/fixture-preview/builder-editing-harness.ts'];
const sources = [
  ...['lifecycle.ts', 'samples.ts', 'protocol.ts', 'panel.ts', 'host.ts', 'bootstrap.txt'].map(p => `src/client/fixture-preview/${p}`),
  ...['context', 'working-copy', 'editing-lifecycle', 'autosave-configuration', 'session', 'transport', 'recovery', 'saved-source', 'source-editor'].map(p => `src/client/artifact-editor/${p}.ts`),
  ...['coordinator', 'fixture-preview-binding'].map(p => `src/client/builder-workspace/${p}.ts`),
  'src/shared/artifact-editor.ts', 'src/shared/platform-settings.ts', 'src/shared/builder-workspace.ts',
  'packages/visual-artifacts/src/composition.ts', 'packages/visual-artifacts/src/source.ts', ...selected,
];
const admitted = new Set(sources.map(p => path.resolve(root, p)));
const sourceHashes = Object.fromEntries(await Promise.all(sources.map(async p => [p, createHash('sha256').update(await readFile(path.join(root, p))).digest('hex')])));
await writeFile(path.join(out, 'preflight.json'), JSON.stringify({ selected, inspectedSources: sourceHashes, configuration: 'direct esbuild + node:test; no setup hooks/discovery/workspace configuration', serial: true, retries: 0, parentSession: 'test-only exact in-memory GET /api/editor/session facade; no network forwarding', transport: 'existing context constructor injection, in-memory only', closureLimits: 'Default transport and WP2 copy-recovery module are inspected but their live/recovery paths are not invoked. No Foundation modules imported.' }, null, 2));
const plugin = { name: 'explicit-fixture-verification-inputs', setup(build) {
  build.onResolve({ filter: /\.txt\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.replace('?raw', '')) }));
  build.onLoad({ filter: /.*/ }, async args => {
    if (!admitted.has(path.resolve(args.path))) throw new Error(`INPUT_NOT_ADMITTED:${args.path}`);
    return { contents: await readFile(args.path, 'utf8'), loader: args.path.endsWith('.txt') ? 'text' : 'ts' };
  });
} };
async function compile(entry, platform) { return build({ absWorkingDir: root, entryPoints: [entry], bundle: true, write: false, platform, format: platform === 'node' ? 'esm' : 'iife', target: 'es2022', define: { 'import.meta.env.DEV': 'false' }, metafile: true, plugins: [plugin] }); }
const unitFiles = [], graphs = {};
for (const entry of selected.slice(0, 3)) {
  const result = await compile(entry, 'node'), file = path.join(out, path.basename(entry).replace('.ts', '.mjs'));
  await writeFile(file, result.outputFiles[0].text); unitFiles.push(file); graphs[entry] = result.metafile;
}
const unit = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...unitFiles], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 });
await writeFile(path.join(out, 'unit-results.txt'), unit.stdout + unit.stderr);
assert.equal(unit.status, 0, unit.stdout + unit.stderr);
const harness = await compile(selected[3], 'browser'); graphs[selected[3]] = harness.metafile;
await transform(await readFile(path.join(root, 'src/client/builder-workspace/shell.ts'), 'utf8'), { loader: 'ts', target: 'es2022' });
await writeFile(path.join(out, 'dependency-graphs.json'), JSON.stringify(graphs, null, 2));
const serverRequests = [], requests = [], failures = [], consoleMessages = [], errors = [], navigations = [], downloads = [], choosers = [];
const routes = new Map([
  ['/', { type: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>WP5-F source editing and sample fixtures</title></head><body><script src="/harness.js"></script></body></html>' }],
  ['/harness.js', { type: 'text/javascript', body: harness.outputFiles[0].text }],
]);
const server = createServer((request, response) => {
  serverRequests.push({ url: request.url, method: request.method, cookie: request.headers.cookie ?? null, authorization: request.headers.authorization ?? null });
  const resource = request.method === 'GET' && routes.get(request.url);
  response.writeHead(resource ? 200 : 405, { 'Content-Type': resource ? resource.type : 'text/plain', 'Cache-Control': 'no-store' }); response.end(resource ? resource.body : 'FIXTURE_ENDPOINT_DENIED');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = `http://127.0.0.1:${server.address().port}`;
const playwright = createRequire(path.resolve(root, '../ui-base/package.json'))('playwright');
let browser; const checks = [], observations = {};
async function frameOf(page) { const element = await page.$('iframe'); assert(element, 'Expected restricted fixture frame'); const frame = await element.contentFrame(); assert(frame); return frame; }
async function sourceFocus(page) { await page.evaluate(() => window.editingHarness.focusSource()); }
async function capture(page) { return page.evaluate(() => window.editingHarness.snapshot()); }
async function render(page, kind, change = {}) {
  await page.locator('[data-fixture]').selectOption(kind);
  const sample = await page.evaluate(({ kind, change }) => ({ ...window.editingHarness.defaults[kind](), ...change }), { kind, change });
  await page.locator('[data-sample]').fill(JSON.stringify(sample, null, 2)); await sourceFocus(page);
  const before = await capture(page);
  await page.evaluate(() => window.editingHarness.panel.refresh());
  assert.equal(await page.locator('[aria-label="Fixture Preview"]').getAttribute('data-state'), 'ready');
  assert.deepEqual(await capture(page), before); return frameOf(page);
}
try {
  browser = await playwright.chromium.launch({ headless: true, channel: 'msedge' }); observations.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, acceptDownloads: false });
  async function newPage() {
    const page = await context.newPage();
    page.on('request', request => requests.push({ method: request.method(), url: request.url(), resource: request.resourceType() }));
    page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => errors.push(String(error)));
    page.on('framenavigated', frame => navigations.push({ main: frame === page.mainFrame(), url: frame.url() }));
    page.on('download', download => downloads.push(download.suggestedFilename())); page.on('filechooser', () => choosers.push('filechooser'));
    await page.goto(origin); await page.waitForFunction(() => window.editingHarness);
    await page.clock.install({ time: 1000000 }); await page.clock.pauseAt(1000100);
    return page;
  }
  const page = await newPage();
  await page.getByLabel('Source file', { exact: true }).selectOption('one.json');
  await page.getByLabel('Source file', { exact: true }).selectOption('two.txt');
  const source = page.getByLabel('Source for two.txt', { exact: true });
  await source.fill('synthetic dirty one'); await page.clock.runFor(800); await source.fill('synthetic dirty two');
  await page.evaluate(() => { window.editingHarness.userUndo(); const input = document.querySelector('.artifact-source-editor'); input.focus(); input.setSelectionRange(2, 9); });
  observations.dirtyBefore = await capture(page); assert.equal(observations.dirtyBefore.sourceText, 'synthetic dirty one');
  assert.equal(observations.dirtyBefore.editor.dirty, true); assert.equal(observations.dirtyBefore.editor.canRedo, true);
  let frame = await render(page, 'card', { header: 'Synthetic header slot', disabled: true, selected: true });
  assert.equal(await frame.locator('uib-card [slot=header]').textContent(), 'Synthetic header slot');
  assert.equal(await frame.locator('uib-card').getAttribute('selected'), '');
  await frame.locator('uib-card [part=base]').click({ force: true }); assert.equal(await frame.locator('uib-card').getAttribute('selected'), '');
  observations.card = await frame.evaluate(() => ({ origin: self.origin, header: document.querySelector('uib-card [slot=header]').textContent, disabled: document.querySelector('uib-card').hasAttribute('disabled'), selected: document.querySelector('uib-card').hasAttribute('selected'), csp: document.querySelector('meta[http-equiv]').content }));
  assert.equal(observations.card.origin, 'null');
  frame = await render(page, 'card'); await frame.locator('uib-card [part=base]').click(); assert.equal(await frame.locator('uib-card').getAttribute('selected'), '');
  await frame.locator('uib-card [part=base]').press('Enter'); assert.equal(await frame.locator('uib-card').getAttribute('selected'), null);
  checks.push('Expanded Card uses real canonical renderer: header slot, disabled/initial selection, pointer and keyboard selection; actual source editor unchanged');
  frame = await render(page, 'panel', { variant: 'flat', density: 'compact' });
  assert.equal(await frame.locator('uib-panel').getAttribute('variant'), 'flat');
  assert.equal(await frame.locator('uib-panel [slot=footer]').textContent(), 'Synthetic Panel footer');
  assert.match(await frame.locator('strong').textContent(), /not canonical Component parity/);
  await frame.locator('uib-panel button[part=toggle]').click(); assert.equal(await frame.locator('uib-panel').getAttribute('open'), null);
  assert.equal(await frame.locator('uib-panel [part=content]').isVisible(), false);
  await frame.locator('uib-panel button[part=toggle]').press('Enter'); assert.equal(await frame.locator('uib-panel').getAttribute('open'), '');
  observations.panel = await frame.evaluate(() => ({ className: document.querySelector('uib-panel').constructor.name, open: document.querySelector('uib-panel').open, body: document.querySelector('uib-panel span').textContent, footer: document.querySelector('uib-panel [slot=footer]').textContent }));
  await page.screenshot({ path: path.join(out, 'native-panel-and-source.png'), fullPage: true });
  frame = await render(page, 'panel', { collapsible: false, open: false });
  assert.equal(await frame.locator('uib-panel button[part=toggle]').count(), 0);
  assert.equal(await frame.locator('uib-panel [part=content]').isVisible(), true);
  assert.equal(await frame.evaluate(() => document.querySelector('uib-panel').open), true);
  checks.push('Actual registered native Panel renders text slots and fixed appearance; pointer/keyboard toggle local only; no canonical Definition fabricated');
  frame = await render(page, 'route');
  assert.deepEqual(JSON.parse(await frame.locator('pre').textContent()).matched, { personId: 'synthetic person' });
  frame = await render(page, 'route', { template: 'project-item', params: { projectId: 'Synthetic / project', itemId: 'item?#雪' } });
  const route = JSON.parse(await frame.locator('pre').textContent()); assert.equal(route.path, '/projects/Synthetic%20%2F%20project/items/item%3F%23%E9%9B%AA');
  assert.deepEqual(route.matched, { projectId: 'Synthetic / project', itemId: 'item?#雪' }); assert.equal(await frame.locator('pre').getAttribute('inert'), ''); assert.equal(await frame.locator('a').count(), 0);
  observations.route = route; await page.screenshot({ path: path.join(out, 'route-inspector-and-source.png'), fullPage: true });
  checks.push('Two-template route inspector uses native pure encoding/matching; inert text, no Page/Menu/router/navigation');
  await sourceFocus(page); const beforeStale = await capture(page), retainedCapture = await page.locator('[data-capture]').textContent();
  await page.evaluate(() => window.editingHarness.panel.invalidate('SIMULATED_STALE'));
  assert.equal(await page.locator('iframe').count(), 0); assert.equal(await page.locator('[data-view] pre').getAttribute('inert'), ''); assert.deepEqual(await capture(page), beforeStale);
  await page.locator('[data-sample]').fill('{"fixture":"route-inspector-v1","template":"person","params":{}}'); await sourceFocus(page);
  await page.evaluate(() => window.editingHarness.panel.refresh()); assert.equal(await page.locator('[data-capture]').textContent(), retainedCapture);
  assert.match(await page.locator('p[data-state]').textContent(), /SAMPLE_FIELDS_UNSUPPORTED/); assert.deepEqual(await capture(page), beforeStale);
  await page.evaluate(() => window.editingHarness.panel.revoke()); assert.equal(await page.locator('[data-view]').textContent(), ''); assert.equal(await page.locator('[data-sample]').inputValue(), '');
  await page.evaluate(() => window.editingHarness.panel.refresh()); assert.equal(await page.locator('iframe').count(), 0); assert.deepEqual(await capture(page), beforeStale);
  await page.evaluate(() => window.editingHarness.panel.dispose());
  // Explicit user tab changes reset only fixture identity/sample state and reactivate retained source DOM.
  await page.evaluate(() => window.editingHarness.open('two'));
  observations.replacementIdentity = { selection: await page.locator('[data-identity]').textContent(), capture: await page.locator('[data-capture]').textContent() };
  assert.match(observations.replacementIdentity.selection, /synthetic-two/); assert.match(observations.replacementIdentity.capture, /No successful capture/);
  await page.evaluate(() => window.editingHarness.open('one'));
  assert.deepEqual(await capture(page), beforeStale);
  await page.clock.runFor(10000);
  observations.dirtyAfter = await capture(page); assert.deepEqual(observations.dirtyAfter, observations.dirtyBefore);
  await page.evaluate(() => window.editingHarness.userRedo()); assert.equal(await source.inputValue(), 'synthetic dirty two'); await page.evaluate(() => window.editingHarness.userUndo()); assert.equal(await source.inputValue(), 'synthetic dirty one');
  await page.clock.runFor(10000); assert.equal((await capture(page)).saves.length, 0);
  checks.push('Actual context/working copy/source renderer/coordinator preserve dirty bytes, checksums, file/range, identity and real Undo/Redo across stale/error/revocation/disposal/tab reactivation; disabled autosave zero saves');
  frame = await render(page, 'panel');
  const beforeForged = await frame.locator('uib-panel').textContent();
  await page.evaluate(() => {
    const target = document.querySelector('iframe').contentWindow;
    for (const type of ['Publish', 'render', 'ready', 'Save']) target.postMessage({ type, nonce: 'wrong', session: 'wrong', identity: 'wrong', sequence: 1, sample: { fixture: 'arbitrary' } }, '*');
    window.postMessage({ type: 'ready', nonce: 'wrong', session: 'wrong', identity: 'wrong', sequence: 1 }, location.origin);
  });
  assert.equal(await frame.locator('uib-panel').textContent(), beforeForged);
  observations.denials = await frame.evaluate(async origin => {
    const result = { violations: [], network: {}, storage: {}, topNavigation: '', popup: false, scriptRan: false };
    window.__probe = result;
    document.addEventListener('securitypolicyviolation', event => result.violations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }));
    for (const [name, method] of [['read', 'GET'], ['mutation', 'POST'], ['upload', 'POST'], ['publish', 'POST']]) {
      try { await fetch(`${origin}/effect/${name}`, { method, body: method === 'POST' ? 'synthetic' : undefined, credentials: 'include' }); result.network[name] = 'UNEXPECTED_SUCCESS'; } catch (error) { result.network[name] = error.name; }
    }
    try { top.location.href = `${origin}/effect/top`; result.topNavigation = 'UNEXPECTED_SUCCESS'; } catch (error) { result.topNavigation = error.name; }
    result.popup = window.open(`${origin}/effect/popup`) !== null;
    for (const key of ['localStorage', 'sessionStorage']) { try { window[key].setItem('synthetic', 'value'); result.storage[key] = 'UNEXPECTED_SUCCESS'; } catch (error) { result.storage[key] = error.name; } }
    try { document.cookie = 'synthetic=value'; result.storage.cookie = document.cookie; } catch (error) { result.storage.cookie = error.name; }
    for (const kind of ['navigation', 'download']) { const anchor = document.createElement('a'); anchor.href = `${origin}/effect/${kind}`; if (kind === 'download') anchor.download = 'synthetic.txt'; document.body.append(anchor); anchor.click(); }
    const file = document.createElement('input'); file.type = 'file'; document.body.append(file); file.click();
    const form = document.createElement('form'); form.method = 'POST'; form.action = `${origin}/effect/submission`; document.body.append(form); form.submit();
    const image = document.createElement('img'); image.src = `${origin}/effect/image`; document.body.append(image);
    const css = document.createElement('style'); css.textContent = `body{background-image:url(${origin}/effect/css)}`; document.head.append(css);
    const script = document.createElement('script'); script.textContent = 'window.__probe.scriptRan=true'; document.body.append(script);
    return result;
  }, origin);
  await page.clock.runFor(20); observations.denials = await frame.evaluate(() => window.__probe);
  for (const value of Object.values(observations.denials.network)) assert.equal(value, 'TypeError');
  assert.equal(observations.denials.topNavigation, 'SecurityError'); assert.equal(observations.denials.popup, false); assert.equal(observations.denials.scriptRan, false);
  for (const value of Object.values(observations.denials.storage)) assert.equal(value, 'SecurityError');
  for (const directive of ['connect-src', 'img-src', 'script-src-elem']) assert(observations.denials.violations.some(v => v.directive === directive));
  assert.equal(page.url(), origin + '/'); assert.equal(downloads.length, 0); assert.equal(choosers.length, 0); assert.equal(context.pages().length, 1);
  checks.push('Forged/effect messages ignored; actual browser CSP/sandbox/event denials recorded for network, mutation, upload, Publish, submission, navigation, popup, download, file chooser, resources, scripts and storage');
  observations.syntheticSessionCalls = await page.evaluate(() => window.editingHarness.sessionCalls); assert.deepEqual(await page.evaluate(() => window.editingHarness.unexpected), []);
  await page.evaluate(() => window.editingHarness.cleanup()); await page.close();
  const disabledControl = await newPage();
  await disabledControl.getByLabel('Source file', { exact: true }).selectOption('one.json');
  await disabledControl.getByLabel('Source file', { exact: true }).selectOption('two.txt');
  const controlSource = disabledControl.getByLabel('Source for two.txt', { exact: true });
  await controlSource.fill('synthetic dirty one'); await disabledControl.clock.runFor(800); await controlSource.fill('synthetic dirty two');
  await disabledControl.evaluate(() => { window.editingHarness.userUndo(); const input = document.querySelector('.artifact-source-editor'); input.focus(); input.setSelectionRange(2, 9); });
  const controlBefore = await capture(disabledControl);
  await disabledControl.evaluate(async () => { await window.editingHarness.open('two'); await window.editingHarness.open('one'); });
  await disabledControl.clock.runFor(10000); const controlAfter = await capture(disabledControl);
  assert.deepEqual(controlBefore, observations.dirtyBefore); assert.deepEqual(controlAfter, observations.dirtyAfter);
  observations.disabledMatchedTraces = [{ withPreview: false, before: controlBefore, after: controlAfter }, { withPreview: true, before: observations.dirtyBefore, after: observations.dirtyAfter }];
  assert.deepEqual(await disabledControl.evaluate(() => window.editingHarness.unexpected), []);
  await disabledControl.evaluate(() => window.editingHarness.cleanup()); await disabledControl.close();
  checks.push('Autosave-disabled no-Preview browser control matches Preview trace exactly after source edits, real Undo, file/range selection, tabs and a 10000ms clock advance; zero saves in both');
  const traces = [];
  for (const withPreview of [false, true]) {
    const timed = await newPage();
    await timed.evaluate(() => { window.editingHarness.configure(true); window.editingHarness.hold(); });
    const start = await timed.evaluate(() => Date.now());
    await timed.getByLabel('Source for two.txt', { exact: true }).fill('synthetic autosave candidate');
    await timed.clock.runFor(1000);
    if (withPreview) { await timed.evaluate(() => window.editingHarness.panel.refresh()); await timed.evaluate(() => window.editingHarness.panel.invalidate('SIMULATED_TIMER_OVERLAP')); }
    await timed.clock.runFor(999); assert.equal((await capture(timed)).saves.length, 0);
    await timed.clock.runFor(1); assert.equal((await capture(timed)).saves.length, 1); assert.equal((await capture(timed)).editor.saveState, 'saving');
    if (withPreview) await timed.evaluate(() => window.editingHarness.panel.refresh());
    await timed.evaluate(async () => { await window.editingHarness.open('two'); await window.editingHarness.open('one'); });
    const pending = await capture(timed); assert.equal(pending.editor.saveState, 'saving'); assert.equal(pending.saves.length, 1); assert.deepEqual(pending.mutationCalls, []);
    await timed.clock.runFor(500); await timed.evaluate(() => window.editingHarness.release());
    const settled = await capture(timed); assert.equal(settled.editor.dirty, false); assert.equal(settled.saves.length, 1); assert.equal(settled.saves[0].time - start, 2000);
    traces.push({ pending: { ...pending, saves: pending.saves.map(e => ({ ...e, time: e.time - start })) }, settled: { ...settled, saves: settled.saves.map(e => ({ ...e, time: e.time - start })) } });
    assert.deepEqual(await timed.evaluate(() => window.editingHarness.unexpected), []); await timed.evaluate(() => window.editingHarness.cleanup()); await timed.close();
  }
  assert.deepEqual(traces[1], traces[0]); observations.autosaveMatchedTraces = traces;
  checks.push('Enabled autosave matches no-Preview trace exactly: zero writes at 1999ms, one normal timer save at 2000ms, pending save overlaps Refresh/tab changes, same committed in-memory bytes/checksum/history');
  assert.equal(errors.length, 0, errors.join('\n')); assert(serverRequests.every(request => request.method === 'GET' && ['/', '/harness.js'].includes(request.url) && request.cookie === null && request.authorization === null));
  await writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, checks, observations, serverRequests, requests, failures, consoleMessages, errors, navigations, downloads, choosers, limits: 'Actual source/context/coordinator modules with test adapter and synthetic sessions/transports; no full Builder shell/default adapters/backend qualification. Hostile probes use test-driver evaluation, not shipped code. Top navigation denied; arbitrary self-navigation is outside admitted code, not claimed sandbox-forbidden. Revocation simulated.' }, null, 2));
  await writeFile(path.join(out, 'verified-source-hashes.json'), JSON.stringify(sourceHashes, null, 2));
  console.log(`PASS: allowlisted unit files and ${checks.length} browser checkpoints; ${out}`);
} catch (error) {
  await writeFile(path.join(out, 'browser-failure.json'), JSON.stringify({ error: String(error), checks, observations, serverRequests, requests, failures, consoleMessages, errors, navigations }, null, 2)); throw error;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
