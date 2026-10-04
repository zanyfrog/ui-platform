import { afterEach, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createApplicationDataProxy } from '../src/server/application-data-proxy.js';

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
