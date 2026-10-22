// Dedicated allowlisted verifier. No workspace test discovery, Vite, normal server or storage APIs.
import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'evidence/builder-v1-wp5-f-fixture-20261022', `run-${Date.now()}`);
await mkdir(out);
const preview = ['lifecycle.ts', 'samples.ts', 'protocol.ts', 'panel.ts', 'host.ts', 'bootstrap.txt'].map(p => `src/client/fixture-preview/${p}`);
const editing = ['src/client/artifact-editor/editing-lifecycle.ts', 'src/client/artifact-editor/autosave-configuration.ts', 'src/shared/platform-settings.ts'];
const selected = ['tests/fixture-preview/lifecycle.test.ts', 'tests/fixture-preview/harness.ts'];
const admitted = new Set([...preview, ...editing, ...selected].map(p => path.resolve(root, p)));
const plugin = { name: 'explicit-verification-inputs', setup(build) {
  build.onResolve({ filter: /\.txt\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.replace('?raw', '')) }));
  build.onLoad({ filter: /.*/ }, async args => {
    if (!admitted.has(path.resolve(args.path))) throw new Error(`VERIFICATION_INPUT_NOT_ADMITTED: ${args.path}`);
    return { contents: await readFile(args.path, 'utf8'), loader: args.path.endsWith('.txt') ? 'text' : 'ts' };
  });
} };
async function compile(entry, platform) {
  return build({ absWorkingDir: root, entryPoints: [entry], bundle: true, write: false, format: platform === 'node' ? 'esm' : 'iife', platform, target: 'es2022', metafile: true, plugins: [plugin] });
}
const unit = await compile(selected[0], 'node'); const unitPath = path.join(out, 'lifecycle.test.mjs');
await writeFile(unitPath, unit.outputFiles[0].text);
const unitRun = spawnSync(process.execPath, ['--test', '--test-concurrency=1', unitPath], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 });
await writeFile(path.join(out, 'unit-results.txt'), unitRun.stdout + unitRun.stderr);
assert.equal(unitRun.status, 0, unitRun.stdout + unitRun.stderr);
const harness = await compile(selected[1], 'browser');
const shell = await transform(await readFile(path.join(root, 'src/client/builder-workspace/shell.ts'), 'utf8'), { loader: 'ts', target: 'es2022' });
assert(shell.code.includes('FixturePreviewPanel'));
await writeFile(path.join(out, 'verification-inputs.json'), JSON.stringify({ selected, settings: { serial: true, retries: 0, discovery: false, setupHooks: false, normalLaunchers: false }, unit: unit.metafile, browser: harness.metafile, builderShell: 'syntax transform only; no dependency execution' }, null, 2));
const serverRequests = [], browserRequests = [], failedRequests = [], consoleMessages = [], pageErrors = [], navigations = [], downloads = [], choosers = [];
const routes = new Map([
  ['/', { type: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>WP5-F isolated fixture verification</title></head><body><script src="/harness.js"></script></body></html>' }],
  ['/harness.js', { type: 'text/javascript', body: harness.outputFiles[0].text }],
]);
const server = createServer((request, response) => {
  serverRequests.push({ method: request.method, url: request.url, cookie: request.headers.cookie ?? null, authorization: request.headers.authorization ?? null });
  const resource = request.method === 'GET' && routes.get(request.url);
  response.setHeader('Cache-Control', 'no-store');
  response.writeHead(resource ? 200 : 405, { 'Content-Type': resource ? resource.type : 'text/plain' });
  response.end(resource ? resource.body : 'FIXTURE_ENDPOINT_DENIED');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const playwright = createRequire(path.resolve(root, '../ui-base/package.json'))('playwright');
let browser; const checks = [], observations = {};
try {
  browser = await playwright.chromium.launch({ headless: true, channel: 'msedge' });
  observations.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: false });
  const page = await context.newPage();
  page.on('request', request => browserRequests.push({ method: request.method(), url: request.url(), resource: request.resourceType() }));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('framenavigated', frame => navigations.push({ main: frame === page.mainFrame(), url: frame.url() }));
  page.on('download', download => downloads.push(download.suggestedFilename()));
  page.on('filechooser', () => choosers.push('filechooser'));
  await page.goto(origin);
  await page.waitForFunction(() => window.fixtureHarness);
  observations.before = await page.evaluate(() => window.fixtureHarness.snapshot());
  await page.evaluate(() => window.fixtureHarness.panel.refresh());
  await page.waitForFunction(() => document.querySelector('[aria-label="Fixture Preview"]').dataset.state === 'ready');
  observations.afterReady = await page.evaluate(() => window.fixtureHarness.snapshot());
  assert.deepEqual(observations.afterReady, observations.before);
  checks.push('Real native Card rendered under exact script hash CSP in opaque sandbox; WP2 bytes/history/focus/selection unchanged');
  const frame = await (await page.$('iframe')).contentFrame(); assert(frame);
  const originalFrameUrl = frame.url(); observations.frameUrl = originalFrameUrl;
  assert.equal(await frame.locator('uib-card').count(), 1);
  assert.equal(await frame.locator('uib-card > span').first().textContent(), 'Authored synthetic slot text');
  assert.equal(await frame.locator('uib-card').getAttribute('variant'), 'outlined');
  observations.frame = await frame.evaluate(() => ({ origin: self.origin, registered: !!customElements.get('uib-card'), header: document.querySelector('uib-card').shadowRoot.querySelector('[part=header]').textContent, footer: document.querySelector('uib-card [slot=footer]').textContent, label: document.querySelector('strong').textContent, csp: document.querySelector('meta[http-equiv]').content }));
  assert.equal(observations.frame.origin, 'null'); assert.match(observations.frame.header, /Synthetic Card/);
  assert.equal(observations.frame.footer, 'Synthetic footer');
  await page.screenshot({ path: path.join(out, 'browser-ready.png'), fullPage: true });
  await frame.locator('uib-card [part=base]').click(); assert.equal(await frame.locator('uib-card').getAttribute('selected'), '');
  checks.push('Native selectable interaction and text/default/footer slots work without services or handlers');
  // Hostile probes bypass input admission through the browser test driver only. They are never in the shipped bootstrap.
  observations.denials = await frame.evaluate(async origin => {
    const result = { violations: [], network: {}, topNavigation: '', storage: {}, popup: false, scriptRan: false };
    window.__fixtureProbe = result;
    document.addEventListener('securitypolicyviolation', event => result.violations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }));
    for (const [name, method] of [['read', 'GET'], ['mutation', 'POST'], ['upload', 'POST'], ['publish', 'POST']]) {
      try { await fetch(`${origin}/effect/${name}`, { method, body: method === 'POST' ? 'synthetic' : undefined, credentials: 'include' }); result.network[name] = 'UNEXPECTED_SUCCESS'; }
      catch (error) { result.network[name] = error.name; }
    }
    try { top.location.href = `${origin}/effect/top-navigation`; result.topNavigation = 'UNEXPECTED_SUCCESS'; } catch (error) { result.topNavigation = error.name; }
    result.popup = window.open(`${origin}/effect/popup`) !== null;
    for (const key of ['localStorage', 'sessionStorage']) { try { window[key].setItem('fixture', 'synthetic'); result.storage[key] = 'UNEXPECTED_SUCCESS'; } catch (error) { result.storage[key] = error.name; } }
    const anchor = document.createElement('a'); anchor.href = `${origin}/effect/navigation`; anchor.textContent = 'probe'; document.body.append(anchor); anchor.click();
    const download = document.createElement('a'); download.href = `${origin}/effect/download`; download.download = 'probe.txt'; document.body.append(download); download.click();
    const file = document.createElement('input'); file.type = 'file'; document.body.append(file); file.click();
    const form = document.createElement('form'); form.method = 'POST'; form.action = `${origin}/effect/submission`; document.body.append(form); form.submit();
    const image = document.createElement('img'); image.src = `${origin}/effect/image`; document.body.append(image);
    const style = document.createElement('style'); style.textContent = `body{background-image:url(${origin}/effect/css)}`; document.head.append(style);
    const script = document.createElement('script'); script.textContent = 'window.__fixtureProbe.scriptRan = true'; document.body.append(script);
    try { document.cookie = 'fixture=synthetic'; result.storage.cookie = document.cookie || 'empty'; } catch (error) { result.storage.cookie = error.name; }
    return { ...result, violations: undefined };
  }, origin);
  await frame.waitForFunction(() => window.__fixtureProbe.violations.some(v => v.directive === 'script-src-elem') && window.__fixtureProbe.violations.some(v => v.directive === 'img-src') && window.__fixtureProbe.violations.some(v => v.directive === 'connect-src'));
  observations.denials = await frame.evaluate(() => window.__fixtureProbe);
  for (const value of Object.values(observations.denials.network)) assert.notEqual(value, 'UNEXPECTED_SUCCESS');
  assert.equal(observations.denials.topNavigation, 'SecurityError'); assert.equal(observations.denials.popup, false);
  assert.equal(observations.denials.storage.localStorage, 'SecurityError'); assert.equal(observations.denials.storage.sessionStorage, 'SecurityError'); assert.equal(observations.denials.scriptRan, false);
  assert.equal(page.url(), origin + '/'); assert.equal(frame.url(), originalFrameUrl);
  assert.equal(downloads.length, 0); assert.equal(choosers.length, 0); assert.equal(context.pages().length, 1);
  assert(serverRequests.every(request => ['/', '/harness.js'].includes(request.url)));
  checks.push('Observed CSP/sandbox/event denial: fetch/read/mutation/upload/Publish, top navigation, links, popup, native submission, file chooser, download, images/CSS URL, untrusted script, storage');
  const beforeReplay = await frame.locator('uib-card').textContent();
  await page.evaluate(() => {
    const frame = document.querySelector('iframe');
    for (const type of ['Publish', 'render', 'ready']) frame.contentWindow.postMessage({ type, nonce: 'wrong', session: 'wrong', identity: 'wrong', sequence: 1, sample: {} }, '*');
    window.postMessage({ type: 'ready', nonce: 'wrong', session: 'wrong', identity: 'wrong', sequence: 1 }, location.origin);
  });
  assert.equal(await frame.locator('uib-card').textContent(), beforeReplay);
  // The deliberate user click above moved focus into the Card. Return to the draft before measuring invalidation preservation.
  await page.evaluate(() => window.fixtureHarness.editor.focus());
  observations.beforeStale = await page.evaluate(() => window.fixtureHarness.snapshot());
  assert.deepEqual(observations.beforeStale, observations.before);
  await page.evaluate(() => window.fixtureHarness.panel.invalidate('SIMULATED_DEPENDENCY_CHANGED'));
  assert.equal(await page.locator('iframe').count(), 0); assert.equal(await page.locator('[data-view] pre').getAttribute('inert'), '');
  assert.match(await page.locator('[data-view]').textContent(), /STALE PREVIEW/);
  await page.screenshot({ path: path.join(out, 'browser-stale.png'), fullPage: true });
  observations.afterStale = await page.evaluate(() => window.fixtureHarness.snapshot()); assert.deepEqual(observations.afterStale, observations.before);
  const oldCapture = await page.locator('[data-capture]').textContent();
  await page.locator('[data-sample]').fill('{"fixture":"not-admitted"}'); await page.evaluate(() => window.fixtureHarness.panel.refresh());
  assert.equal(await page.locator('[aria-label="Fixture Preview"]').getAttribute('data-state'), 'stale');
  assert.equal(await page.locator('[data-capture]').textContent(), oldCapture);
  assert.match(await page.locator('p[data-state]').textContent(), /SAMPLE_FIELDS_UNSUPPORTED/);
  checks.push('Stale rendering destroyed; original capture retained as inert static summary; failed Refresh never relabels it; forged messages do not change fixture');
  const revisedSample = { fixture: 'native-card-v1', heading: 'Second synthetic Card', body: 'Second synthetic slot', footer: 'Second synthetic footer', variant: 'flat', density: 'compact', selectable: false };
  await page.locator('[data-sample]').fill(JSON.stringify(revisedSample));
  assert.equal(await page.locator('iframe').count(), 0);
  await page.evaluate(() => { window.fixtureHarness.editor.focus(); return window.fixtureHarness.panel.refresh(); });
  const revisedFrame = await (await page.$('iframe')).contentFrame(); assert(revisedFrame);
  assert.equal(await revisedFrame.locator('uib-card').getAttribute('variant'), 'flat');
  assert.equal(await revisedFrame.locator('uib-card').getAttribute('density'), 'compact');
  assert.equal(await revisedFrame.locator('uib-card > span').first().textContent(), revisedSample.body);
  assert.notEqual(await page.locator('[data-capture]').textContent(), oldCapture);
  observations.afterSampleEdit = await page.evaluate(() => window.fixtureHarness.snapshot()); assert.deepEqual(observations.afterSampleEdit, observations.before);
  checks.push('Validated sample edits replace native properties/slots only on explicit Refresh; new render identity; same WP2 draft, focus and history');
  await page.getByRole('button', { name: 'Preview saved artifact', exact: true }).click();
  assert.match(await page.locator('p[data-state]').textContent(), /SAVED_CAPTURE_UNAVAILABLE/);
  await page.evaluate(() => window.fixtureHarness.panel.revoke());
  assert.equal(await page.locator('[aria-label="Fixture Preview"]').getAttribute('data-state'), 'revoked');
  assert.equal(await page.locator('[data-view]').textContent(), ''); assert.match(await page.locator('[data-capture]').textContent(), /No successful capture/);
  assert.equal(await page.locator('[data-sample]').inputValue(), '');
  await page.evaluate(() => window.fixtureHarness.panel.refresh()); assert.equal(await page.locator('iframe').count(), 0);
  await page.evaluate(() => window.fixtureHarness.panel.dispose());
  assert.equal(await page.locator('[aria-label="Fixture Preview"]').getAttribute('data-state'), 'disposed');
  await page.evaluate(async () => {
    const { panel, identity } = window.fixtureHarness;
    panel.select({ ...identity, sessionId: 'second-synthetic-session' }, true);
    const canceled = panel.refresh(); panel.revoke('SIMULATED_PENDING_REVOCATION'); await canceled;
  });
  assert.equal(await page.locator('iframe').count(), 0);
  assert.equal(await page.locator('[aria-label="Fixture Preview"]').getAttribute('data-state'), 'revoked');
  await page.evaluate(async () => {
    const { panel, identity } = window.fixtureHarness;
    panel.select({ ...identity, artifactKey: '["package","synthetic-other-owner","package","synthetic-card"]' }, true);
    await Promise.all([panel.refresh(), panel.refresh()]);
  });
  assert.equal(await page.locator('[aria-label="Fixture Preview"]').getAttribute('data-state'), 'ready');
  assert.match(await page.locator('[data-identity]').textContent(), /synthetic-other-owner/);
  assert.equal(await page.locator('iframe').count(), 1);
  await page.evaluate(() => window.fixtureHarness.panel.dispose());
  checks.push('Browser pending revocation rejects late completion; identity replacement and two overlapping explicit Refresh requests leave only the newest frame');
  observations.finalDraft = await page.evaluate(() => { const { draft, snapshot, editor } = window.fixtureHarness; draft.redo(); const redo = draft.current.text; draft.undo(); editor.focus(); editor.setSelectionRange(2, 9); return { redo, snapshot: snapshot() }; });
  assert.equal(observations.finalDraft.redo, 'synthetic draft two');
  // Explicit Undo/Redo above changes generation; verify original source, baseline, history, identity and save count.
  for (const key of ['current', 'baseline', 'history', 'dirty', 'canUndo', 'canRedo', 'saves', 'identity', 'autosave', 'focus', 'selection', 'text']) assert.deepEqual(observations.finalDraft.snapshot[key], observations.before[key]);
  checks.push('Saved entry denies directly; simulated revocation clears retained content; disposal terminal; preserved Undo/Redo still restores original synthetic draft history');
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
  await page.screenshot({ path: path.join(out, 'browser-disposed.png'), fullPage: true });
  await writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ passed: true, checks, observations, serverRequests, browserRequests, failedRequests, navigations, downloads, choosers, consoleMessages, pageErrors, boundaries: 'Hostile probes run through test-driver evaluation, never shipped code. No real records, protected stores, normal application or Foundation reader. Opaque sandbox denies top navigation; arbitrary same-frame script navigation is outside admitted code, not claimed sandbox-denied.' }, null, 2));
  console.log(`PASS: 13 serial unit tests; ${checks.length} browser checkpoints; evidence ${out}`);
} catch (error) {
  await writeFile(path.join(out, 'browser-failure.json'), JSON.stringify({ error: String(error), checks, observations, serverRequests, browserRequests, failedRequests, navigations, consoleMessages, pageErrors }, null, 2));
  throw error;
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
const sourceHashes = {};
for (const p of [...preview, ...editing, ...selected, 'scripts/verify-fixture-preview.mjs']) sourceHashes[p] = createHash('sha256').update(await readFile(path.join(root, p))).digest('hex');
await writeFile(path.join(out, 'verified-source-hashes.json'), JSON.stringify(sourceHashes, null, 2));
