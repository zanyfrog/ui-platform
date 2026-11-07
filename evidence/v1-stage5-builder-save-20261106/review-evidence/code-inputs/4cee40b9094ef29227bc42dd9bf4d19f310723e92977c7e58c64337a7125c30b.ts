import { beforeAll, afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { createServer as httpsServer, request as httpsRequest } from 'node:https';
import { X509Certificate } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { PermanentIdentityDirectory } from '../src/server/production/enrollment.js';
import { SecureSessions } from '../src/server/production/sessions.js';
import { OidcLogin } from '../src/server/production/oidc.js';
import { InternalSigner, InternalVerifier } from '../src/server/production/internal-trust.js';
import { MtlsRuntimeTransport } from '../src/server/production/mtls-transport.js';
import { currentIam } from '../src/server/production/current-iam.js';
import { ReleasedContracts, inspectPublishedComposition } from '../src/server/production/releases.js';
import { PrivateAssets } from '../src/server/production/private-assets.js';
import { runtimeHandler } from '../src/server/production/runtime.js';
import { protectedDataHandler } from '../src/server/production/data-handler.js';
import { managementSecurityHandler } from '../src/server/production/management.js';
import { SecurityAdministrationService } from '@ui-platform/i-am/administration';
import { releasedRuntimeServices } from '../src/shared/released-runtime-services.js';
import { digest } from '../src/server/production/boundary.js';
import * as oidc from '../src/server/production/node_modules/openid-client/build/index.js';
import { generateKeyPair, exportJWK, SignJWT } from '../src/server/production/node_modules/jose/dist/webapi/index.js';
import { SecurityDefinitionStore, SecurityDefinitionService, type SecurityRecord, type SecurityDocument } from '@ui-platform/i-am/definitions';
import { DatasetSecurityPlanService } from '@ui-platform/i-am/dataset-security';
import { SecuredDatasetOperationEngine, TriggerRegistry, registerTriggerDataset } from '@ui-platform/dataset-operations';
import { platformRoot } from '../src/server/paths.js';
import { copyCompositionSnapshot } from '../src/server/composition-snapshots.js';

const cleanup: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); }, 60_000);
beforeAll(async () => {
  const target = process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT, original = process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if (!target || !original) throw new Error('Stage 5 requires the Stage 4 physical isolation guard');
  const root = await realpath(target);
  expect(await realpath(platformRoot)).toBe(root); expect(await realpath(process.cwd())).toBe(root); expect(root).not.toBe(await realpath(original));
  for (const relative of ['components', 'src/server', 'packages/artifacts', 'node_modules/@ui-platform/artifacts', 'src/server/production/node_modules/openid-client']) expect((await realpath(path.join(root, relative))).startsWith(root + path.sep)).toBe(true);
  for (const name of ['i-am', 'dataset-operations']) expect((await realpath(path.join(root, 'node_modules/@ui-platform', name))).startsWith(path.dirname(root) + path.sep)).toBe(true);
});
async function temporary() { const root = await mkdtemp(path.join(tmpdir(), 'stage5-')); cleanup.push(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })); return root; }
function req(url = '/', headers: Record<string, string> = {}, method = 'GET') { return { url, headers, method } as IncomingMessage; }
async function listen(server: Server) { await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); cleanup.push(() => new Promise<void>(r => { server.close(() => r()); server.closeAllConnections(); })); return (server.address() as { port: number }).port; }
async function directory() {
  const root = await temporary(), enabled = { value: true }, operator = {};
  const directory = new PermanentIdentityDirectory(path.join(root, 'identity.sqlite'), async id => id === 'user-a' && enabled.value, async context => { if (context !== operator) throw new Error('OPERATOR_DENIED'); return 'local-test-operator'; });
  cleanup.push(() => directory.close());
  await directory.approve(operator, 'https://identity.example/', 'subject-a', 'user-a', 'app-a');
  return { directory, root, enabled, operator, enrollment: await directory.resolve('https://identity.example/', 'subject-a', 'app-a') };
}

it('permanent mapping requires operator approval, is app scoped, refuses email/role substitutions and never remaps a subject', async () => {
  const f = await directory();
  await expect(f.directory.approve({}, 'https://identity.example/', 'subject-b', 'user-a', 'app-a')).rejects.toThrow();
  for (const [issuer, subject, app] of [['https://other.example/', 'subject-a', 'app-a'], ['https://identity.example/', 'administrator@example.com', 'app-a'], ['https://identity.example/', 'subject-a', 'app-b']]) await expect(f.directory.resolve(issuer, subject, app)).rejects.toThrow();
  await expect(f.directory.approve(f.operator, 'https://identity.example/', 'subject-a', 'other-user', 'app-a')).rejects.toThrow();
  await f.directory.revoke(f.operator, f.enrollment.issuer, f.enrollment.subject, 'app-a'); expect(await f.directory.current(f.enrollment)).toBe(false);
  await f.directory.approve(f.operator, f.enrollment.issuer, f.enrollment.subject, 'user-a', 'app-a'); expect(await f.directory.current(f.enrollment)).toBe(false);
  f.enabled.value = false; await expect(f.directory.resolve(f.enrollment.issuer, f.enrollment.subject, 'app-a')).rejects.toThrow();
});

it('secure sessions enforce cookie flags, CSRF/origin, rotation, idle/absolute expiry, logout, local revocation and restart', async () => {
  const f = await directory(); let now = 1000;
  const sessions = new SecureSessions('app-a', 'client-a', 'https://site.example', f.directory, () => now, 1000, 3000);
  const a = await sessions.issue(f.enrollment); expect(a.cookie).toContain('Secure; HttpOnly; SameSite=Lax'); expect(a.cookie).toContain('__Host-');
  const headers = { cookie: `${sessions.cookieName}=${a.token}`, origin: sessions.publicOrigin, 'x-uib-csrf': a.csrf };
  await sessions.read(req('/', headers, 'POST'), true);
  for (const extra of [{ origin: 'https://foreign.example' }, { 'x-uib-csrf': 'forged' }, { authorization: 'Bearer development-token' }, { 'x-actor': 'administrator' }]) await expect(sessions.read(req('/', { ...headers, ...extra }, 'POST'), true)).rejects.toThrow();
  const b = await sessions.issue(f.enrollment, a.token); await expect(sessions.read(req('/', headers))).rejects.toThrow();
  const bh = { cookie: `${sessions.cookieName}=${b.token}`, origin: sessions.publicOrigin, 'x-uib-csrf': b.csrf };
  sessions.revoke('user-a'); await expect(sessions.read(req('/', bh))).rejects.toThrow();
  const c = await sessions.issue(f.enrollment); const ch = { cookie: `${sessions.cookieName}=${c.token}`, origin: sessions.publicOrigin, 'x-uib-csrf': c.csrf };
  await sessions.logout(req('/', ch, 'POST')); await expect(sessions.read(req('/', ch))).rejects.toThrow();
  const d = await sessions.issue(f.enrollment); now += 1001; await expect(sessions.read(req('/', { cookie: `${sessions.cookieName}=${d.token}` }))).rejects.toThrow();
  const e = await sessions.issue(f.enrollment); for (let i = 0; i < 3; i++) { now += 900; await sessions.read(req('/', { cookie: `${sessions.cookieName}=${e.token}` })); } now += 301;
  await expect(sessions.read(req('/', { cookie: `${sessions.cookieName}=${e.token}` }))).rejects.toThrow();
  const g = await sessions.issue(f.enrollment); sessions.close(); await expect(sessions.read(req('/', { cookie: `${sessions.cookieName}=${g.token}` }))).rejects.toThrow();
});

it('OIDC library cryptographically validates issuer/audience/signature/expiry/nonce; transactions bind state, PKCE and browser exactly once (simulated provider)', async () => {
  const f = await directory(), keys = await generateKeyPair('RS256'), wrong = await generateKeyPair('RS256'), jwk = { ...await exportJWK(keys.publicKey), kid: 'test-key', alg: 'RS256' };
  const sessions = new SecureSessions('app-a', 'client-a', 'https://site.example', f.directory);
  const config = new oidc.Configuration({ issuer: 'https://identity.example/', authorization_endpoint: 'https://identity.example/authorize', token_endpoint: 'https://identity.example/token', jwks_uri: 'https://identity.example/jwks' }, 'client-a', { id_token_signed_response_alg: 'RS256' }, oidc.ClientSecretPost('ephemeral-local-test-secret'));
  let mode = 'valid', expectedNonce = '', challenge = '', exchanges = 0;
  config[oidc.customFetch] = async (url, init) => {
    if (String(url).endsWith('/jwks')) return Response.json({ keys: [jwk] });
    exchanges++;
    const parameters = new URLSearchParams(String(init?.body));
    expect(await oidc.calculatePKCECodeChallenge(parameters.get('code_verifier')!)).toBe(challenge);
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ nonce: mode === 'nonce' ? 'wrong' : expectedNonce, amr: mode === 'mfa' ? ['pwd'] : ['mfa'], auth_time: now })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(mode === 'issuer' ? 'https://other.example/' : 'https://identity.example/')
      .setSubject(mode === 'unknown' ? 'unknown-subject' : 'subject-a').setAudience(mode === 'audience' ? 'other-client' : 'client-a').setIssuedAt(now)
      .setExpirationTime(mode === 'expiry' ? now - 300 : now + 300).sign(mode === 'signature' ? wrong.privateKey : keys.privateKey);
    return Response.json({ token_type: 'Bearer', access_token: 'local-test-only', id_token: token });
  };
  const login = new OidcLogin(config, sessions);
  const begin = async () => { const start = await login.start(req('/auth/login')); const url = new URL(start.url); expectedNonce = url.searchParams.get('nonce')!; challenge = url.searchParams.get('code_challenge')!; expect(url.searchParams.get('code_challenge_method')).toBe('S256'); return { state: url.searchParams.get('state')!, cookie: start.cookie.split(';')[0]! }; };
  for (mode of ['issuer', 'audience', 'signature', 'expiry', 'nonce', 'mfa', 'unknown']) {
    const a = await begin(); let rejected = false; try { await login.finish(req(`/auth/callback?code=local-code&state=${a.state}`, { cookie: a.cookie })); } catch { rejected = true; } expect(rejected, `OIDC ${mode} must be rejected`).toBe(true);
    await expect(login.finish(req(`/auth/callback?code=local-code&state=${a.state}`, { cookie: a.cookie }))).rejects.toThrow();
  }
  mode = 'valid'; const a = await begin(); const good = await login.finish(req(`/auth/callback?code=local-code&state=${a.state}`, { cookie: a.cookie })); expect(good.returnTo).toBe('/');
  await expect(login.finish(req(`/auth/callback?code=local-code&state=${a.state}`, { cookie: a.cookie }))).rejects.toThrow();
  const b = await begin(); const count = exchanges; await expect(login.finish(req('/auth/callback?code=x&state=wrong', { cookie: b.cookie }))).rejects.toThrow(); expect(exchanges).toBe(count);
  await expect(login.start(req('/auth/login'), '//evil.example')).rejects.toThrow();
  const c = await begin(); await expect(login.finish(req(`/auth/callback?code=x&state=${c.state}`, {}))).rejects.toThrow();
});

async function tlsFiles(root: string) {
  const openssl = 'C:/Program Files/Git/usr/bin/openssl.exe';
  const run = (args: string[]) => execFileSync(openssl, args, { cwd: root, windowsHide: true, stdio: 'ignore' });
  run(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.pem', '-days', '1', '-subj', '/CN=Stage5 disposable CA']);
  for (const name of ['server', 'client']) {
    run(['req', '-newkey', 'rsa:2048', '-nodes', '-keyout', `${name}.key`, '-out', `${name}.csr`, '-subj', `/CN=${name}`]);
    await writeFile(path.join(root, `${name}.ext`), `subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=${name === 'server' ? 'serverAuth' : 'clientAuth'}\n`);
    run(['x509', '-req', '-in', `${name}.csr`, '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', `${name}.pem`, '-days', '1', '-extfile', `${name}.ext`]);
  }
  return { ca: await readFile(path.join(root, 'ca.pem'), 'utf8'), cert: await readFile(path.join(root, 'server.pem'), 'utf8'), key: await readFile(path.join(root, 'server.key'), 'utf8'),
    client: { ca: await readFile(path.join(root, 'ca.pem'), 'utf8'), cert: await readFile(path.join(root, 'client.pem'), 'utf8'), key: await readFile(path.join(root, 'client.key'), 'utf8') } };
}

it('real loopback mTLS and signed assertions reject replay, wrong audience/app/body/path/range, expired/dev credentials and missing client certificate', async () => {
  const f = await directory(), tls = await tlsFiles(f.root), keys = await generateKeyPair('EdDSA'), audience = 'data-instance-local-test';
  const verifier = new InternalVerifier(audience, [{ issuer: 'runtime', keyId: 'runtime-key', publicKey: keys.publicKey, certificateFingerprint: new X509Certificate(tls.client.cert).fingerprint256, applications: ['app-a'] }], f.directory, async () => true);
  const server = httpsServer({ ...tls, requestCert: true, rejectUnauthorized: true }, async (request, response) => {
    const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(chunk);
    try { await verifier.authenticate(request, Buffer.concat(chunks)); response.writeHead(200).end('allowed'); } catch { response.writeHead(403).end('denied'); }
  }); const port = await listen(server);
  const actor = { enrollment: f.enrollment, sessionId: 'local-session', releaseId: 'release-a' }, signer = new InternalSigner('runtime', 'runtime-key', keys.privateKey, audience);
  const post = (assertion: string, body = '{}', route = '/runtime/execute', range?: string, client = true) => new Promise<number>((resolve, reject) => {
    const request = httpsRequest(`https://127.0.0.1:${port}${route}`, { ...(client ? tls.client : { ca: tls.ca }), method: 'POST', headers: { authorization: `Bearer ${assertion}`, ...(range ? { range } : {}) } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode!)); }); request.on('error', reject); request.end(body);
  });
  const good = await signer.sign(actor, 'POST', '/runtime/execute', Buffer.from('{}'));
  expect(await post(good)).toBe(200); expect(await post(good)).toBe(403);
  expect(await post(await signer.sign(actor, 'POST', '/runtime/execute', Buffer.from('{}')), '{"forged":true}')).toBe(403);
  expect(await post(await signer.sign(actor, 'POST', '/runtime/execute', Buffer.from('{}')), '{}', '/management')).toBe(403);
  expect(await post(await signer.sign(actor, 'POST', '/runtime/execute', Buffer.from('{}')), '{}', '/runtime/execute', 'bytes=0-1')).toBe(403);
  expect(await post(await signer.sign(actor, 'POST', '/runtime/execute', Buffer.from('{}'), Math.floor(Date.now() / 1000) - 30))).toBe(403);
  expect(await post(await new InternalSigner('runtime', 'runtime-key', keys.privateKey, 'wrong-audience').sign(actor, 'POST', '/runtime/execute', Buffer.from('{}')))).toBe(403);
  expect(await post(await signer.sign({ ...actor, enrollment: { ...f.enrollment, applicationId: 'app-b' } }, 'POST', '/runtime/execute', Buffer.from('{}')))).toBe(403);
  expect(await post('development-static-token')).toBe(403); await expect(post(good, '{}', '/runtime/execute', undefined, false)).rejects.toThrow();
});

async function datasetFixture(root: string, directory: PermanentIdentityDirectory) {
  const dataRequire = createRequire(path.resolve('../UI Platform Data Services/package.json'));
  const { JsonFileDatasetOrm } = await import(dataRequire.resolve('@ui-platform/orm'));
  const orm = new JsonFileDatasetOrm(path.join(root, 'records'));
  orm.register({ reference: { appId: 'app-a', dataset: 'inventory' }, primaryKey: 'id', fields: [{ name: 'id', type: 'string', required: true }, { name: 'name', type: 'string', required: true }, { name: 'total', type: 'string' }, { name: 'secret', type: 'string' }] });
  registerTriggerDataset(orm); const triggers = new TriggerRegistry(orm);
  const store = new SecurityDefinitionStore(path.join(root, 'policy.sqlite')); cleanup.push(() => store.close());
  const rootResource = { authorityId: 'resources', applicationId: null, kind: 'system' as const, id: 'system' };
  const app = { authorityId: 'resources', applicationId: 'app-a', kind: 'application' as const, id: 'app-a' }, dataset = { ...app, kind: 'dataset' as const, id: 'ds-a' };
  const scope = { resource: app, descendants: true }, owner = { kind: 'application' as const, applicationId: 'app-a' };
  const permissions = ['p-read', 'p-create', 'p-update', 'p-delete', 'p-write', 'p-filter', 'p-sort', 'ui.artifact.view', 'ui.page.view', 'ui.application.security.admin'];
  const records: SecurityRecord[] = [{ kind: 'user', id: 'user-a', displayName: 'A', status: 'active' },
    ...permissions.map(id => ({ kind: 'permission', id, key: id, name: id, status: 'active', owner, lifecycle: 'active', applicableKinds: ['application', 'dataset', 'field', 'artifact', 'page'] } as SecurityRecord)),
    { kind: 'application-security', id: 'app-a', key: 'app-a', name: 'Application', owner, status: 'active', requiredAdministratorPermissionId: 'ui.application.security.admin', sharedPackages: [] },
    { kind: 'permission-set', id: 'set-a', key: 'set-a', name: 'Set', status: 'active', owner, includes: [], rules: permissions.map((permissionId, i) => ({ id: `allow-${i}`, permissionId, effect: 'allow', scope })) },
    { kind: 'role', id: 'role-a', key: 'role-a', name: 'Role', status: 'active', owner, permissionSets: [{ id: 'set-a' }] },
    { kind: 'role-assignment', id: 'assignment', userId: 'user-a', roleId: 'role-a', status: 'active', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null }];
  const definitions = new SecurityDefinitionService(store);
  const setRecords = () => { const staged = definitions.stage({ changes: records.map(definition => ({ document: { format: 'ui-platform.security', formatVersion: 1, definition } as SecurityDocument })), expectedRevision: store.revision(), source: 'api', actorId: 'local-setup', idempotencyKey: String(Date.now()) }); expect(staged.diagnostics).toEqual([]); expect(definitions.activate(staged.id, staged.checksum, 'local-setup').status).toBe('activated'); };
  setRecords();
  let revision = 'r1';
  const resources = { async revision() { return revision; }, async resolve(ref: any) {
    if (JSON.stringify(ref) === JSON.stringify(rootResource)) return { ref, status: 'active' as const };
    if (ref.authorityId !== 'resources' || ref.applicationId !== 'app-a') return undefined;
    if (ref.kind === 'application' && ref.id === 'app-a') return { ref, parent: rootResource, status: 'active' as const };
    if (ref.kind === 'dataset' && ref.id === 'ds-a') return { ref, parent: app, status: 'active' as const };
    if (ref.kind === 'field' && ref.parentId === 'ds-a' && ['id', 'name', 'total', 'secret'].includes(ref.id)) return { ref, parent: dataset, status: 'active' as const };
    if (['page', 'artifact'].includes(ref.kind) && ref.parentId === 'app-a') return { ref, parent: app, status: 'active' as const };
  }, async bindDataset(applicationId: string, datasetId: string) {
    if (applicationId !== 'app-a' || datasetId !== 'ds-a') throw new Error('DATASET_RESOURCE_UNKNOWN');
    return { resource: dataset, environmentId: 'isolated', schemaVersion: 1, schemaDigest: 'schema-a', registryRevision: revision, physical: { appId: 'app-a', dataset: 'inventory' }, fields: ['id', 'name', 'total', 'secret'].map(fieldId => ({ fieldId, key: fieldId })) };
  } };
  const policy = { async read() { const snapshot = store.snapshot(); return { revision: String(snapshot.revision), documents: snapshot.documents }; } };
  const iam = currentIam(policy, resources, directory, async () => true);
  const planner = new DatasetSecurityPlanService(resources, iam.evaluator, policy, iam.identity, { operation: op => `p-${op}`, field: usage => `p-${usage}` }, iam.plannerCapability);
  return { orm, triggers, resources, iam, planner, records, store, definitions, setRecords, changeResource() { revision += 'x'; } };
}

it('frozen snapshot A executes Form/calculation/query/delete through real DOE and I-AM after authoring B; forged/stale/schema/ownership and current-policy denials preserve rows', async () => {
  const f = await directory(), data = await datasetFixture(f.root, f.directory);
  const authoring = path.join(f.root, 'authoring'), composition = path.join(f.root, 'app/presentation/versions/v1/composition');
  await mkdir(path.join(authoring, 'src/pages'), { recursive: true });
  const metadata: any = { schemaVersion: 1, artifactId: 'form-artifact', componentId: 'cmp_platform_inventory', kind: 'component', name: 'inventory', displayName: 'Inventory',
    form: { contractVersion: 1, node: 'form', datasetId: 'ds-a', primaryKey: 'id', submit: { service: 'dataset.write', readService: 'dataset.read' }, fields: [
      { id: 'name', node: 'name', key: 'name', datasetFieldId: 'name', type: 'string', datasetRequired: true, required: true, editable: true },
      { id: 'total', node: 'total', key: 'total', datasetFieldId: 'total', type: 'string', calculation: { persist: true, expression: { version: 1, expression: { kind: 'operator', operator: 'concat', args: [{ kind: 'field', fieldId: 'name' }, { kind: 'literal', value: '-A' }] } } } } ] },
    onLoad: [{ kind: 'service', reference: 'dataset.read', input: { literal: { datasetId: 'ds-a', select: ['id', 'name', 'total'] } } }, { kind: 'record-delete', version: 1, datasetId: 'ds-a', primaryFieldId: 'id', recordId: 'local.selection', resultState: 'deleted' }] };
  await writeFile(path.join(authoring, 'src/pages/inventory.visual.json'), JSON.stringify(metadata));
  await writeFile(path.join(authoring, 'src/pages/inventory.html'), '<section data-uip-node="content">Inventory</section>');
  await copyCompositionSnapshot(authoring, composition);
  let selected = await inspectPublishedComposition(composition, 'app-a', 'release-a', 'schema-a'), schema = 'schema-a';
  const contracts = new ReleasedContracts({ async read() { return selected; } }, async (app, identity) => app === 'app-a' && identity === schema);
  const engine = contracts.createEngine(data.orm, data.resources, data.planner, data.triggers);
  const actor = { enrollment: f.enrollment, sessionId: 'local-session', releaseId: 'release-a' }, lease = await data.iam.lease(actor); cleanup.push(() => lease.close());
  const trusted = { context: lease.context, actor: { type: 'user' as const, userId: 'user-a' }, authorityId: 'resources', applicationId: 'app-a', source: { type: 'api' as const } };
  const execute = (contract: string, values: any, extra = {}) => contracts.execute(engine, trusted, { releaseId: 'release-a', artifactId: 'form-artifact', contract, values, ...extra }, async () => data.iam.authorize(lease.context, 'ui.artifact.view', { authorityId: 'resources', applicationId: 'app-a', kind: 'artifact', id: 'cmp_platform_inventory', parentId: 'app-a' }));
  metadata.form.fields[1].calculation.expression.expression.args[1].value = '-B'; await writeFile(path.join(authoring, 'src/pages/inventory.visual.json'), JSON.stringify(metadata));
  const firstWrite = await execute('form', { operation: 'create', record: { id: 'one', name: 'Ada' } }); expect(firstWrite, JSON.stringify(firstWrite)).toMatchObject({ committed: true, success: true });
  expect(await execute('onLoad:0', {})).toEqual([{ id: 'one', name: 'Ada', total: 'Ada-A' }]);
  expect(await execute('form-read', { recordId: 'one' })).toEqual([{ id: 'one', name: 'Ada', total: 'Ada-A' }]);
  for (const extra of [{ actor: 'administrator' }, { definitions: metadata }, { releaseId: 'stale-release' }, { artifactId: 'foreign-artifact' }]) await expect(execute('onLoad:0', {}, extra)).rejects.toThrow();
  await expect(execute('onLoad:0', { select: ['secret'] })).rejects.toThrow(); await expect(execute('form', { operation: 'create', record: { id: 'empty', name: '' } })).rejects.toThrow();
  schema = 'changed'; await expect(execute('onLoad:0', {})).rejects.toThrow(); schema = 'schema-a';
  const before = await data.orm.query({ resource: { appId: 'app-a', dataset: 'inventory' } });
  const set = data.records.find(r => r.kind === 'permission-set') as any;
  set.rules.push({ id: 'hide-name', permissionId: 'p-read', effect: 'deny', scope: { resource: { authorityId: 'resources', applicationId: 'app-a', kind: 'dataset', id: 'ds-a' }, descendants: true }, fields: ['name'] });
  // Restaging uses expected checksums for existing records, as production WP1 requires.
  const { securityChecksum } = await import('@ui-platform/i-am/definitions');
  const update = () => { const changes = data.records.map(definition => { const previous = data.store.documents().find(d => d.definition.id === definition.id); return { document: { format: 'ui-platform.security', formatVersion: 1, definition } as SecurityDocument, ...(previous ? { expectedChecksum: securityChecksum(previous) } : {}) }; }); const staged = data.definitions.stage({ changes, expectedRevision: data.store.revision(), actorId: 'local-setup', source: 'api', idempotencyKey: String(Date.now()) }); expect(staged.diagnostics).toEqual([]); expect(data.definitions.activate(staged.id, staged.checksum, 'local-setup').status).toBe('activated'); };
  update(); const visible = await execute('onLoad:0', {}); expect(visible).toEqual([{ id: 'one', total: 'Ada-A' }]);
  set.rules.pop();
  set.rules.push({ id: 'hide-row', permissionId: 'p-read', effect: 'deny', scope: { resource: { authorityId: 'resources', applicationId: 'app-a', kind: 'dataset', id: 'ds-a' }, descendants: true }, where: { op: 'eq', left: { kind: 'field', fieldId: 'name' }, right: { kind: 'literal', value: 'Ada' } } });
  update(); expect(await execute('onLoad:0', {})).toEqual([]); set.rules.pop();
  (data.records.find(r => r.kind === 'role-assignment') as any).status = 'inactive'; update();
  await expect(execute('onLoad:0', {})).rejects.toThrow(); expect(await data.orm.query({ resource: { appId: 'app-a', dataset: 'inventory' } })).toEqual(before);
  (data.records.find(r => r.kind === 'role-assignment') as any).status = 'active'; update();
  const originalSelection = selected;
  data.triggers.registerHandler('stage5-release-race', async () => { selected = { ...originalSelection, releaseId: 'release-race' }; });
  await data.triggers.create({ id: 'release-race', appId: 'app-a', dataset: 'inventory', phase: 'beforeInsert', handlerId: 'stage5-release-race', enabled: true, name: 'Disposable release pointer race' });
  expect(await execute('form', { operation: 'create', record: { id: 'raced', name: 'Grace' } })).toMatchObject({ committed: false });
  selected = originalSelection;
  expect(await data.orm.query({ resource: { appId: 'app-a', dataset: 'inventory' } })).toEqual(before);
  expect(await execute('onLoad:1', { recordId: 'one' })).toMatchObject({ committed: true });
  selected = { ...selected, releaseId: 'release-b' }; await expect(execute('onLoad:0', {})).rejects.toThrow();
  await mkdir('evidence/v1-stage5-local', { recursive: true }); await writeFile('evidence/v1-stage5-local/release-results.json', JSON.stringify({ environment: 'isolated Windows; snapshot primitive and actual DOE/I-AM; fixture schema binding', release: 'release-a', schema: 'schema-a', afterDraftB: 'Ada-A', currentFieldDenial: 'name omitted', currentRoleRevocation: 'denied', delete: 'committed', productionQualification: false }, null, 2));
});

it('browser service adapter keeps existing Form signatures while sending only release locators and values, with no actor/definition claims', async () => {
  const calls: any[] = [];
  const metadata: any = { artifactId: 'form-a', form: { datasetId: 'ds-a', primaryKey: 'id' } };
  const services = releasedRuntimeServices({ releaseId: 'release-a', metadata, request: (async (url: string, init?: RequestInit) => {
    if (url === '/auth/session') return Response.json({ csrf: 'local-csrf-fixture' });
    calls.push(JSON.parse(String(init?.body))); return Response.json({ success: true });
  }) as typeof fetch });
  await services['dataset.write']({ datasetId: 'ds-a', operation: 'insert', records: [{ name: 'Ada' }] });
  await services['dataset.read']({ datasetId: 'ds-a', where: { field: 'id', op: 'eq', value: 'one' } });
  expect(calls).toEqual([{ releaseId: 'release-a', artifactId: 'form-a', contract: 'form', values: { operation: 'create', record: { name: 'Ada' } } }, { releaseId: 'release-a', artifactId: 'form-a', contract: 'form-read', values: { recordId: 'one' } }]);
  await expect(services['dataset.write']({ datasetId: 'foreign', operation: 'insert', records: [{}] })).rejects.toThrow();
});

it('Data HTTP composition connects mTLS assertions, current I-AM and release authority and denies raw/development/management bypass routes', async () => {
  const f = await directory(), data = await datasetFixture(f.root, f.directory), tls = await tlsFiles(f.root), keys = await generateKeyPair('EdDSA');
  const composition = path.join(f.root, 'app/presentation/versions/v1/composition'); await mkdir(composition, { recursive: true });
  await writeFile(path.join(composition, 'page.visual.json'), JSON.stringify({ schemaVersion: 1, artifactId: 'page-a', kind: 'page', name: 'page-a', displayName: 'Page', onLoad: [{ kind: 'service', reference: 'dataset.read', input: { literal: { datasetId: 'ds-a', select: ['id', 'name'] } } }] }));
  const admission = await inspectPublishedComposition(composition, 'app-a', 'release-a', 'schema-a');
  const contracts = new ReleasedContracts({ async read() { return admission; } }, async () => true), engine = contracts.createEngine(data.orm, data.resources, data.planner, data.triggers);
  const verifier = new InternalVerifier('data-instance', [{ issuer: 'runtime', keyId: 'runtime', publicKey: keys.publicKey, certificateFingerprint: new X509Certificate(tls.client.cert).fingerprint256, applications: ['app-a'] }], f.directory, async () => true);
  const handler = protectedDataHandler({ authorityId: 'resources', verifier, iam: data.iam, contracts, engine, assets: new PrivateAssets(f.root, async () => undefined) });
  const port = await listen(httpsServer({ ...tls, requestCert: true, rejectUnauthorized: true }, handler));
  const transport = new MtlsRuntimeTransport(`https://127.0.0.1:${port}/`, tls.client, new InternalSigner('runtime', 'runtime', keys.privateKey, 'data-instance'));
  const actor = { enrollment: f.enrollment, sessionId: 'local-session', releaseId: 'release-a' };
  const value = { releaseId: 'release-a', artifactId: 'page-a', contract: 'onLoad:0', values: {} };
  const good = await transport.send(actor, '/runtime/execute', Buffer.from(JSON.stringify(value)), req('/runtime/execute', {}, 'POST')); expect(good.status).toBe(200); expect(JSON.parse(good.bytes.toString())).toEqual([]);
  const forged = await transport.send(actor, '/runtime/execute', Buffer.from(JSON.stringify({ ...value, actor: 'administrator' })), req('/runtime/execute', {}, 'POST')); expect(forged.status).toBe(403);
  await expect(transport.send(actor, '/management/app-a/security/stage', Buffer.from('{}'), req('/', {}, 'POST'))).rejects.toThrow();
  const foreign = await transport.send({ ...actor, enrollment: { ...f.enrollment, applicationId: 'app-b' } }, '/runtime/execute', Buffer.from(JSON.stringify(value)), req('/', {}, 'POST')); expect(foreign.status).toBe(403);
  f.enabled.value = false; const disabled = await transport.send(actor, '/runtime/execute', Buffer.from(JSON.stringify(value)), req('/', {}, 'POST')); expect(disabled.status).toBe(403);
});

it('internal management adapter uses current I-AM and WP3 staging and rejects actor injection, wrong enrollment and public/raw routes (authenticated seam fixture)', async () => {
  const f = await directory(), data = await datasetFixture(f.root, f.directory);
  const actor = { enrollment: f.enrollment, sessionId: 'management-session', releaseId: 'management-release' };
  const administration = new SecurityAdministrationService(data.definitions, data.iam.evaluator, data.iam.administrationIdentity,
    { async verify() { throw new Error('RECOVERY_NOT_AUTHORIZED'); } }, { contains(a, b) { return JSON.stringify(a.resource) === JSON.stringify(b.resource) && (a.descendants || !b.descendants); }, permitsPredicate() { return false; } },
    { resourceAuthorityId: 'resources', systemResourceId: 'system', platformAdministratorPermissionId: 'platform-admin', recoveryCapabilityId: 'recovery', deploymentId: 'isolated' });
  const verifier = { async authenticate() { return actor; } } as unknown as InternalVerifier;
  const port = await listen(createServer(managementSecurityHandler({ authorityId: 'resources', systemResourceId: 'system', managementApplicationId: 'app-a', iam: data.iam, verifier, administration,
    applicationAdministratorPermissionId: 'ui.application.security.admin', platformAdministratorPermissionId: 'platform-admin' })));
  const base = `http://127.0.0.1:${port}`, input = { changes: [], expectedRevision: data.store.revision(), reason: 'local adapter verification' };
  const post = (url: string, value: unknown) => fetch(base + url, { method: 'POST', body: JSON.stringify(value) });
  const good = await post('/management/app-a/security/stage', input); expect(good.status).toBe(200); expect((await good.json()).id).toBeTruthy();
  expect((await post('/management/app-a/security/stage', { ...input, actorId: 'administrator' })).status).toBe(403);
  expect((await post('/management/app-b/security/stage', input)).status).toBe(403);
  expect((await post('/api/apps', input)).status).toBe(404);
  actor.enrollment = { ...f.enrollment, applicationId: 'foreign-management' }; expect((await post('/management/app-a/security/stage', input)).status).toBe(403);
});

it('private metadata/thumbnail/download/ranges recheck authority and deny guessed/foreign/revoked/encoded/static paths; real browser observes runtime route separation', async () => {
  const f = await directory(), tls = await tlsFiles(f.root), privateRoot = path.join(f.root, 'private'); await mkdir(privateRoot);
  const privateBytes = Buffer.from('PRIVATE-STAGE5-BYTES'); await writeFile(path.join(privateRoot, 'version.bin'), privateBytes);
  let allowed = true;
  const assets = new PrivateAssets(privateRoot, async (app, id, version) => app === 'app-a' && id === 'private-a' && version === 'v1' ? { applicationId: app, id, version, name: 'Private', mediaType: 'application/octet-stream', bytes: { file: 'version.bin', sha256: digest(privateBytes) }, thumbnail: { file: 'version.bin', sha256: digest(privateBytes) } } : undefined);
  const sessions = new SecureSessions('app-a', 'client-a', 'https://localhost', f.directory), issued = await sessions.issue(f.enrollment);
  const headers = { cookie: `${sessions.cookieName}=${issued.token}` };
  const assetServer = createServer(async (request, response) => {
    const match = /^\/([a-z-]+)\/(metadata|thumbnail|download)$/.exec(request.url ?? '');
    if (!match) { response.writeHead(404).end(); return; }
    await assets.reply(request, response, 'app-a', match[1]!, 'v1', match[2] as any, async () => { await sessions.read(request); if (!allowed) throw new Error('DENIED'); return async () => { await sessions.read(request); if (!allowed) throw new Error('DENIED'); }; });
  }); const port = await listen(assetServer), base = `http://127.0.0.1:${port}`;
  for (const variant of ['metadata', 'thumbnail', 'download']) {
    expect((await fetch(`${base}/private-a/${variant}`)).status).toBe(403);
    const good = await fetch(`${base}/private-a/${variant}`, { headers }); expect(good.status).toBe(200); expect(good.headers.get('cache-control')).toBe('private, no-store');
    allowed = false; const revoked = await fetch(`${base}/private-a/${variant}`, { headers: { ...headers, range: 'bytes=0-3', 'if-none-match': 'guessed' } }); expect(revoked.status).toBe(403); expect(await revoked.text()).not.toContain('PRIVATE-STAGE5'); allowed = true;
  }
  const range = await fetch(base + '/private-a/download', { headers: { ...headers, range: 'bytes=0-6' } }); expect(range.status).toBe(206); expect(await range.text()).toBe('PRIVATE');
  expect((await fetch(base + '/guessed/download', { headers })).status).toBe(403);
  const suffix = await fetch(base + '/private-a/download', { headers: { ...headers, range: 'bytes=-5' } }); expect(await suffix.text()).toBe('BYTES');
  const invalid = await fetch(base + '/private-a/download', { headers: { ...headers, range: 'bytes=99-100' } }); expect(invalid.status).toBe(416);
  const login = { async start() { throw new Error('REAL_PROVIDER_NOT_CONFIGURED'); }, async finish() { throw new Error('REAL_PROVIDER_NOT_CONFIGURED'); } } as OidcLogin;
  const publicBytes = Buffer.from('<!doctype html><title>Stage 5 isolated runtime</title><h1>Public runtime</h1>');
  let forwarded = 0;
  const runtime = httpsServer(tls, runtimeHandler({ sessions, login, selected: async () => ({ releaseId: 'release-a', publicFiles: new Map([['/', { bytes: publicBytes, sha256: digest(publicBytes), mediaType: 'text/html' }]]) }), transport: { async send() { forwarded++; return { status: 403, headers: {}, bytes: Buffer.from('denied') }; } } }));
  const runtimePort = await listen(runtime), runtimeUrl = `https://127.0.0.1:${runtimePort}`;
  const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
  const browser = await playwright.chromium.launch({ headless: true, channel: 'msedge' }); cleanup.push(() => browser.close());
  const context = await browser.newContext({ ignoreHTTPSErrors: true }), page = await context.newPage(); await page.goto(runtimeUrl); expect(await page.title()).toBe('Stage 5 isolated runtime');
  for (const route of ['/api/apps', '/api/downloads/source.zip', '/api/development-identity/session', '/api/application-data/queries', '/private/version.bin', '/assets/private-a', '/runtime/assets/%2e%2e/v1/download']) {
    const result = await context.request.get(runtimeUrl + route); expect(result.status()).toBeGreaterThanOrEqual(400); expect(await result.text()).not.toContain('PRIVATE-STAGE5');
  }
  expect((await context.request.post(runtimeUrl + '/runtime/execute', { data: { actor: 'administrator' }, headers: { 'x-actor': 'administrator' } })).status()).toBe(403); expect(forwarded).toBe(0);
  await mkdir('evidence/v1-stage5-local', { recursive: true }); await page.screenshot({ path: 'evidence/v1-stage5-local/runtime-browser.png' });
  await writeFile('evidence/v1-stage5-local/private-results.json', JSON.stringify({ environment: 'real Windows loopback HTTP asset handler and HTTPS runtime; ephemeral local CA', provider: 'none', publicStatus: 200, anonymousPrivateStatus: 403, revokedStatus: 403, rangeStatus: 206, suffix: 'verified', invalidRange: 416, managementRoutes: 'denied', forwardedSpoofedRequests: forwarded, publicBundleContainsPrivateBytes: publicBytes.includes(privateBytes), productionQualification: false }, null, 2));
}, 90_000);

it('separate runtime/Data/management processes refuse public management forwarding and enforce a disposable runtime filesystem capability boundary', async () => {
  const root = await temporary(), publicRoot = path.join(root, 'public'), privateRoot = path.join(root, 'private');
  await mkdir(publicRoot); await mkdir(privateRoot);
  const publicFile = path.join(publicRoot, 'index.html'), privateFile = path.join(privateRoot, 'bytes.bin');
  await writeFile(publicFile, '<h1>Public process</h1>'); await writeFile(privateFile, 'PRIVATE-PROCESS-BYTES');
  const worker = path.join(publicRoot, 'worker.mjs');
  await build({ entryPoints: ['tests/fixtures/stage5-process.ts'], bundle: true, platform: 'node', format: 'esm', outfile: worker, logLevel: 'silent' });
  const processes: any[] = [];
  for (const kind of ['runtime', 'data', 'management']) {
    const args = kind === 'runtime' ? ['--permission', `--allow-fs-read=${publicRoot}`] : [];
    const child = spawn(process.execPath, [...args, worker, kind, publicFile, privateFile], { cwd: root, env: { ...process.env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    cleanup.push(async () => { if (child.exitCode === null) { const done = new Promise<void>(r => child.once('exit', () => r())); child.kill(); await done; } });
    const info = await new Promise<any>((resolve, reject) => { let out = '', err = ''; const timeout = setTimeout(() => reject(new Error('PROCESS_START_TIMEOUT')), 15_000); child.stdout!.on('data', b => { out += String(b); if (out.includes('\n')) { clearTimeout(timeout); resolve(JSON.parse(out.split('\n')[0]!)); } }); child.stderr!.on('data', b => { err += String(b); }); child.once('exit', code => { clearTimeout(timeout); reject(new Error(`PROCESS_START_FAILED ${code}: ${err}`)); }); });
    processes.push(info);
  }
  expect(new Set(processes.map(p => p.pid)).size).toBe(3);
  const runtime = `http://127.0.0.1:${processes[0].port}`, data = `http://127.0.0.1:${processes[1].port}`, management = `http://127.0.0.1:${processes[2].port}`;
  expect((await fetch(runtime)).status).toBe(200); expect(processes[0].privateReadDenied).toBe(true);
  expect((await fetch(management + '/management/health')).status).toBe(200);
  for (const route of ['/management/health', '/api/apps', '/api/downloads/x.zip', '/private/bytes.bin']) expect((await fetch(runtime + route)).status).toBe(404);
  expect((await fetch(data + '/private-a/download')).status).toBe(403);
  await mkdir('evidence/v1-stage5-local', { recursive: true }); await writeFile('evidence/v1-stage5-local/process-boundaries.json', JSON.stringify({ processes, actualOs: process.platform, filesystemBoundary: 'Node 24 runtime permission model; same Windows OS user', runtimePublic: 200, runtimeManagement: 404, dataAnonymous: 403, productionOsAccountIsolation: 'UNVERIFIED' }, null, 2));
}, 60_000);
