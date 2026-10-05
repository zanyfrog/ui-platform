import { afterEach, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createHash } from 'node:crypto';
import { createApplicationDataProxy } from '../src/server/application-data-proxy.js';
import { createDevelopmentActorProvider } from '@ui-platform/dataset-operations';

const servers: Server[] = [];
afterEach(async () => { for (const server of servers.splice(0)) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
async function listen(handler: ReturnType<typeof createApplicationDataProxy>) {
  const server = createServer((request, response) => { void handler(request, response).then(handled => { if (!handled) response.writeHead(404).end(); }); });
  servers.push(server); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('LISTEN_FAILED');
  return `http://127.0.0.1:${address.port}`;
}

it('refuses production, missing configuration, missing credentials and unsafe host URLs', async () => {
  expect(() => createApplicationDataProxy({ enabled: true, environment: 'development', protectedHostUrl: 'http://example.com/' })).toThrow();
  expect(() => createApplicationDataProxy({ enabled: true, environment: 'development', protectedHostUrl: 'http://127.0.0.1:4103/queries' })).toThrow();
  const production = await listen(createApplicationDataProxy({ enabled: true, environment: 'production', protectedHostUrl: 'http://127.0.0.1:4103/' }));
  expect((await fetch(production + '/api/application-data/queries', { method: 'POST', body: '{}' })).status).toBe(404);
  const missing = await listen(createApplicationDataProxy({ enabled: true, environment: 'development' }));
  expect((await fetch(missing + '/api/application-data/queries', { method: 'POST', body: '{}' })).status).toBe(503);
  const configured = await listen(createApplicationDataProxy({ enabled: true, environment: 'development', protectedHostUrl: 'http://127.0.0.1:4103/' }));
  expect((await fetch(configured + '/api/application-data/queries', { method: 'POST', body: '{}' })).status).toBe(403);
  expect((await fetch(configured + '/api/application-data/queries', { method: 'GET', headers: { authorization: 'Bearer token' } })).status).toBe(403);
});

it('forwards only a server-issued assertion for the session User', async () => {
  const documents = [{ format: 'ui-platform.security', formatVersion: 1,
    definition: { kind: 'user', id: 'stable-session-user', displayName: 'User', status: 'active' } }];
  const policyDigest = `sha256:${createHash('sha256').update(JSON.stringify(documents)).digest('hex')}`;
  const key = 'development-ui-server-assertion-key-42';
  const provider = createDevelopmentActorProvider({ enabled: true, token: 'legacy-token-with-at-least-24-characters',
    userId: 'fixed-user', applicationId: 'fixture-app', authorityId: 'fixture-authority',
    trustedUiServerKey: key, allowLegacyToken: false }, { async read() { return { revision: '1', documents }; } }, 'development');
  const upstream = createServer(async (request, response) => {
    try { const trusted = await provider.authenticate(request); response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(trusted.actor)); }
    catch { response.writeHead(401).end(); }
  });
  servers.push(upstream); await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const port = (upstream.address() as { port: number }).port;
  let currentUser: string | null = 'stable-session-user';
  const origin = 'http://localhost:5174';
  const proxy = await listen(createApplicationDataProxy({ enabled: true, environment: 'development', protectedHostUrl: `http://127.0.0.1:${port}/`,
    v1Identity: { resolveUser: () => currentUser, trustedUiServerKey: key, applicationId: 'fixture-app',
      authorityId: 'fixture-authority', policyDigest: () => policyDigest, origins: [origin] } }));
  const post = (headers: Record<string, string>) => fetch(proxy + '/api/application-data/queries', { method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers }, body: '{}' });
  const allowed = await post({});
  expect(allowed.status).toBe(200);
  expect(await allowed.json()).toEqual({ type: 'user', userId: 'stable-session-user' });
  expect((await post({ authorization: 'Bearer legacy-token-with-at-least-24-characters' })).status).toBe(403);
  currentUser = null;
  expect((await post({})).status).toBe(401);
});
