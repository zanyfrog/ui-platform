import { afterEach, beforeAll, expect, it } from 'vitest';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import viteConfig from '../vite.config.js';

const cleanups: (() => Promise<unknown>)[] = [];
beforeAll(async () => { await promisify(execFile)(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.server.json']); }, 30000);
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function start(environment: string, enabled: boolean, emitted = false, uiPort?: number) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'editor-http-'));
  cleanups.push(() => rm(root, { force: true, recursive: true }));
  const temporary = http.createServer(); await new Promise<void>(resolve => temporary.listen(0, '127.0.0.1', resolve));
  const port = (temporary.address() as { port: number }).port; await new Promise<void>(resolve => temporary.close(() => resolve()));
  const apps = path.join(root, 'apps'), bundle = path.join(apps, 'alpha', 'form');
  await mkdir(bundle, { recursive: true });
  await mkdir(path.join(apps, 'alpha', 'src', 'pages'), { recursive: true });
  await writeFile(path.join(apps, 'alpha', 'src', 'pages', 'Home.ts'), 'export const title = "Home";\n');
  await writeFile(path.join(bundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1, artifactId: 'test-form', artifactType: 'form', name: 'Test form', files: { definition: 'form.json' } }));
  await writeFile(path.join(bundle, 'form.json'), '{"fields":[]}');
  const settings = path.join(root, 'editor.json'); await writeFile(settings, JSON.stringify({ applications: ['alpha'] }));
  let output = '';
  const child: ChildProcess = spawn(process.execPath, emitted ? ['dist-server/server/index.js'] : ['--import', 'tsx', 'src/server/index.ts'], { cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, NODE_ENV: environment, UI_PLATFORM_EDITOR: enabled ? '1' : '0', UI_PLATFORM_EDITOR_CONFIG: settings,
      UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(uiPort ?? port), UI_APPS_DIR: apps, UI_RUNTIME_DIR: path.join(root, 'runtime'), UI_TEMPLATES_DIR: path.join(root, 'templates') },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', bytes => { output += String(bytes); }); child.stderr!.on('data', bytes => { output += String(bytes); });
  cleanups.push(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    if (await fetch(origin + '/api/health').then(response => response.ok).catch(() => false)) return { origin, output: () => output };
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Server startup timed out: ' + output);
}

it('preserves same-origin session authorization through the configured Vite proxy', async () => {
  const temporary = http.createServer(); await new Promise<void>(resolve => temporary.listen(0, '127.0.0.1', resolve));
  const uiPort = (temporary.address() as { port: number }).port; await new Promise<void>(resolve => temporary.close(() => resolve()));
  const { origin } = await start('development', true, false, uiPort);
  const config = viteConfig as { server: { proxy: Record<string, object> } };
  const vite = await createViteServer({ configFile: false, server: { host: '127.0.0.1', port: uiPort, strictPort: true, hmr: false,
    proxy: { '/api': { ...config.server.proxy['/api'], target: origin } } } });
  await vite.listen(); cleanups.push(() => vite.close());
  const front = `http://127.0.0.1:${uiPort}`;
  const response = await fetch(front + '/api/editor/session');
  const session = await response.json(), cookie = response.headers.get('set-cookie')!.split(';')[0];
  const headers = { cookie, origin: front, 'content-type': 'application/json', 'x-editor-revision': session.revision, 'x-editor-csrf': session.csrfToken };
  const selected = await fetch(front + '/api/editor/session', { method: 'POST', headers, body: JSON.stringify({ fixtureId: 'dev-editor' }) });
  expect(selected.status).toBe(200); headers['x-editor-revision'] = (await selected.json()).revision;
  expect((await fetch(front + '/api/apps/alpha/artifacts', { headers })).status).toBe(200);
  expect((await fetch(front + '/api/apps', { headers })).status).toBe(403);
}, 20000);

it('routes the real server through authorization, accepts a configured fixture, and scopes application access', async () => {
  const { origin } = await start('development', true);
  expect((await fetch(origin + '/api/apps/alpha/artifacts')).status).toBe(401);
  const response = await fetch(origin + '/api/editor/session');
  const initial = await response.json(), cookie = response.headers.get('set-cookie')!.split(';')[0];
  const headers = { cookie, origin, 'content-type': 'application/json', 'x-editor-revision': initial.revision, 'x-editor-csrf': initial.csrfToken };
  const selected = await fetch(origin + '/api/editor/session', { method: 'POST', headers, body: JSON.stringify({ fixtureId: 'dev-editor' }) });
  expect(selected.status).toBe(200); headers['x-editor-revision'] = (await selected.json()).revision;
  const discovery = await fetch(origin + '/api/apps/alpha/artifacts', { headers });
  expect(discovery.status).toBe(200); expect((await discovery.json())[0].artifactId).toBe('test-form');
  expect((await fetch(origin + '/api/apps/beta/artifacts', { headers })).status).toBe(403);
}, 15000);

it('disables editor routes in the production server composition', async () => {
  const { origin } = await start('production', false, true);
  for (const endpoint of ['/api/editor/session', '/api/events', '/api/apps/alpha/artifacts', '/api/apps/alpha/artifacts/token/validation', '/api/apps/alpha/artifacts/token/references']) expect((await fetch(origin + endpoint)).status).toBe(404);
  expect((await fetch(origin + '/api/apps/alpha/artifacts/token', { method: 'PUT', body: '{}' })).status).toBe(404);
  for (const endpoint of ['/api/health', '/api/apps', '/api/templates', '/api/components']) expect((await fetch(origin + endpoint)).status).toBe(200);
  const page = await fetch(origin + '/api/apps/alpha/page?source=src%2Fpages%2FHome.ts');
  expect(page.status).toBe(200); expect(JSON.stringify(await page.json())).toContain('export const title');
}, 15000);

it('refuses fixture enablement in the emitted server even if NODE_ENV is development', async () => {
  await expect(start('development', true, true)).rejects.toThrow('development source server');
}, 15000);
