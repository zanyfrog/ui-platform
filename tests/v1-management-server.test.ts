import { afterEach, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createServer as createViteServer } from 'vite';
import { V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY, developmentUsers } from '../src/server/v1-development-policy.js';
import { V1_AUTHORITY_ID } from '../src/server/v1-development-policy.js';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { SecurityDefinitionService, SecurityDefinitionStore, type SecurityDocument, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { createSecuredDevelopmentHost, type SecuredDevelopmentHostConfig } from '@ui-platform/dataset-operations';
import { AppliedResourceRegistry, QualifiedAppliedResolver } from '../../UI Platform Data Services/packages/schema-application/src/index.js';
import { fixture, applied, generation, registration } from '../../UI Platform Data Services/packages/schema-application/tests/r1-fixtures.js';
import { CanonicalSchemaReader } from '../../UI Platform Data Services/packages/schema-application/src/index.js';
import { createHash, randomUUID } from 'node:crypto';
import { withRoleBundleGraph } from '@ui-platform/artifacts/storage';
import { ApplicationDataClient, createSessionApplicationDataTransport } from '@uib/platform-core/application-data';
import { bindDatasetForm } from '@uib/platform-core/dataset-form';

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

async function start(prepare?: (root: string) => Promise<{ datasetUrl: string; key: string } | undefined>, preload?: string) {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-v1-server-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const apps = path.join(root, 'apps'), app = path.join(apps, V1_FIXTURE_APPLICATION_KEY);
  await mkdir(path.join(app, 'src', 'pages'), { recursive: true });
  await writeFile(path.join(app, 'src', 'pages', 'Home.ts'), 'export const title = "Home";\n');
  await writeFile(path.join(app, 'src', 'main.ts'), 'export {};\n');
  await writeFile(path.join(app, 'app.manifest.json'), JSON.stringify({ manifestVersion: '1.0.0', appId: V1_FIXTURE_APPLICATION_ID,
    template: 'v1-test', templateVersion: '1.0.0', packages: {}, foundationImports: {} }));
  await writeFile(path.join(app, '.v1-development-fixture.json'), JSON.stringify({ applicationId: V1_FIXTURE_APPLICATION_ID }));
  await writeFile(path.join(app, 'app.settings.json'), JSON.stringify({ application: { name: 'V1 Identity Fixture', status: 'active' } }));
  await writeFile(path.join(app, 'app-services.json'), '{}');
  await writeFile(path.join(app, 'package.json'), '{}');
  await writeFile(path.join(app, 'tsconfig.json'), '{}');
  for (const [bundle, type, file] of [['form-bundle', 'form', 'form.json'], ['workflow-bundle', 'workflow', 'workflow.json']] as const) {
    await mkdir(path.join(app, bundle), { recursive: true });
    await writeFile(path.join(app, bundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1,
      artifactId: `v1-${type}`, artifactType: type, name: `V1 ${type}`, files: { definition: file } }));
    await writeFile(path.join(app, bundle, file), '{}');
  }
  const dataset = await prepare?.(root);
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  let output = '';
  const hook = path.join(root, 'witness.mjs');
  if (preload) await writeFile(hook, preload);
  const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', ...(preload ? ['--import', pathToFileURL(hook).href] : []), 'src/server/index.ts'], { cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1',
      UI_PLATFORM_V1_POLICY_STORE: path.join(root, 'policy.sqlite'), UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(port),
      ...(dataset ? { UI_PLATFORM_WP5_APPLICATION_DATA: '1', UI_PLATFORM_WP5_DATASET_HOST_URL: dataset.datasetUrl,
        UI_PLATFORM_V1_TRUSTED_UI_KEY: dataset.key } : {}),
      UI_APPS_DIR: apps, UI_RUNTIME_DIR: path.join(root, 'runtime'), UI_TEMPLATES_DIR: path.join(root, 'templates') },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', bytes => { output += String(bytes); }); child.stderr!.on('data', bytes => { output += String(bytes); });
  cleanups.push(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    if (await fetch(origin + '/api/health').then(response => response.ok).catch(() => false)) return origin;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`V1 server did not start: ${output}`);
}

it('authorizes actual Management recovery HTTP and refuses stale receipts and foreign targets', async () => {
  let source = '', journal = '', owner = '';
  const origin = await start(async root => {
    const app = path.join(root, 'apps', V1_FIXTURE_APPLICATION_KEY), bundle = path.join(app, 'form-bundle');
    owner = path.join(app, 'app.manifest.json');
    source = path.join(bundle, 'form.json');
    await writeFile(source, '{"interrupted":true}');
    const transaction = path.join(app, '.uib', 'transactions', createHash('sha256').update(bundle).digest('hex'));
    await mkdir(transaction, { recursive: true });
    journal = path.join(transaction, 'pending.json');
    await writeFile(journal, JSON.stringify({ original: {
      'artifact.json': await readFile(path.join(bundle, 'artifact.json'), 'utf8'), 'form.json': '{}',
    } }));
    return undefined;
  });
  const url = origin + '/api/apps/' + V1_FIXTURE_APPLICATION_KEY + '/source-recovery';
  const headersFor = async (email: string) => {
    const session = await fetch(origin + '/api/development-identity/session');
    const cookie = session.headers.get('set-cookie')!.split(';')[0];
    const { csrfToken } = await session.json();
    const headers = { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': csrfToken };
    expect((await fetch(origin + '/api/development-identity/session', {
      method: 'POST', headers, body: JSON.stringify({ email }),
    })).status).toBe(200);
    return headers;
  };
  const before = await Promise.all([readFile(source), readFile(journal)]);
  expect((await fetch(url)).status).toBe(401);
  const editor = await headersFor(developmentUsers[2].email);
  expect((await fetch(url, { headers: editor })).status).toBe(403);
  expect((await fetch(url, { method: 'POST', headers: editor, body: '{}' })).status).toBe(403);
  const admin = await headersFor(developmentUsers[0].email);
  const discovery = await fetch(url, { headers: admin });
  expect(discovery.status).toBe(200);
  const [receipt] = await discovery.json();
  const post = (value: unknown, headers = admin) => fetch(url, { method: 'POST', headers, body: JSON.stringify(value) });
  expect((await post({})).status).toBe(422);
  expect((await post(receipt, { ...admin, origin: 'http://invalid.example' })).status).toBe(403);
  expect((await fetch(url, { method: 'PUT', headers: admin, body: '{}' })).status).toBe(403);
  expect((await post({ ...receipt, targetId: '0'.repeat(64) })).status).toBe(409);
  expect((await post({ ...receipt, sourceRevision: '0'.repeat(64) })).status).toBe(409);
  expect((await post({ ...receipt, journalSha256: '0'.repeat(64) })).status).toBe(409);
  await writeFile(journal, '{malformed');
  const malformed = await readFile(journal);
  expect((await post(receipt)).status).toBe(409);
  expect(await readFile(journal)).toEqual(malformed);
  expect(await readFile(source)).toEqual(before[0]);
  await writeFile(journal, before[1]);
  const anchor = path.join(path.dirname(source), 'artifact.json');
  const manifest = await readFile(anchor);
  await writeFile(anchor, JSON.stringify({ ...JSON.parse(manifest.toString()), files: { definition: 'changed.json' } }));
  const modified = await readFile(anchor);
  expect((await post(receipt)).status).toBe(409);
  expect(await readFile(anchor)).toEqual(modified);
  expect(await Promise.all([readFile(source), readFile(journal)])).toEqual(before);
  await rm(anchor);
  expect((await post(receipt)).status).toBe(409);
  expect(await Promise.all([readFile(source), readFile(journal)])).toEqual(before);
  await writeFile(anchor, manifest);
  const originalOwner = await readFile(owner);
  await writeFile(owner, JSON.stringify({ ...JSON.parse(originalOwner.toString()), appId: 'replacement-owner' }));
  expect((await post(receipt)).status).toBe(403);
  await writeFile(owner, originalOwner);
  const app = path.dirname(owner);
  const moved = app + '-physical';
  await rename(app, moved);
  await symlink(moved, app, 'junction');
  try {
    expect((await post(receipt)).ok).toBe(false);
    expect(await Promise.all([readFile(source), readFile(journal), readFile(owner)])).toEqual([...before, originalOwner]);
  } finally {
    await rm(app);
    await rename(moved, app);
  }
  let recoveredRequest!: Promise<Response>;
  await withRoleBundleGraph(path.join(process.cwd(), 'components'), async () => {
    let finished = false;
    recoveredRequest = post(receipt).finally(() => { finished = true; });
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(finished).toBe(false);
    expect(await Promise.all([readFile(source), readFile(journal)])).toEqual(before);
  }, { recovery: 'refuse' });
  const recovered = await recoveredRequest;
  expect(recovered.status).toBe(200);
  expect(await recovered.json()).toMatchObject({ outcome: 'succeeded' });
  expect(await readFile(source, 'utf8')).toBe('{}');
  await expect(readFile(journal)).rejects.toMatchObject({ code: 'ENOENT' });
  expect((await post(receipt)).status).toBe(409);
  const history = (await readFile(path.join(path.dirname(owner), 'history/app-history.jsonl'), 'utf8'))
    .trim().split('\n').map(line => JSON.parse(line));
  expect(history.filter(event => event.action === 'source.recovery').map(event => event.outcome))
    .toEqual(expect.arrayContaining(['refused', 'source-verified', 'succeeded']));
}, 30000);

it('opens the authenticated Artifact Editor through the normal Windows browser UI', async () => {
  let source = '';
  const origin = await start(async root => {
    source = path.join(root, 'apps', V1_FIXTURE_APPLICATION_KEY, 'form-bundle/form.json');
    await writeFile(source, '{"fields":[]}');
    const application = path.dirname(path.dirname(source));
    await writeFile(path.join(application, 'package.json'), JSON.stringify({ scripts: { dev: 'node preview.mjs' } }));
    await writeFile(path.join(application, 'preview.mjs'), `
      import { createServer } from 'node:http';
      import { readFile } from 'node:fs/promises';
      const server = createServer(async (request, response) => {
        const { witness } = JSON.parse(await readFile('form-bundle/form.json', 'utf8'));
        response.writeHead(200, { 'content-type': 'text/plain' }).end(witness ?? 'ready');
        if (request.url.includes('platform-preview=')) server.close();
      });
      server.listen(Number(process.env.UI_PREVIEW_PORT), '127.0.0.1');
      setTimeout(() => server.close(), 20000).unref();
    `);
    await mkdir(path.join(root, 'runtime'), { recursive: true });
    await writeFile(path.join(root, 'runtime/platform.settings.json'), JSON.stringify({
      format: 'ui-platform.settings', version: 1, editor: { autosave: { enabled: false, delayMs: 2000 } },
    }));
    return undefined;
  });
  const vite = await createViteServer({ server: { host: '127.0.0.1', port: 0 } });
  await vite.listen();
  cleanups.push(() => vite.close());
  const ui = vite.resolvedUrls!.local[0];
  const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
  const browser = await playwright.chromium.launch({ channel: 'msedge', headless: false });
  cleanups.push(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(12000);
  await page.route(origin + '/**', async (route: any) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.continue();
    const result = await fetch(new URL(url.pathname + url.search, ui));
    await route.fulfill({ status: result.status, headers: Object.fromEntries(result.headers), body: Buffer.from(await result.arrayBuffer()) });
  });
  await page.goto(origin);
  await page.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[0].email);
  await page.locator(`[data-app="${V1_FIXTURE_APPLICATION_KEY}"]`).first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  await workspace.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name: 'V1 form', exact: true }).click();
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  await editor.getByRole('tab', { name: 'Source', exact: true }).click();
  await editor.getByLabel('Source file', { exact: true }).selectOption('form.json');
  const file = editor.getByLabel('Source for form.json', { exact: true });
  const action = (name: string) => editor.getByRole('button', { name, exact: true });
  const draft = (value: string) => JSON.stringify({ fields: [], witness: value });
  const conflict = async (local: string, disk: string) => {
    await file.fill(draft(local));
    await writeFile(source, draft(disk));
    await editor.getByText('This file has changed outside the editor.', { exact: false }).first().waitFor();
    expect(await file.inputValue()).toBe(draft(local));
    await action('Review changes').click();
    const review = editor.getByLabel('Source comparison');
    await review.waitFor();
    expect(await review.innerText()).toContain(local);
    expect(await review.innerText()).toContain(disk);
  };
  await conflict('draft-one', 'disk-one');
  page.once('dialog', (dialog: any) => dialog.dismiss());
  await action('Reload latest').click();
  expect(await file.inputValue()).toBe(draft('draft-one'));
  page.once('dialog', (dialog: any) => dialog.accept());
  await action('Reload latest').click();
  await expect.poll(() => file.inputValue()).toContain('disk-one');
  await conflict('draft-overwrite', 'disk-two');
  page.once('dialog', (dialog: any) => dialog.accept());
  await action('Overwrite reviewed version').click();
  await action('Save now').click();
  await expect.poll(() => readFile(source, 'utf8')).toContain('draft-overwrite');
  await conflict('draft-retained', 'disk-three');
  await writeFile(source, draft('disk-newest'));
  page.once('dialog', (dialog: any) => dialog.accept());
  await action('Overwrite reviewed version').click();
  await editor.getByText('Server source changed again. Compare again before choosing.', { exact: false }).first().waitFor();
  expect(await file.inputValue()).toBe(draft('draft-retained'));
  expect(await readFile(source, 'utf8')).toBe(draft('disk-newest'));
  page.once('dialog', (dialog: any) => dialog.accept());
  await expect.poll(async () => {
    if ((await file.inputValue()).includes('disk-newest')) return true;
    if (!await action('Reload latest').isVisible() && await action('Review changes').isEnabled()) await action('Review changes').click();
    if (await action('Reload latest').isVisible()) {
      await action('Reload latest').click({ timeout: 500 }).catch(() => {});
    }
    return false;
  }).toBe(true);
  await expect.poll(() => file.inputValue()).toContain('disk-newest');
  await file.fill(draft('normal-save'));
  await action('Save now').click();
  await expect.poll(() => readFile(source, 'utf8')).toContain('normal-save');
  console.info('Browser source SHA-256', createHash('sha256').update(await readFile(source)).digest('hex'));
  await page.locator('uib-tabs.app-tabs > uib-tab').filter({ hasText: 'Preview' }).click();
  await page.frameLocator('#previewTarget iframe').getByText('normal-save', { exact: true }).waitFor();
}, 60000);

it('reports restored source when final recovery audit fails and permits subsequent local operations', async () => {
  let app = '', source = '', journal = '', original = '';
  const origin = await start(async root => {
    app = path.join(root, 'apps', V1_FIXTURE_APPLICATION_KEY);
    const bundle = path.join(app, 'form-bundle');
    source = path.join(bundle, 'form.json');
    const transaction = path.join(app, '.uib/transactions', createHash('sha256').update(bundle).digest('hex'));
    await mkdir(transaction, { recursive: true });
    journal = path.join(transaction, 'pending.json');
    original = JSON.stringify({ original: {
      'artifact.json': await readFile(path.join(bundle, 'artifact.json'), 'utf8'), 'form.json': '{"fields":[]}',
    } });
    await writeFile(journal, original);
    return undefined;
  }, `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    const append = fs.appendFile;
    let failed = false;
    fs.appendFile = async (file, data, ...options) => {
      if (!failed && String(file).endsWith('app-history.jsonl') && String(data).includes('"outcome":"succeeded"')) {
        failed = true;
        throw new Error('injected final audit failure');
      }
      return append(file, data, ...options);
    };
    syncBuiltinESMExports();
  `);
  const initial = await fetch(origin + '/api/development-identity/session');
  const cookie = initial.headers.get('set-cookie')!.split(';')[0];
  const headers = { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': (await initial.json()).csrfToken };
  expect((await fetch(origin + '/api/development-identity/session', {
    method: 'POST', headers, body: JSON.stringify({ email: developmentUsers[0].email }),
  })).status).toBe(200);
  const base = origin + '/api/apps/' + V1_FIXTURE_APPLICATION_KEY;
  const url = base + '/source-recovery';
  const list = () => fetch(url, { headers }).then(response => response.json());
  const post = (receipt: unknown) => fetch(url, { method: 'POST', headers, body: JSON.stringify(receipt) });
  const [receipt] = await list();
  const failed = await post(receipt);
  expect(failed.status).toBe(500);
  const restored = '{"fields":[]}';
  const manifest = JSON.parse(original).original['artifact.json'];
  const revision = createHash('sha256').update(JSON.stringify([['artifact.json', manifest], ['form.json', restored]])).digest('hex');
  expect(await failed.json()).toEqual({ code: 'SOURCE_RECOVERY_AUDIT_INCOMPLETE', sourceRestored: true, sourceRevision: revision });
  expect(await readFile(source, 'utf8')).toBe(restored);
  await expect(readFile(journal)).rejects.toMatchObject({ code: 'ENOENT' });
  const history = await readFile(path.join(app, 'history/app-history.jsonl'), 'utf8');
  expect(history.trim().split('\n').map(line => JSON.parse(line).outcome)).toEqual(['source-verified', 'partial-failure']);
  expect(await list()).toEqual([]);
  expect((await post(receipt)).status).toBe(409);
  const session = await fetch(origin + '/api/editor/session', { headers });
  const editor = await session.json();
  const editorHeaders = { ...headers, cookie: cookie + '; ' + session.headers.get('set-cookie')!.split(';')[0],
    'x-editor-revision': editor.revision, 'x-editor-csrf': editor.csrfToken };
  const inventory = await fetch(base + '/artifacts', { headers: editorHeaders }).then(response => response.json());
  const artifactUrl = base + '/artifacts/' + inventory.find((item: { artifactId: string }) => item.artifactId === 'v1-form').locator;
  const loaded = await fetch(artifactUrl, { headers: editorHeaders }).then(response => response.json());
  expect(loaded.checksum).toBe(revision);
  expect((await fetch(artifactUrl, { method: 'PUT', headers: editorHeaders, body: JSON.stringify({
    expectedChecksum: loaded.checksum, files: { 'form.json': '{"fields":[],"edited":true}' },
  }) })).status).toBe(200);
  expect(JSON.parse(await readFile(source, 'utf8'))).toMatchObject({ edited: true });
  await writeFile(journal, original);
  const [next] = await list();
  expect((await post(next)).status).toBe(200);
  expect(await readFile(source, 'utf8')).toBe(restored);
  await expect(readFile(journal)).rejects.toMatchObject({ code: 'ENOENT' });
}, 30000);

it('uses one V1 session for real Page and Form APIs and denies direct Workflow and application mutation', async () => {
  const origin = await start();
  const anonymous = await fetch(origin + '/api/development-identity/session');
  const initial = await anonymous.json();
  const v1Cookie = anonymous.headers.get('set-cookie')!.split(';')[0]!;
  expect((await fetch(origin + '/api/apps', { headers: { cookie: v1Cookie } })).status).toBe(401);
  const login = await fetch(origin + '/api/development-identity/session', { method: 'POST',
    headers: { cookie: v1Cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': initial.csrfToken },
    body: JSON.stringify({ email: 'mixed@example.local', userId: developmentUsers[0].id }) });
  expect(login.status).toBe(200); expect((await login.json()).user.userId).toBe(developmentUsers[4].id);
  const headers = { cookie: v1Cookie, origin, 'content-type': 'application/json' };
  expect((await fetch(origin + '/api/apps', { headers }).then(response => response.json())).map((app: { appId: string }) => app.appId))
    .toEqual([V1_FIXTURE_APPLICATION_ID]);
  const pageUrl = `${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/page?source=src%2Fpages%2FHome.ts`;
  const pageRead = await fetch(pageUrl, { headers }); expect(pageRead.status).toBe(200);
  const page = await pageRead.json();
  const legacyWrite = await fetch(pageUrl, { method: 'PUT', headers,
    body: JSON.stringify({ source: 'export const title = "Changed";\n', expectedHash: page.page.hash }) });
  expect(legacyWrite.status).toBe(405); expect((await legacyWrite.json()).code).toBe('LEGACY_PAGE_READ_ONLY');
  expect((await fetch(pageUrl, { headers }).then(response => response.json())).source).toBe(page.source);
  expect((await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/settings`, { method: 'PUT', headers, body: '{}' })).status).toBe(403);
  expect((await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/security/activate`, { method: 'POST',
    headers, body: '{}' })).status).toBe(403);
  const editorResponse = await fetch(origin + '/api/editor/session', { headers });
  expect(editorResponse.status).toBe(200);
  const editor = await editorResponse.json();
  expect(editor.principal.subjectId).toBe(developmentUsers[4].id);
  const editorCookie = editorResponse.headers.get('set-cookie')!.split(';')[0]!;
  const editorHeaders = { cookie: `${v1Cookie}; ${editorCookie}`, origin, 'content-type': 'application/json',
    'x-editor-revision': editor.revision, 'x-editor-csrf': editor.csrfToken };
  const discovery = await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts`, { headers: editorHeaders });
  expect(discovery.status).toBe(200);
  const artifacts = await discovery.json() as Array<{ artifactId: string; locator: string }>;
  expect(artifacts.map(artifact => artifact.artifactId)).toContain('v1-form');
  expect(artifacts.map(artifact => artifact.artifactId)).not.toContain('v1-workflow');
  const adminAnonymous = await fetch(origin + '/api/development-identity/session');
  const adminInitial = await adminAnonymous.json(), adminCookie = adminAnonymous.headers.get('set-cookie')!.split(';')[0]!;
  expect((await fetch(origin + '/api/development-identity/session', { method: 'POST', headers: { cookie: adminCookie,
    origin, 'content-type': 'application/json', 'x-v1-csrf': adminInitial.csrfToken },
    body: JSON.stringify({ email: 'admin@example.local' }) })).status).toBe(200);
  const adminEditorResponse = await fetch(origin + '/api/editor/session', { headers: { cookie: adminCookie } });
  const adminEditor = await adminEditorResponse.json(), adminEditorCookie = adminEditorResponse.headers.get('set-cookie')!.split(';')[0]!;
  const adminHeaders = { cookie: `${adminCookie}; ${adminEditorCookie}`, 'x-editor-revision': adminEditor.revision };
  const adminArtifacts = await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts`, { headers: adminHeaders })
    .then(response => response.json()) as Array<{ artifactId: string; locator: string }>;
  const workflowLocator = adminArtifacts.find(artifact => artifact.artifactId === 'v1-workflow')!.locator;
  const workflowUrl = `${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts/${workflowLocator}`;
  expect((await fetch(workflowUrl, { headers: editorHeaders })).status).toBe(403);
  expect((await fetch(workflowUrl, { method: 'PUT', headers: editorHeaders, body: '{}' })).status).toBe(403);
  const form = artifacts.find(artifact => artifact.artifactId === 'v1-form')!;
  const formUrl = `${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts/${form.locator}`;
  const loaded = await fetch(formUrl, { headers: editorHeaders }).then(response => response.json());
  expect((await fetch(formUrl, { method: 'PUT', headers: editorHeaders,
    body: JSON.stringify({ expectedChecksum: loaded.checksum, files: { 'form.json': '{"fields":[]}' } }) })).status).toBe(200);
  expect((await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts/${form.locator}`, { method: 'PUT',
    headers: { ...editorHeaders, 'x-editor-revision': 'forged' }, body: '{}' })).status).toBe(403);
});

async function prepareDataset(root: string) {
  const policyPath = path.join(root, 'policy.sqlite');
  const seed = new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true,
    policyStorePath: policyPath, origins: ['http://localhost:5174'] }); seed.close();
  const f = await fixture(V1_FIXTURE_APPLICATION_ID), a = await applied(f);
  const resourcePath = path.join(f.root, 'resources.sqlite'), ownerContext = {};
  const owner = new AppliedResourceRegistry(resourcePath, V1_AUTHORITY_ID, 'system', 'development', {
    async assertApplicationOwner(context) { if (context !== ownerContext) throw new Error('OWNER_DENIED'); },
    async assertDatasetRetired() { throw new Error('RETIREMENT_DENIED'); },
  }, f.manager, new QualifiedAppliedResolver({ stateRoot: f.stateRoot, pin: f.pin,
    reader: new CanonicalSchemaReader(f.manager), runtime: a.runtime }));
  await owner.registerApplication(ownerContext, V1_FIXTURE_APPLICATION_ID, 'V1 Fixture');
  await owner.bindAppliedDataset(ownerContext, V1_FIXTURE_APPLICATION_ID, 'dataset-tours'); owner.close();
  const store = new SecurityDefinitionStore(policyPath), service = new SecurityDefinitionService(store);
  const appRef = { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID,
    kind: 'application' as const, id: V1_FIXTURE_APPLICATION_ID };
  const datasetRef = { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID,
    kind: 'dataset' as const, id: 'dataset-tours' };
  const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
  const documents: SecurityDocument[] = [
    ...(['read', 'create', 'write'] as const).map(action => doc({ kind: 'permission', id: `v1.dataset.${action}`,
      key: `v1.dataset.${action}`, name: `Dataset ${action}`, status: 'active',
      owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, lifecycle: 'active', applicableKinds: ['dataset'] })),
    doc({ kind: 'permission-set', id: 'v1.dataset.reader', key: 'v1.dataset.reader', name: 'Dataset Reader', status: 'active',
      owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, includes: [],
      rules: (['read', 'create', 'write'] as const).map(action => ({ id: `v1.dataset.${action}.allow`,
        permissionId: `v1.dataset.${action}`, effect: 'allow' as const, scope: { resource: datasetRef, descendants: true } })) }),
    doc({ kind: 'role', id: 'v1.role.dataset-reader', key: 'v1.role.dataset-reader', name: 'Dataset Reader', status: 'active',
      owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, permissionSets: [{ id: 'v1.dataset.reader' }] }),
    doc({ kind: 'role-assignment', id: 'v1.assignment.dataset-reader', status: 'active', userId: developmentUsers[4].id,
      roleId: 'v1.role.dataset-reader', scope: { resource: appRef, descendants: true },
      startsAt: '2020-01-01T00:00:00.000Z', endsAt: null }),
  ];
  const candidate = service.stage({ changes: documents.map(document => ({ document })), expectedRevision: service.revision(),
    source: 'cli', actorId: 'v1-test-seed', idempotencyKey: randomUUID() });
  expect(candidate.activatable).toBe(true);
  expect(service.activate(candidate.id, candidate.checksum, 'v1-test-seed').status).toBe('activated'); store.close();
  const key = 'v1-server-to-dataset-secret-key-42';
  const config: SecuredDevelopmentHostConfig = { identity: { enabled: true, token: 'legacy-fixed-user-token-with-32-characters',
    userId: developmentUsers[0].id, applicationId: V1_FIXTURE_APPLICATION_ID, authorityId: V1_AUTHORITY_ID,
    trustedUiServerKey: key, allowLegacyToken: false },
    paths: { policyStore: policyPath, resourceRegistry: resourcePath, schemaPublications: f.publications,
      schemaApplicationState: f.stateRoot, ormData: path.join(f.root, 'orm') },
    pin: f.pin, serving: { generation, fingerprint: a.record.verification.ormFingerprint },
    registration: registration(V1_FIXTURE_APPLICATION_ID), permissions: { operation: { read: 'v1.dataset.read', create: 'v1.dataset.create' },
      field: { read: 'v1.dataset.read', write: 'v1.dataset.write' } }, port: 4103 };
  const host = createSecuredDevelopmentHost(config, 'development');
  const server = createServer(host.handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(async () => { await new Promise<void>(resolve => server.close(() => resolve())); host.close(); });
  const address = server.address() as { port: number };
  return { datasetUrl: `http://127.0.0.1:${address.port}/`, key };
}

it('propagates the same signed-in User through the protected DOE and real ORM', async () => {
  const origin = await start(prepareDataset);
  const anonymous = await fetch(origin + '/api/development-identity/session');
  const initial = await anonymous.json(), cookie = anonymous.headers.get('set-cookie')!.split(';')[0]!;
  const login = (email: string) => fetch(origin + '/api/development-identity/session', { method: 'POST',
    headers: { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': initial.csrfToken }, body: JSON.stringify({ email }) });
  expect((await login('mixed@example.local')).status).toBe(200);
  const query = () => fetch(origin + '/api/application-data/queries', { method: 'POST',
    headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-tours', select: ['name'] }) });
  const allowed = await query();
  expect(allowed.status).toBe(200);
  expect(await allowed.json()).toEqual([{ name: 'fixture' }]);
  const browserFetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => fetch(input, {
    ...init, headers: { ...init?.headers, cookie, origin } })) as typeof fetch;
  const client = new ApplicationDataClient(createSessionApplicationDataTransport({ endpoint: origin + '/api/application-data', fetch: browserFetch }));
  const form = new EventTarget();
  const submitted = new Promise<unknown>((resolve, reject) => bindDatasetForm(form, client,
    { datasetId: 'dataset-tours', operation: 'insert', onResult: resolve, onError: reject }));
  form.dispatchEvent(new CustomEvent('uib-forms-form-submit', { detail: { valid: true,
    values: { id: 'from-v1-form', name: 'Submitted' } } }));
  await submitted;
  expect(await query().then(response => response.json())).toEqual([{ name: 'fixture' }, { name: 'Submitted' }]);
  expect((await login('workflow-editor@example.local')).status).toBe(200);
  expect((await query()).status).toBe(403);
});
