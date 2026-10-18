/** Persistent, opt-in local demo setup. Never imported by the platform or client. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, readdir, lstat, rm } from 'node:fs/promises';
import { createServer, createConnection, type Server } from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { developmentUsers, managementPermissions, V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID } from '../src/server/v1-development-policy.js';
import { developmentSecurityConfiguration, developmentSecurityScopes } from '../src/server/v1-security-administration.js';
import { SecurityDefinitionService, SecurityDefinitionStore, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { initializeDevelopmentPlatformSecurity } from '@ui-platform/i-am/administration';
import { DevelopmentApplicationRegistry } from '../src/server/development-application-registry.js';
import { checkDemoHealth, checkReferenceHealth } from './demo-health.mjs';

// Running this opt-in command selects the development deployment explicitly.
process.env.NODE_ENV = 'development';

const platform = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.env.UI_BUILDER_DEMO_ROOT ?? path.join(platform, '..', 'builder-demo'));
const stateFile = path.join(root, 'demo.json');
const apps = path.join(root, 'apps'), runtime = path.join(root, 'runtime');
const policyPath = path.join(runtime, 'iam-v1-development.sqlite');
const ledgerPath = path.join(runtime, 'development-applications.sqlite');
const apiPort = 5280, uiPort = 5274, hmrPort = 5276;
const origin = `http://localhost:${apiPort}`;
const uiOrigin = `http://localhost:${uiPort}`;
const author = developmentUsers[0], administrator = developmentUsers[1];
const dataPermissions = ['dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.write'];
const applicationPermissions = managementPermissions.filter(p => !p.id.startsWith('ui.platform.')).map(p => p.id);
const platformPermissions = ['ui.platform.application.create', 'ui.platform.component.admin'];
type DemoState = { format: 'ui-platform.local-demo'; version: 1; key: 'demo'; status: 'initializing' | 'ready'; applicationId?: string; createdAt: string };

async function readState(): Promise<DemoState | undefined> {
  let text: string;
  try { text = await readFile(stateFile, 'utf8'); } catch (error: any) { if (error.code === 'ENOENT') return; throw error; }
  const state = JSON.parse(text);
  if (state.format !== 'ui-platform.local-demo' || state.version !== 1 || state.key !== 'demo' || state.status !== 'ready' || !state.applicationId)
    throw new Error(`Demo setup is incomplete or incompatible. Preserve ${root} and review it; startup will not reset or repair authority automatically.`);
  return state;
}

async function requireFreePort(port: number) {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => { probe.once('error', () => reject(new Error(`Port ${port} is occupied. Stop the previous demo first; no existing process will be stopped automatically.`))); probe.listen(port, '127.0.0.1', resolve); });
  await new Promise<void>(resolve => probe.close(() => resolve()));
}

async function initialize() {
  await mkdir(root, { recursive: true });
  if ((await readdir(root)).length) throw new Error(`Unrecognized nonempty demo directory: ${root}. Nothing has been overwritten.`);
  const state: DemoState = { format: 'ui-platform.local-demo', version: 1, key: 'demo', status: 'initializing', createdAt: new Date().toISOString() };
  await writeFile(stateFile, JSON.stringify(state, null, 2) + '\n', { flag: 'wx' });
  await mkdir(apps); await mkdir(runtime);
  new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true, policyStorePath: policyPath, origins: [origin, uiOrigin] }).close();
  const store = new SecurityDefinitionStore(policyPath);
  try {
    const context = Object.freeze({});
    const result = await initializeDevelopmentPlatformSecurity(new SecurityDefinitionService(store), { async verify(handle) {
      if (handle !== context) throw new Error('DEMO_LOCAL_SETUP_DENIED');
      return { operatorId: 'explicit-local-builder-demo-setup', deploymentId: developmentSecurityConfiguration.deploymentId, strong: true as const, capabilityId: developmentSecurityConfiguration.bootstrapCapabilityId };
    } }, developmentSecurityScopes, developmentSecurityConfiguration, {
      context, administratorUserId: administrator.id,
      grantablePermissionIds: [...platformPermissions, ...applicationPermissions, ...dataPermissions],
      capabilityDefinitions: dataPermissions.map(id => ({ id, applicableKinds: ['dataset', 'field'] })),
      applicationAnchors: [{ applicationId: V1_FIXTURE_APPLICATION_ID, administratorUserId: author.id }],
      expectedRevision: store.revision(), reason: 'User-requested isolated, persistent Builder Demo local setup',
    });
    if (result.status !== 'activated') throw new Error(`Demo security setup failed: ${JSON.stringify(result)}`);
  } finally { store.close(); }
  return state;
}

async function login(email: string) {
  const response = await fetch(origin + '/api/development-identity/session');
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  const session = await response.json() as { csrfToken: string };
  if (!response.ok || !cookie || !session.csrfToken) throw new Error('Demo identity session unavailable');
  const headers = { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken };
  const loggedIn = await fetch(origin + '/api/development-identity/session', { method: 'POST', headers, body: JSON.stringify({ email }) });
  if (!loggedIn.ok) throw new Error('Demo identity is unavailable or revoked. No grants have been repaired.');
  return headers;
}

async function request(route: string, headers: Record<string, string>, body?: unknown) {
  const response = await fetch(origin + route, { method: body === undefined ? 'GET' : 'POST', headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await response.json() as any;
  if (!response.ok) throw new Error(`${route}: ${response.status} ${JSON.stringify(value)}`);
  return value;
}

async function provision(state: DemoState) {
  const security = await login(administrator.email);
  const revision = () => { const store = new SecurityDefinitionStore(policyPath); try { return store.revision(); } finally { store.close(); } };
  const activate = async (route: string, records: SecurityRecord[]) => {
    const staged = await request(route + '/stage', security, { changes: records.map(definition => ({ document: { format: 'ui-platform.security', formatVersion: 1, definition } })), expectedRevision: revision(), reason: 'Explicit persistent local demo grants' });
    if (staged.diagnostics?.length) throw new Error(JSON.stringify(staged.diagnostics));
    const activated = await request(route + '/activate', security, { candidateId: staged.id, checksum: staged.checksum, expectedRevision: staged.baseRevision, reason: 'Explicit persistent local demo grants' });
    if (activated.status !== 'activated') throw new Error(JSON.stringify(activated));
  };
  const systemScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
  const base = (id: string) => ({ id, key: id, name: id, status: 'active' as const });
  await activate('/api/platform/security', [
    { ...base('demo.platform.set'), kind: 'permission-set', owner: { kind: 'platform' }, includes: [], rules: platformPermissions.map(permissionId => ({ id: `demo.${permissionId}`, permissionId, effect: 'allow', scope: systemScope })) },
    { ...base('demo.platform.role'), kind: 'role', owner: { kind: 'platform' }, permissionSets: [{ id: 'demo.platform.set' }] },
    { kind: 'role-assignment', id: 'demo.platform.assignment', userId: author.id, roleId: 'demo.platform.role', status: 'active', scope: systemScope, startsAt: '2020-01-01T00:00:00Z', endsAt: null },
  ]);
  const authorHeaders = await login(author.email);
  const app = await request('/api/apps', authorHeaders, { key: state.key, name: 'Builder Demo', templateId: 'standard' });
  state.applicationId = app.appId;
  // Record the created identity even if a subsequent setup operation fails.
  await writeFile(stateFile, JSON.stringify(state, null, 2) + '\n');
  const onboarding = await request(`/api/apps/${state.key}/onboarding`, security, { administratorUserId: author.id, reason: 'Explicit Builder Demo Application administrator, separate from Platform setup administrator' });
  if (onboarding.status !== 'activated') throw new Error(JSON.stringify(onboarding));
  const applicationId = app.appId as string;
  const scope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application' as const, id: applicationId }, descendants: true };
  const owner = { kind: 'application' as const, applicationId };
  await activate(`/api/apps/${state.key}/security`, [
    { ...base('demo.author.set'), kind: 'permission-set', owner, includes: [], rules: [...applicationPermissions, ...dataPermissions].map(permissionId => ({ id: `demo.${permissionId}`, permissionId, effect: 'allow', scope })) },
    { ...base('demo.author.role'), kind: 'role', owner, permissionSets: [{ id: 'demo.author.set' }] },
    { kind: 'role-assignment', id: 'demo.author.assignment', userId: author.id, roleId: 'demo.author.role', status: 'active', scope, startsAt: '2020-01-01T00:00:00Z', endsAt: null },
  ]);
  state.status = 'ready';
  await writeFile(stateFile, JSON.stringify(state, null, 2) + '\n');
  await writeFile(path.join(root, 'AGENTS.md'), '# Shared persistent Builder Demo\n\nThis is the user-requested shared manual/Codex testing Application. Read ui-platform/docs/demo-site.md before testing.\nPreserve existing edits, permanent identities, policy and data. Never reset, reseed, delete or overwrite this site without explicit user authorization.\nUse non-destructive browser checks by default. Name newly created test artifacts Codex Test <description>; remove only artifacts created by the current test when safe.\nExisting automated package regressions must continue using isolated temporary fixtures. This mutable demo is not their deterministic fixture.\n');
}

async function verifyOwner(state: DemoState) {
  // Opening a missing authority would create a new database: require files first.
  await lstat(policyPath); await lstat(ledgerPath);
  const manifest = JSON.parse(await readFile(path.join(apps, state.key, 'app.manifest.json'), 'utf8'));
  const registry = new DevelopmentApplicationRegistry(ledgerPath, apps);
  try {
    if (manifest.appId !== state.applicationId || registry.byKey(state.key)?.applicationId !== state.applicationId) throw new Error('Demo permanent identity or owner ledger differs. Nothing will be adopted or repaired.');
  } finally { registry.close(); }
}

let child: ChildProcess | undefined;
let referenceChild: ChildProcess | undefined;
let referenceStarting: Promise<void> | undefined;
let referenceReady = false;
let referenceExpected = process.argv.includes('--with-reference');
let stopping = false;
let stoppingTask: Promise<void> | undefined;
let control: Server | undefined;
let controlToken: string | undefined;
let previewUrl: string | undefined;
let ready = false;
const controlFile = path.join(runtime, 'demo-control.json');

async function startReference() {
  referenceExpected = true;
  if (referenceReady && referenceChild?.exitCode === null && referenceChild.signalCode === null) return;
  if (referenceStarting) return referenceStarting;
  referenceStarting = (async () => {
    for (const port of [4092, 5192, 5193, 5194]) await requireFreePort(port);
    referenceChild = spawn(process.execPath, ['--import', 'tsx', 'scripts/dev-composition-reference.ts'], {
      cwd: platform, windowsHide: true, stdio: 'inherit', env: { ...process.env,
        NODE_ENV: 'development', UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '0', UI_PLATFORM_BUILDER_WP0: '0' },
    });
    let spawnError: Error | undefined;
    referenceChild.once('error', error => { spawnError = error; });
    referenceChild.once('exit', () => { referenceReady = false; });
    const deadline = Date.now() + 120_000;
    let issues: string[] = [];
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (referenceChild.exitCode !== null || referenceChild.signalCode !== null) throw new Error('Reference demo stopped during startup.');
      issues = await checkReferenceHealth();
      if (!issues.length) { referenceReady = true; return; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Reference demo did not become ready:\n' + issues.join('\n'));
  })();
  try { await referenceStarting; } finally { referenceStarting = undefined; }
}

async function ensureAllServices() {
  if (!ready) throw new Error('Builder is still starting. Wait for its ready message.');
  if (stopping) throw new Error('Demo services are stopping.');
  const state = await readState();
  if (!state) throw new Error('Saved demo is unavailable.');
  await verifyOwner(state);
  const headers = await login(author.email);
  if ((await request(`/api/apps/${state.key}`, headers)).appId !== state.applicationId) throw new Error('Running demo owner changed.');
  const preview = await request(`/api/apps/${state.key}/preview`, headers, {});
  previewUrl = preview.url;
  await startReference();
}

async function startControl() {
  try {
    const previousText = await readFile(controlFile, 'utf8');
    const previous = JSON.parse(previousText);
    const validEndpoint = typeof previous.endpoint === 'string' && (process.platform === 'win32'
      ? previous.endpoint.startsWith('\\\\.\\pipe\\ui-platform-demo-')
      : path.dirname(previous.endpoint) === runtime);
    if (previous.format !== 'ui-platform.demo-control' || !validEndpoint) throw new Error('Unrecognized demo control file; preserve it for review.');
    const active = await new Promise<boolean>((resolve, reject) => {
      const socket = createConnection(previous.endpoint);
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', (error: NodeJS.ErrnoException) => { if (['ENOENT', 'ECONNREFUSED'].includes(error.code ?? '')) resolve(false); else reject(error); });
    });
    if (active) throw new Error('A demo launcher is already active. Use Stop Demo.cmd first.');
    if (await readFile(controlFile, 'utf8') !== previousText) throw new Error('Demo control changed during startup.');
    await rm(controlFile);
  } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  controlToken = randomBytes(32).toString('hex');
  const endpoint = process.platform === 'win32' ? `\\\\.\\pipe\\ui-platform-demo-${controlToken.slice(0, 24)}` : path.join(runtime, `control-${controlToken.slice(0, 12)}.sock`);
  control = createServer(socket => {
    socket.setEncoding('utf8'); socket.setTimeout(3000, () => socket.destroy());
    let text = '';
    socket.on('error', () => {});
    let handled = false;
    socket.on('data', async chunk => {
      if (handled) return;
      text += chunk;
      if (text.length > 4096) { socket.destroy(); return; }
      if (!text.includes('\n')) return;
      handled = true;
      try {
        const input = JSON.parse(text);
        if (input.token !== controlToken || !['status', 'stop', 'start-all'].includes(input.operation)) { socket.end(JSON.stringify({ ok: false, error: 'Invalid local demo control request' })); return; }
        if (input.operation === 'start-all') { socket.setTimeout(180_000); await ensureAllServices(); }
        const response = JSON.stringify({ ok: true, ready, builder: uiOrigin, preview: previewUrl, reference: referenceReady, referenceExpected });
        socket.end(response, () => {
          if (input.operation === 'stop') void stop().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
        });
      } catch (error) { socket.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Invalid local demo control request' })); }
    });
  });
  await new Promise<void>((resolve, reject) => { control!.once('error', reject); control!.listen(endpoint, resolve); });
  await writeFile(controlFile, JSON.stringify({ format: 'ui-platform.demo-control', endpoint, token: controlToken }) + '\n', { flag: 'wx', mode: 0o600 });
}

async function stop() {
  if (stoppingTask) return stoppingTask;
  stopping = true;
  stoppingTask = stopServices();
  return stoppingTask;
}
async function stopServices() {
  for (const service of [referenceChild, child]) {
    if (service && service.exitCode === null && service.signalCode === null) {
      const exited = once(service, 'exit');
      if (process.platform === 'win32' && service.pid) {
        const killer = spawn('taskkill', ['/PID', String(service.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        const [code] = await once(killer, 'exit');
        if (code !== 0 && service.exitCode === null && service.signalCode === null) throw new Error('Could not stop the demo service tree.');
      } else service.kill('SIGTERM');
      await exited;
    }
  }
  control?.close();
  if (controlToken) {
    try {
      const current = JSON.parse(await readFile(controlFile, 'utf8'));
      if (current.token === controlToken) await rm(controlFile);
    } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
}
process.on('SIGINT', () => { void stop().then(() => process.exit(0)); });
process.on('SIGTERM', () => { void stop().then(() => process.exit(0)); });

try {
  const previewOnly = process.argv.includes('--preview');
  if (previewOnly) {
    const state = await readState();
    if (!state) throw new Error('Start npm.cmd run demo first.');
    await verifyOwner(state);
    const headers = await login(author.email);
    const current = await request(`/api/apps/${state.key}`, headers);
    if (current.appId !== state.applicationId) throw new Error('Running server does not own the saved demo identity. Preview refused.');
    const preview = await request(`/api/apps/${state.key}/preview`, headers, {});
    console.log(`Public: ${preview.url}/demo/\nAdmin: ${preview.url}/demo/admin\nClose the Builder authoring tab before this runtime check. Concurrent-use reliability remains the open WP5-F item.`);
  } else {
    await requireFreePort(apiPort); await requireFreePort(uiPort); await requireFreePort(hmrPort);
    let state = await readState();
    if (state) await verifyOwner(state);
    else state = await initialize();
    await startControl();
    child = spawn(process.execPath, ['scripts/dev.mjs'], { cwd: platform, windowsHide: true, stdio: 'inherit', env: {
      ...process.env, NODE_ENV: 'development', UI_APPS_DIR: apps, UI_RUNTIME_DIR: runtime,
      UI_PLATFORM_V1_POLICY_STORE: policyPath, UI_PLATFORM_BUILDER_HOSTS_FILE: path.join(runtime, 'builder-hosts.json'),
      UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_BUILDER_WP0: '1', UI_PLATFORM_EDITOR: '0',
      UI_PLATFORM_API_PORT: String(apiPort), UI_PLATFORM_UI_PORT: String(uiPort),
      UI_PLATFORM_HMR_PORT: String(hmrPort),
      UI_PLATFORM_VITE_CACHE_DIR: path.join(runtime, 'manager-vite-cache'),
    } });
    child.on('error', error => { console.error(error); process.exitCode = 1; });
    const deadline = Date.now() + 90_000;
    while (true) {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Demo server stopped during startup.');
      if (await fetch(origin + '/api/health').then(r => r.ok).catch(() => false)) break;
      if (Date.now() >= deadline) throw new Error('Demo server startup timed out.');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (state.status === 'initializing') await provision(state);
    await verifyOwner(state);
    if (process.argv.includes('--with-preview')) {
      const headers = await login(author.email);
      const current = await request(`/api/apps/${state.key}`, headers);
      if (current.appId !== state.applicationId) throw new Error('Preview owner differs from the saved demo identity.');
      const preview = await request(`/api/apps/${state.key}/preview`, headers, {});
      previewUrl = preview.url;
      console.log(`\nPublic: ${previewUrl}/demo/\nAdmin: ${previewUrl}/demo/admin\nSave and close the Builder authoring tab before viewing runtime pages (open WP5-F contention limitation).`);
    }
    let healthIssues: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      healthIssues = await checkDemoHealth(uiOrigin, previewUrl);
      if (!healthIssues.length) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (healthIssues.length) throw new Error('Demo pages are not ready:\n' + healthIssues.join('\n'));
    if (process.argv.includes('--with-reference')) await startReference();
    ready = true;
    if (referenceReady) console.log('Reference Public: http://127.0.0.1:5193/\nReference Admin: http://127.0.0.1:5193/admin\nReference Manager: http://127.0.0.1:5192');
    console.log(`\nBUILDER DEMO READY (pages and development dependencies checked)\nBuilder: ${uiOrigin}\nSelect Development identity: ${author.email}\nOpen Builder Demo, then Pages.\nSaved Application: ${path.join(apps, state.key)}\nPermanent Application ID: ${state.applicationId}\nRuntime: close the authoring tab, then run npm.cmd run demo:preview in another terminal.\nEdits and permission changes survive restart. No automatic reset or regrant.\n`);
    await once(child, 'exit');
    if (!stopping) { process.exitCode = child.exitCode ?? 1; await stop(); }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await stop();
  process.exitCode = 1;
}
