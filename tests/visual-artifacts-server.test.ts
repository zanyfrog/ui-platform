import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

it('real API discovers installed card, creates/reopens a Page, rejects stale writes, compiles functions and bundles its real runtime module', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'visual-api-'));
  const apps = path.join(root, 'apps'), app = path.join(apps, 'reference');
  await mkdir(path.join(app, 'src', 'pages'), { recursive: true });
  for (const [file, value] of Object.entries({ 'package.json': {}, 'tsconfig.json': {}, 'app-services.json': {}, 'app.settings.json': { application: { name: 'Reference', status: 'active' } }, 'app.manifest.json': { manifestVersion: '1.0.0', appId: 'test-reference', template: 'test', templateVersion: '1', packages: {}, foundationImports: {} } })) await writeFile(path.join(app, file), JSON.stringify(value));
  await writeFile(path.join(app, 'src', 'main.ts'), 'export {};');
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = (probe.address() as { port: number }).port; await new Promise<void>(resolve => probe.close(() => resolve()));
  let output = '';
  const child = spawn(process.execPath, ['dist-server/server/index.js'], { cwd: process.cwd(), env: { ...process.env, UI_APPS_DIR: apps, UI_RUNTIME_DIR: path.join(root, 'runtime'), UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '0', NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', value => { output += value; }); child.stderr.on('data', value => { output += value; });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(output);
      if (await fetch(origin + '/api/health').then(r => r.ok).catch(() => false)) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(ready, output).toBe(true);
    const workspace = await fetch(origin + '/api/apps/reference/visual-artifacts').then(r => r.json());
    const card = workspace.packages.find((p: { tagName: string }) => p.tagName === 'uib-card');
    expect(card.id).toBe('cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1'); expect(card.definition.builder.settings.heading).toBeTruthy();
    const created = await fetch(origin + '/api/apps/reference/visual-pages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'test-page' }) }).then(r => r.json());
    expect(created.metadata.route).toBe('/test-page');
    const endpoint = origin + '/api/apps/reference/visual-pages?locator=' + encodeURIComponent(created.locator);
    const saved = await fetch(endpoint, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'code', content: 'export function value(): number { return 7; }', expectedHash: created.hash }) }).then(r => r.json());
    expect(saved.hash).not.toBe(created.hash);
    const stale = await fetch(endpoint, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'source', content: '<p>stale</p>', expectedHash: created.hash }) }); expect(stale.ok).toBe(false);
    expect((await fetch(endpoint + '&code=1')).status).toBe(409);
    expect((await fetch(endpoint + '&code=1&hash=' + encodeURIComponent(created.hash))).status).toBe(409);
    const code = await fetch(endpoint + '&code=1&hash=' + encodeURIComponent(saved.hash)).then(r => r.text()); expect(code).toContain('return 7'); expect(code).not.toContain(': number');
    const module = await fetch(origin + card.moduleUrl); expect(module.ok).toBe(true); expect(await module.text()).toContain('uib-card');
    const tree = await fetch(origin + '/api/apps/reference/pages').then(r => r.json()); expect(tree.pages).toHaveLength(1); expect(tree.pages[0].route).toBe('/test-page');
  } finally {
    if (child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; }
    await rm(root, { recursive: true, force: true });
  }
}, 20000);
