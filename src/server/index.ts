import http from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { discoverApps, createApp, getApp, saveSettings, appPath } from './applications.js';
import { discoverTemplates, getTemplate } from './templates.js';
import { moveToOsTrash } from './trash.js';
import { ensurePreview, stopAllPreviews, stopPreview } from './preview.js';
import { exportApp } from './exporter.js';
import { appendHistory } from './history.js';
import { startWorkspaceWatcher } from './watcher.js';
import { runtimeDir } from './paths.js';
import { deletePageSource, getPageSource, getPageTree, movePageSource, savePageSource } from './page-builder.js';
import { discoverComponents } from './component-registry.js';

const port = Number(process.env.UI_PLATFORM_API_PORT ?? 4090);
const sseClients = new Set<http.ServerResponse>();

function json(res: http.ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function body(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function error(res: http.ServerResponse, err: unknown): void {
  console.error(err);
  json(res, 500, { error: err instanceof Error ? err.message : String(err) });
}

function appInfoPayload(req: http.IncomingMessage, url: URL, app: Awaited<ReturnType<typeof getApp>>): Record<string, string> {
  const origin = url.searchParams.get('origin') || `http://${req.headers.host ?? `localhost:${port}`}`;
  const fullUrl = `${origin.replace(/\/$/, '')}/${app.key}`;
  const settings = app.settings as any;
  return {
    name: app.name || 'Not set',
    description: String(settings?.ui?.description || 'Not set'),
    siteTitle: String(settings?.ui?.title || app.name || 'Not set'),
    fullUrl,
    status: app.status,
    contactEmail: String(settings?.settings?.contactEmail || 'Not set'),
    theme: String(settings?.ui?.theme || 'Not set'),
  };
}

await mkdir(path.join(runtimeDir, 'exports'), { recursive: true });

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (url.pathname === '/api/health') return json(res, 200, { ok: true });
    if (url.pathname === '/api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write('event: ready\ndata: {}\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }
    if (url.pathname === '/api/templates' && method === 'GET') return json(res, 200, await discoverTemplates());
    if (url.pathname === '/api/apps' && method === 'GET') return json(res, 200, await discoverApps());
    if (url.pathname === '/api/apps' && method === 'POST') return json(res, 201, await createApp(await body(req)));
    if (url.pathname === '/api/components' && method === 'GET') return json(res, 200, await discoverComponents());

    if (parts[0] === 'api' && parts[1] === 'apps' && parts[2]) {
      const key = decodeURIComponent(parts[2]);
      if (parts.length === 3 && method === 'GET') {
        const app = await getApp(key);
        const template = await getTemplate(app.template).catch(() => null);
        return json(res, 200, { ...app, templateDefinition: template?.definition ?? null });
      }
      if (parts.length === 4 && parts[3] === 'info' && method === 'GET') {
        const app = await getApp(key);
        return json(res, 200, appInfoPayload(req, url, app));
      }
      if (parts.length === 4 && parts[3] === 'pages' && method === 'GET') return json(res, 200, await getPageTree(key));
      if (parts.length === 4 && parts[3] === 'pages' && method === 'POST') {
        const input = await body(req);
        if (!input.source || !input.destination) throw new Error('source and destination are required.');
        return json(res, 200, await movePageSource(key, String(input.source), String(input.destination)));
      }
      if (parts.length === 4 && parts[3] === 'components' && method === 'GET') return json(res, 200, await discoverComponents(key));
      if (parts.length === 4 && parts[3] === 'page' && method === 'GET') {
        const source = url.searchParams.get('source');
        if (!source) throw new Error('The source query parameter is required.');
        return json(res, 200, await getPageSource(key, source));
      }
      if (parts.length === 4 && parts[3] === 'page' && method === 'PUT') {
        const source = url.searchParams.get('source');
        if (!source) throw new Error('The source query parameter is required.');
        const input = await body(req);
        return json(res, 200, await savePageSource(key, source, String(input.source ?? ''), input.expectedHash ? String(input.expectedHash) : undefined));
      }
      if (parts.length === 4 && parts[3] === 'page' && method === 'DELETE') {
        const source = url.searchParams.get('source');
        if (!source) throw new Error('The source query parameter is required.');
        await deletePageSource(key, source);
        return json(res, 200, { removed: true, mode: 'os-trash' });
      }
      if (parts.length === 3 && method === 'DELETE') {
        stopPreview(key);
        const app = await getApp(key);
        await appendHistory(appPath(key), { action: 'app.deleted-to-os-trash', appId: app.appId, actor: 'local-user' });
        await moveToOsTrash(appPath(key));
        return json(res, 200, { removed: true, mode: 'os-trash' });
      }
      if (parts.length === 5 && parts[3] === 'app-services' && method === 'GET') {
        const name = path.basename(decodeURIComponent(parts[4]));
        const file = path.join(appPath(key), 'packages', 'app-services', 'dist', name);
        const info = await stat(file);
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'content-length': String(info.size) });
        return createReadStream(file).pipe(res);
      }
      if (parts[3] === 'settings' && method === 'PUT') return json(res, 200, await saveSettings(key, await body(req)));
      if (parts[3] === 'preview' && method === 'POST') return json(res, 200, await ensurePreview(key));
      if (parts[3] === 'export' && method === 'POST') {
        const exported = await exportApp(key);
        const token = path.basename(exported.zipFile);
        return json(res, 200, { downloadName: exported.downloadName, url: `/api/downloads/${encodeURIComponent(token)}` });
      }
    }

    if (parts[0] === 'api' && parts[1] === 'downloads' && parts[2] && method === 'GET') {
      const name = path.basename(decodeURIComponent(parts[2]));
      const file = path.join(runtimeDir, 'exports', name);
      const info = await stat(file);
      res.writeHead(200, { 'content-type': 'application/zip', 'content-length': String(info.size), 'content-disposition': `attachment; filename="${name}"` });
      return createReadStream(file).pipe(res);
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) { error(res, err); }
});

const stopWatcher = startWorkspaceWatcher(() => {
  for (const client of sseClients) client.write(`event: workspace-change\ndata: {"time":"${new Date().toISOString()}"}\n\n`);
});

server.listen(port, '0.0.0.0', () => console.log(`UI Platform API listening on http://localhost:${port}`));

function shutdown() {
  stopWatcher();
  stopAllPreviews();
  for (const client of sseClients) client.end();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
