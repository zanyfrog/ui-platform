// Exact six-entry verification allowlist. No application server, workspace config or live APIs.
import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'evidence/builder-v1-wp5-f-shell-view-20261022', `run-${Date.now()}`); await mkdir(out);
const selected = ['tests/fixture-preview/lifecycle.test.ts', 'tests/fixture-preview/sample-coverage.test.ts', 'tests/fixture-preview/builder-editing.test.ts', 'tests/fixture-preview/builder-editing-harness.ts', 'tests/fixture-preview/shell-view.test.ts', 'tests/fixture-preview/shell-view-harness.ts'];
const sources = [
  ...['lifecycle.ts', 'samples.ts', 'protocol.ts', 'panel.ts', 'host.ts', 'bootstrap.txt'].map(p => `src/client/fixture-preview/${p}`),
  ...['context', 'working-copy', 'editing-lifecycle', 'autosave-configuration', 'session', 'transport', 'recovery', 'saved-source', 'source-editor'].map(p => `src/client/artifact-editor/${p}.ts`),
  ...['coordinator', 'fixture-preview-binding', 'shell-view'].map(p => `src/client/builder-workspace/${p}.ts`),
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
for (const entry of [selected[0], selected[1], selected[2], selected[4]]) {
  const result = await compile(entry, 'node'), file = path.join(out, path.basename(entry).replace('.ts', '.mjs'));
  await writeFile(file, result.outputFiles[0].text); unitFiles.push(file); graphs[entry] = result.metafile;
}
const unit = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...unitFiles], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 });
await writeFile(path.join(out, 'unit-results.txt'), unit.stdout + unit.stderr);
assert.equal(unit.status, 0, unit.stdout + unit.stderr);
const harness = await compile(selected[5], 'browser'); graphs[selected[5]] = harness.metafile;
const regression = await compile(selected[3], 'browser'); graphs[selected[3]] = regression.metafile;
await transform(await readFile(path.join(root, 'src/client/builder-workspace/shell.ts'), 'utf8'), { loader: 'ts', target: 'es2022' });
await writeFile(path.join(out, 'dependency-graphs.json'), JSON.stringify(graphs, null, 2));
const workspaceCss = await readFile(path.join(root, 'src/client/builder-workspace/workspace.css'), 'utf8');
const production = await readFile(path.join(root, 'src/client/builder-workspace/shell.ts'), 'utf8');
const harnessSource = await readFile(path.join(root, selected[5]), 'utf8');
assert(production.includes("import { createBuilderShellView } from './shell-view.js'"));
assert(harnessSource.includes("import { createBuilderShellView } from '../../src/client/builder-workspace/shell-view.js'"));
assert(graphs[selected[5]].inputs['src/client/builder-workspace/shell-view.ts']);
await writeFile(path.join(out, 'shared-module-proof.json'), JSON.stringify({ module: 'src/client/builder-workspace/shell-view.ts', sha256: sourceHashes['src/client/builder-workspace/shell-view.ts'], productionImport: "./shell-view.js", harnessImport: "../../src/client/builder-workspace/shell-view.js", productionUsesFactory: production.includes('const view = createBuilderShellView('), harnessUsesFactory: harnessSource.includes('const view = createBuilderShellView('), executedHarnessGraphContainsExactModule: true, productionVerification: 'Direct import/source mapping and syntax transform only; normal composition root not executed', cssHash: createHash('sha256').update(workspaceCss).digest('hex') }, null, 2));
const serverRequests = [], requests = [], failures = [], consoleMessages = [], errors = [], navigations = [], downloads = [], choosers = [];
const routes = new Map([
  ['/', { type: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>${workspaceCss}</style><title>Shared production Builder shell view</title></head><body><script src="/harness.js"></script></body></html>` }],
  ['/harness.js', { type: 'text/javascript', body: harness.outputFiles[0].text }],
  ['/regression', { type: 'text/html', body: '<!doctype html><html><head><link rel="icon" href="data:,"></head><body><script src="/regression.js"></script></body></html>' }],
  ['/regression.js', { type: 'text/javascript', body: regression.outputFiles[0].text }],
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: false });
  async function newPage(route = '/') {
    const page = await context.newPage();
    page.on('request', request => requests.push({ method: request.method(), url: request.url(), resource: request.resourceType() }));
    page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => errors.push(String(error)));
    page.on('framenavigated', frame => navigations.push({ main: frame === page.mainFrame(), url: frame.url() }));
    page.on('download', download => downloads.push(download.suggestedFilename())); page.on('filechooser', () => choosers.push('filechooser'));
    await page.goto(origin + route); await page.waitForFunction(() => window.editingHarness);
    await page.clock.install({ time: 1000000 }); await page.clock.pauseAt(1000100);
    return page;
  }
  async function nav(page, locator) {
    await page.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name: `Synthetic ${locator}`, exact: true }).click();
    await page.evaluate(() => window.editingHarness.idle());
  }
  async function tab(page, locator) {
    await page.getByRole('tab', { name: new RegExp(`^Synthetic ${locator}`) }).click(); await page.evaluate(() => window.editingHarness.idle());
  }
  const regressionPage = await newPage('/regression');
  observations.previousHarnessBefore = await capture(regressionPage);
  await regressionPage.evaluate(() => window.editingHarness.panel.refresh());
  assert.deepEqual(await capture(regressionPage), observations.previousHarnessBefore);
  assert.equal(await (await frameOf(regressionPage)).locator('uib-card').count(), 1);
  await regressionPage.evaluate(() => window.editingHarness.cleanup()); await regressionPage.close();
  checks.push('Previously admitted browser entry still renders its restricted native fixture without source changes; original 20 unit regressions retained');

  const page = await newPage();
  assert.equal(await page.getByRole('region', { name: 'Application Builder workspace', exact: true }).count(), 1);
  assert.equal(await page.getByRole('tab').count(), 1);
  assert.equal(await page.getByRole('tab').getAttribute('aria-selected'), 'true');
  assert.match(await page.locator('[data-status]').textContent(), /Artifact authorized/);
  observations.initialMetrics = await page.evaluate(() => window.editingHarness.metrics()); assert.equal(observations.initialMetrics.activeViewClickListeners, 1);
  await page.getByLabel('Source file', { exact: true }).selectOption('one.json'); await page.getByLabel('Source file', { exact: true }).selectOption('two.txt');
  await page.evaluate(() => { window.retainedEditor = document.querySelector('[data-stage]').firstElementChild; });
  await page.getByLabel('Source for two.txt', { exact: true }).fill('synthetic dirty one'); await page.clock.runFor(800);
  await page.getByLabel('Source for two.txt', { exact: true }).fill('synthetic dirty two');
  await page.evaluate(() => { window.editingHarness.userUndo(); const input = document.querySelector('.artifact-source-editor'); input.setSelectionRange(2, 9); input.focus(); });
  observations.dirtyBefore = await capture(page);
  assert.match(await page.getByRole('tab').textContent(), /•/);
  assert(await page.evaluate(() => document.querySelector('[data-stage]').firstElementChild === window.retainedEditor));
  await nav(page, 'two'); assert.equal(await page.getByRole('tab').count(), 2);
  assert.match(await page.locator('[data-identity]').textContent(), /synthetic-two/);
  await tab(page, 'one'); assert.deepEqual(await capture(page), observations.dirtyBefore);
  assert(await page.evaluate(() => document.querySelector('[data-stage]').firstElementChild === window.retainedEditor));
  await page.getByRole('button', { name: 'Close Synthetic one', exact: true }).click(); await page.evaluate(() => window.editingHarness.idle());
  assert.match(await page.locator('[data-status]').textContent(), /Tab retained/); assert.equal(await page.getByRole('tab').count(), 2);
  await sourceFocus(page); assert.deepEqual(await capture(page), observations.dirtyBefore);
  checks.push('Identical shared production view handles actual navigation/tab/dirty/status/close wiring and retains the real source-editor DOM, file/range, identity and Undo/Redo state');

  const actionsBeforePreview = await page.evaluate(() => window.editingHarness.actions.length);
  let frame = await render(page, 'panel'); assert.equal(await frame.locator('uib-panel').count(), 1);
  await frame.locator('uib-panel button[part=toggle]').click(); assert.equal(await frame.locator('uib-panel').getAttribute('open'), null);
  await sourceFocus(page); const beforePreview = await capture(page);
  const oldCapture = await page.locator('[data-capture]').textContent();
  await page.evaluate(() => window.editingHarness.panel.invalidate('SIMULATED_STALE')); assert.equal(await page.locator('iframe').count(), 0);
  assert.equal(await page.locator('[data-view] pre').getAttribute('inert'), ''); assert.deepEqual(await capture(page), beforePreview);
  await page.locator('[data-sample]').fill('{"fixture":"route-inspector-v1","template":"person","params":{}}'); await sourceFocus(page);
  await page.evaluate(() => window.editingHarness.panel.refresh()); assert.equal(await page.locator('[data-capture]').textContent(), oldCapture);
  assert.match(await page.locator('p[data-state]').textContent(), /SAMPLE_FIELDS_UNSUPPORTED/); assert.deepEqual(await capture(page), beforePreview);
  await page.getByRole('button', { name: 'Preview saved artifact', exact: true }).click();
  assert.match(await page.locator('p[data-state]').textContent(), /SAVED_CAPTURE_UNAVAILABLE/);
  await sourceFocus(page); await page.evaluate(() => window.editingHarness.panel.revoke());
  assert.equal(await page.locator('[data-view]').textContent(), ''); assert.equal(await page.locator('[data-sample]').inputValue(), '');
  await page.evaluate(() => window.editingHarness.panel.refresh()); assert.equal(await page.locator('iframe').count(), 0);
  await page.evaluate(() => window.editingHarness.panel.dispose()); assert.deepEqual(await capture(page), beforePreview);
  assert.equal(await page.evaluate(() => window.editingHarness.actions.length), actionsBeforePreview);
  await page.locator('[data-collapse]').click(); assert.equal(await page.locator('nav').getAttribute('hidden'), '');
  assert.equal(await page.locator('[data-collapse]').getAttribute('aria-expanded'), 'false');
  await page.locator('[data-collapse]').click(); assert.equal(await page.locator('[data-collapse]').getAttribute('aria-expanded'), 'true');
  await sourceFocus(page); const beforePark = await capture(page);
  observations.beforePark = beforePark;
  const priorActions = await page.evaluate(() => window.editingHarness.actions.length);
  await page.evaluate(() => { window.editingHarness.park(); const root = window.editingHarness.view.element; root.querySelector('nav button').click(); root.querySelector('[data-collapse]').click(); });
  observations.parked = await page.evaluate(() => ({ metrics: window.editingHarness.metrics(), attached: window.editingHarness.view.element.isConnected, frames: window.editingHarness.view.element.querySelectorAll('iframe').length, editor: window.editingHarness.contexts.get('one').context.snapshot }));
  assert.equal(observations.parked.metrics.activeViewClickListeners, 0); assert.equal(observations.parked.metrics.actions.length, priorActions);
  assert.equal(observations.parked.attached, false); assert.equal(observations.parked.frames, 0); assert.deepEqual(observations.parked.editor, beforePark.editor);
  await page.evaluate(() => window.editingHarness.remount()); await tab(page, 'one'); assert.deepEqual(await capture(page), beforePark);
  await page.evaluate(() => { window.editingHarness.unmount(); window.editingHarness.remount(); window.editingHarness.view.mount(window.editingHarness.target, 'Synthetic shared Builder shell'); });
  await tab(page, 'one'); assert.deepEqual(await capture(page), beforePark);
  assert.equal((await page.evaluate(() => window.editingHarness.metrics())).activeViewClickListeners, 1);
  observations.afterRemount = await capture(page); observations.remountMetrics = await page.evaluate(() => window.editingHarness.metrics());
  await page.screenshot({ path: path.join(out, 'shared-shell-dirty-remounted.png'), fullPage: true });
  await page.evaluate(() => window.editingHarness.userRedo()); assert.equal(await page.getByLabel('Source for two.txt', { exact: true }).inputValue(), 'synthetic dirty two');
  await page.evaluate(() => window.editingHarness.userUndo()); assert.equal(await page.getByLabel('Source for two.txt', { exact: true }).inputValue(), 'synthetic dirty one');
  await page.clock.runFor(10000); assert.equal((await capture(page)).saves.length, 0);
  checks.push('Preview Refresh/sample/error/unavailable/stale/revoke/dispose never mutates editor or invokes view actions; collapse/park/unmount/remount preserve bytes, file/range and history; delegated listener detaches and reattaches once');

  frame = await render(page, 'panel');
  const beforeMessages = await frame.locator('uib-panel').textContent();
  await page.evaluate(() => {
    const target = document.querySelector('iframe').contentWindow;
    for (const type of ['Publish', 'Save', 'render', 'ready']) target.postMessage({ type, nonce: 'wrong', session: 'wrong', identity: 'wrong', sequence: 1, sample: {} }, '*');
    window.postMessage({ type: 'ready', nonce: 'wrong', session: 'wrong', identity: 'wrong', sequence: 1 }, location.origin);
  });
  assert.equal(await frame.locator('uib-panel').textContent(), beforeMessages);
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
  for (const value of Object.values(observations.denials.storage)) assert.equal(value, 'SecurityError');
  assert.equal(observations.denials.topNavigation, 'SecurityError'); assert.equal(observations.denials.popup, false); assert.equal(observations.denials.scriptRan, false);
  for (const directive of ['connect-src', 'img-src', 'script-src-elem']) assert(observations.denials.violations.some(v => v.directive === directive));
  assert.equal(downloads.length, 0); assert.equal(choosers.length, 0); assert.equal(context.pages().length, 1); assert.equal(page.url(), origin + '/');
  await page.evaluate(() => window.editingHarness.suspendSession());
  observations.suspended = await page.evaluate(() => ({ status: document.querySelector('[data-status]').textContent, stageChildren: document.querySelector('[data-stage]').children.length, frames: document.querySelectorAll('iframe').length, retained: window.editingHarness.contexts.get('one').context.hasCopy, exposedSnapshot: window.editingHarness.contexts.get('one').context.snapshot ?? null, mutationCalls: window.editingHarness.contexts.get('one').mutationCalls }));
  assert.equal(observations.suspended.stageChildren, 0); assert.equal(observations.suspended.frames, 0); assert.equal(observations.suspended.retained, true); assert.equal(observations.suspended.exposedSnapshot, null); assert.deepEqual(observations.suspended.mutationCalls, []);
  await page.evaluate(() => window.editingHarness.cleanup());
  observations.disposed = await page.evaluate(() => { const h = window.editingHarness, before = h.actions.length; h.view.element.querySelector('nav button')?.click(); h.view.element.querySelector('[data-collapse]').click(); let remount = ''; try { h.view.mount(h.target, 'invalid'); } catch (error) { remount = error.message; } return { metrics: h.metrics(), attached: h.view.element.isConnected, frames: h.view.element.querySelectorAll('iframe').length, unchangedActions: before === h.actions.length, remount }; });
  assert.equal(observations.disposed.metrics.activeViewClickListeners, 0); assert.equal(observations.disposed.frames, 0); assert.equal(observations.disposed.attached, false); assert(observations.disposed.unchangedActions); assert.equal(observations.disposed.remount, 'SHELL_VIEW_DISPOSED');
  assert.deepEqual(observations.disposed.metrics.unexpected, []); await page.close();
  checks.push('Restricted-frame effects and forged messages denied; simulated local session hides retained editor/source and frame; terminal view disposal removes listeners, rejects remount and performs no callback');

  const racePage = await newPage();
  await racePage.evaluate(() => { window.releaseAuthorization = window.editingHarness.deferAuthorization(); });
  await racePage.getByRole('navigation').getByRole('button', { name: 'Synthetic two', exact: true }).click();
  await racePage.getByRole('navigation').getByRole('button', { name: 'Synthetic one', exact: true }).click();
  await racePage.evaluate(async () => { window.releaseAuthorization(); await window.editingHarness.idle(); });
  assert.equal((await capture(racePage)).originalIdentity.id, 'synthetic-one');
  await racePage.evaluate(() => { window.releaseFocus = window.editingHarness.deferFocus(); });
  await racePage.getByRole('navigation').getByRole('button', { name: 'Synthetic two', exact: true }).click(); await racePage.evaluate(() => window.editingHarness.focusEntered());
  await racePage.getByRole('navigation').getByRole('button', { name: 'Synthetic one', exact: true }).click();
  await racePage.evaluate(async () => { window.releaseFocus(); await window.editingHarness.idle(); });
  observations.lateNavigation = await capture(racePage); assert.equal(observations.lateNavigation.originalIdentity.id, 'synthetic-one');
  assert.equal(await racePage.locator('[data-stage] article').getAttribute('data-locator'), 'one'); assert.match(await racePage.locator('[data-identity]').textContent(), /synthetic-one/);
  assert.deepEqual((await racePage.evaluate(() => window.editingHarness.metrics())).unexpected, []);
  await racePage.evaluate(() => window.editingHarness.cleanup()); await racePage.close();
  checks.push('Actual shared navigation controls and coordinator reject deferred authorization and superseded editor focus without replacing newest stage/owner/Preview identity');

  const comparisons = {};
  for (const enabled of [false, true]) {
    const traces = [];
    for (const withPreview of [false, true]) {
      const timed = await newPage();
      await timed.evaluate(enabled => { window.editingHarness.configure(enabled); if (enabled) window.editingHarness.hold(); }, enabled);
      const start = await timed.evaluate(() => Date.now());
      await timed.getByLabel('Source for two.txt', { exact: true }).fill('synthetic autosave candidate');
      await timed.evaluate(() => document.querySelector('.artifact-source-editor').setSelectionRange(2, 9));
      await timed.clock.runFor(1000);
      if (withPreview) { await timed.evaluate(() => window.editingHarness.panel.refresh()); await timed.evaluate(() => window.editingHarness.panel.invalidate('SIMULATED_TIMER_OVERLAP')); }
      await timed.clock.runFor(999); assert.equal((await capture(timed)).saves.length, 0);
      await timed.clock.runFor(1); assert.equal((await capture(timed)).saves.length, enabled ? 1 : 0);
      if (enabled) { assert.equal((await capture(timed)).editor.saveState, 'saving'); assert.match(await timed.getByRole('tab').textContent(), /pending/); }
      if (withPreview) await timed.evaluate(() => window.editingHarness.panel.refresh());
      await nav(timed, 'two'); await tab(timed, 'one');
      const pending = await capture(timed); assert.deepEqual(pending.mutationCalls, []);
      if (enabled) { assert.equal(pending.editor.saveState, 'saving'); assert.equal(pending.saves.length, 1); }
      await timed.evaluate(() => window.editingHarness.park()); await timed.evaluate(() => window.editingHarness.remount()); await tab(timed, 'one');
      await timed.clock.runFor(500); if (enabled) await timed.evaluate(() => window.editingHarness.release());
      if (!enabled) await timed.clock.runFor(10000);
      const settled = await capture(timed), metrics = await timed.evaluate(() => window.editingHarness.metrics());
      assert.deepEqual(metrics.unexpected, []); assert.equal(metrics.activeViewClickListeners, 1); assert.equal(settled.saves.length, enabled ? 1 : 0);
      if (enabled) { assert.equal(settled.saves[0].time - start, 2000); assert.equal(settled.editor.dirty, false); }
      traces.push({ pending: { ...pending, saves: pending.saves.map(e => ({ ...e, time: e.time - start })) }, settled: { ...settled, saves: settled.saves.map(e => ({ ...e, time: e.time - start })) }, actions: metrics.actions });
      await timed.evaluate(() => window.editingHarness.cleanup()); assert.equal((await timed.evaluate(() => window.editingHarness.metrics())).activeViewClickListeners, 0); await timed.close();
    }
    assert.deepEqual(traces[1], traces[0]); comparisons[enabled ? 'enabled' : 'disabled'] = traces;
  }
  observations.autosaveComparisons = comparisons;
  checks.push('Matched disabled/enabled browser traces include actual nav/tab/park/remount controls, source/file/range/checksum/history/pending/callback traces; zero disabled saves and one normal enabled save at exactly 2000ms');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert(serverRequests.every(r => r.method === 'GET' && ['/', '/harness.js', '/regression', '/regression.js'].includes(r.url) && r.cookie === null && r.authorization === null));
  await writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, checks, observations, serverRequests, requests, failures, consoleMessages, errors, navigations, downloads, choosers, limits: 'Production shared view + real admitted editing modules, synthetic callback/session/transport harness. Normal production composition root, authority/polling/default adapters/backend not executed. Local revocation is simulated. No general self-navigation or arbitrary-code sandbox claim.' }, null, 2));
  await writeFile(path.join(out, 'verified-source-hashes.json'), JSON.stringify(sourceHashes, null, 2));
  console.log(`PASS: exact unit entries and ${checks.length} browser checkpoints; ${out}`);
} catch (error) {
  await writeFile(path.join(out, 'browser-failure.json'), JSON.stringify({ error: String(error), checks, observations, serverRequests, requests, failures, consoleMessages, errors, navigations }, null, 2)); throw error;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
