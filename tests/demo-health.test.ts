import { afterEach, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { checkDemoHealth } from '../scripts/demo-health.mjs';

let server: Server | undefined;
afterEach(async () => { if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); server = undefined; } });

async function fixture(dependencyStatus = 200, adminStatus = 200) {
  const paths: string[] = [];
  server = createServer((req, res) => {
    const url = req.url ?? '/'; paths.push(url);
    if (url === '/api/health') { res.end('{"ok":true}'); return; }
    if (url === '/src/client/main.ts') { res.end('import "/deps/ui.js?v=fixture";'); return; }
    if (url.startsWith('/deps/')) { res.writeHead(dependencyStatus); res.end(dependencyStatus === 200 ? 'export {}' : 'Outdated Optimize Dep'); return; }
    if (url === '/demo/admin') { res.writeHead(adminStatus); res.end('Admin'); return; }
    if (url === '/' || url === '/demo/') { res.end('<!doctype html><title>Demo</title>'); return; }
    res.writeHead(404); res.end('Wrong URL');
  });
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, paths };
}

it('checks the correct demo-base Admin path and healthy development modules', async () => {
  const { origin, paths } = await fixture();
  expect(await checkDemoHealth(origin, origin, origin)).toEqual([]);
  expect(paths).toContain('/demo/admin');
  expect(paths).not.toContain('/admin');
});

it('rejects an HTTP-200 shell whose optimized dependencies return 504', async () => {
  const { origin } = await fixture(504);
  expect(await checkDemoHealth(origin, origin, origin)).toContain('Builder dependency ui.js?v=fixture: HTTP 504');
});

it('reports a broken Admin page even while the launcher and other pages are available', async () => {
  const { origin } = await fixture(200, 404);
  expect(await checkDemoHealth(origin, origin, origin)).toContain('Admin Application: HTTP 404');
});
