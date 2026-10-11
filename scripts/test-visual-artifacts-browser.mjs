import { createRequire } from 'node:module';
import path from 'node:path';
import { createServer, preview as previewBuild } from 'vite';
import { cp, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer as httpServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
// UI Base already supplies Playwright for the canonical card's browser tests.
let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); }
catch { playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright'); }
const temporary = await mkdtemp(path.join(tmpdir(), 'visual-browser-'));
const apps = path.join(temporary, 'apps'); await mkdir(apps);
await cp('references/visual-artifacts', path.join(apps, 'visual-artifacts'), { recursive: true });
const probe = httpServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const apiPort = probe.address().port; await new Promise(resolve => probe.close(resolve));
const api = spawn(process.execPath, ['dist-server/server/index.js'], { env: { ...process.env, UI_APPS_DIR: apps, UI_RUNTIME_DIR: path.join(temporary, 'runtime'), UI_PLATFORM_API_PORT: String(apiPort), UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '0', NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverOutput = ''; api.stdout.on('data', value => { serverOutput += value; }); api.stderr.on('data', value => { serverOutput += value; });
const server = await createServer({ configFile: 'vite.config.ts', server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } } } });
let browser, production;
try {
  await server.listen();
  for (let attempt = 0; attempt < 100; attempt++) {
    if (api.exitCode !== null) throw new Error(serverOutput);
    if (await fetch(`http://127.0.0.1:${apiPort}/api/health`).then(response => response.ok).catch(() => false)) break;
    if (attempt === 99) throw new Error('API startup timed out');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  browser = await playwright.chromium.launch({ headless: true, channel: process.env.UI_VISUAL_TEST_BROWSER ?? 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', error => process.stderr.write(`${error}\n`));
  await page.goto(`${server.resolvedUrls.local[0]}tests/browser/visual-artifacts.html`);
  await page.waitForFunction(() => document.body.dataset.result, { timeout: 30000 });
  const results = await page.locator('#results').innerText(); console.log(results);
  if (await page.locator('body').getAttribute('data-result') !== 'passed') throw new Error('Browser runtime/editor checks failed.');
  await page.goto(`${server.resolvedUrls.local[0]}tests/browser/visual-preview-live.html`);
  await page.waitForFunction(() => document.body.dataset.ready);
  await page.getByLabel('Visual Artifact', { exact: true }).selectOption('page:customers/page.visual.json');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Visual Artifact runtime preview"]');
  await frame.getByRole('heading', { name: 'Visual Artifact reference' }).waitFor();
  await frame.getByRole('button', { name: 'Show customer details' }).first().click();
  await frame.getByText('Selected customer: acme').waitFor();
  console.log('PASS: live editor preview loads source, custom modules and real installed Package Components through the real API');
  production = await previewBuild({ configFile: 'references/visual-artifacts/vite.config.ts', preview: { host: '127.0.0.1', port: 0 } });
  await page.goto(`${production.resolvedUrls.local[0]}customers`);
  await page.getByRole('heading', { name: 'Visual Artifact reference' }).waitFor();
  await page.getByRole('button', { name: 'Show customer details' }).first().click();
  await page.waitForFunction(() => {
    const root = document.querySelector('uip-page-art-customer-page-reference')?.querySelector('[data-uip-artifact]')?.shadowRoot;
    return root?.querySelector('[data-uip-node="selected-label"]')?.textContent === 'acme';
  });
  await page.setViewportSize({ width: 1200, height: 900 });
  const columns = () => page.evaluate(() => getComputedStyle(document.querySelector('uip-page-art-customer-page-reference').querySelector('[data-uip-artifact]').shadowRoot.querySelector('[data-uip-node="page-grid"]')).gridTemplateColumns.split(' ').length);
  if (await columns() !== 2) throw new Error('Desktop layout should have two columns.');
  await page.setViewportSize({ width: 480, height: 900 });
  if (await columns() !== 1) throw new Error('Mobile layout should have one column.');
  console.log('PASS: built application /customers route uses the same renderer, actual events, and responsive layout');
} finally {
  await browser?.close(); await server.close(); await new Promise(resolve => production ? production.httpServer.close(resolve) : resolve());
  if (api.exitCode === null) { const stopped = once(api, 'exit'); api.kill(); await stopped; }
  await rm(temporary, { recursive: true, force: true });
}
