import http from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { discoverApps, createApp, getApp, saveSettings, appPath } from './applications.js';
import { discoverTemplates, getTemplate } from './templates.js';
import { moveToOsTrash } from './trash.js';
import { ensurePreview, stopAllPreviews, stopPreview } from './preview.js';
import { exportApp } from './exporter.js';
import { appendHistory } from './history.js';
import { startWorkspaceWatcher } from './watcher.js';
import { startApplicationArtifactWatchers } from './artifact-watcher.js';
import { appsDir, runtimeDir } from './paths.js';
import { deletePageSource, getPageSource, getPageTree, movePageSource, savePageSource } from './page-builder.js';
import { discoverComponents, getAppPackageAsset } from './component-registry.js';
import { disableAppPackage, enableAppPackage, getAppPackageCatalog, getGlobalPackageCatalog } from './packages.js';
import { installManualPackage } from './package-installer.js';
import { addAppFoundationDependencies, getAppFoundationDependencies, installGitHubFoundationSource, listFoundationSources, migrateFoundationSourceUpdate, previewFoundationSourceUpdate, refreshFoundationSource } from './foundation-sources.js';
import { getUnifiedPackageCatalog, removeUnusedFoundationSource } from './unified-package-catalog.js';
import { acquirePackageFromUrl } from './package-acquisition.js';
import { getActivePresentationCss, getApplicationPresentation, getDraftPresentationCss, getPresentationAssetPath, initializeApplicationPresentation, publishPresentation, removePresentationAsset, rollbackPresentation, savePresentationDraft, uploadPresentationAsset } from './application-presentation.js';

const port = Number(process.env.UI_PLATFORM_API_PORT ?? 4090);
const sseClients = new Set<http.ServerResponse>();

function json(res: http.ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function body(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 100 * 1024 * 1024) throw new Error('Package upload exceeds the 100 MB limit.');
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  const value = Buffer.concat(chunks);
  const contentType = req.headers['content-type'] ?? '';
  if (contentType.startsWith('multipart/form-data')) return parseMultipart(value, contentType);
  return JSON.parse(value.toString('utf8'));
}

interface UploadedFile { name: string; filename: string; content: Buffer; }
interface MultipartBody { fields: Record<string, string>; files: Record<string, UploadedFile>; }

function parseMultipart(payload: Buffer, contentType: string): MultipartBody {
  const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/.exec(contentType)?.[1] ?? /boundary=(?:"([^"]+)"|([^;\s]+))/.exec(contentType)?.[2];
  if (!boundary) throw new Error('Package upload is missing a multipart boundary.');
  const marker = Buffer.from('--' + boundary);
  const separator = Buffer.from('\r\n\r\n');
  const result: MultipartBody = { fields: {}, files: {} };
  let start = payload.indexOf(marker) + marker.length;
  while (start >= marker.length && start < payload.length) {
    if (payload.subarray(start, start + 2).equals(Buffer.from('--'))) break;
    if (payload.subarray(start, start + 2).equals(Buffer.from('\r\n'))) start += 2;
    const headersEnd = payload.indexOf(separator, start);
    if (headersEnd < 0) break;
    const headers = payload.subarray(start, headersEnd).toString('utf8');
    const next = payload.indexOf(marker, headersEnd + separator.length);
    if (next < 0) break;
    const content = payload.subarray(headersEnd + separator.length, next - 2);
    const disposition = /content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
    if (disposition) {
      const [, name, filename] = disposition;
      if (filename) result.files[name] = { name, filename: path.basename(filename), content };
      else result.fields[name] = content.toString('utf8');
    }
    start = next + marker.length;
  }
  return result;
}

async function acquirePackage(input: MultipartBody | Record<string, unknown>, scope: 'platform' | 'app', appKey?: string): Promise<unknown> {
  const multipart = isMultipartBody(input) ? input : null;
  const sourceUrl = String(multipart ? multipart.fields.sourceUrl ?? '' : (input as Record<string, unknown>).sourceUrl ?? '').trim();
  const uploaded = multipart?.files.packageFile;
  if (uploaded?.content.length) {
    const uploadRoot = path.join(runtimeDir, 'package-uploads', crypto.randomUUID());
    const uploadPath = path.join(uploadRoot, uploaded.filename || 'package-upload.zip');
    await mkdir(uploadRoot, { recursive: true });
    try {
      await writeFile(uploadPath, uploaded.content);
      return { kind: 'package', package: await installManualPackage({ sourcePath: uploadPath, scope, appKey }) };
    } finally {
      await rm(uploadRoot, { recursive: true, force: true });
    }
  }
  if (!sourceUrl) throw new Error('Upload a package archive or provide a GitHub or npm URL.');
  return acquirePackageFromUrl(sourceUrl, { scope, appKey });
}

function isMultipartBody(input: MultipartBody | Record<string, unknown>): input is MultipartBody {
  return 'fields' in input && 'files' in input && typeof input.fields === 'object' && input.fields !== null && typeof input.files === 'object' && input.files !== null;
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
    if (url.pathname === '/api/packages' && method === 'GET') return json(res, 200, await getGlobalPackageCatalog());
    if (url.pathname === '/api/package-catalog' && method === 'GET') return json(res, 200, await getUnifiedPackageCatalog());
    if (url.pathname === '/api/packages/install' && method === 'POST') {
      const input = await body(req);
      return json(res, 201, await installManualPackage({ sourcePath: String(input.sourcePath ?? ''), scope: 'platform' }));
    }
    if (url.pathname === '/api/packages/acquire' && method === 'POST') return json(res, 201, await acquirePackage(await body(req), 'platform'));
    if (url.pathname === '/api/foundation-sources' && method === 'GET') return json(res, 200, await listFoundationSources());
    if (url.pathname === '/api/foundation-sources/github' && method === 'POST') {
      const input = await body(req);
      return json(res, 201, await installGitHubFoundationSource({ repository: String(input.repository ?? ''), ref: input.ref ? String(input.ref) : undefined }));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 4 && parts[3] === 'refresh' && method === 'POST') {
      return json(res, 200, await refreshFoundationSource(decodeURIComponent(parts[2])));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 4 && parts[3] === 'update-preview' && method === 'POST') {
      const input = await body(req);
      return json(res, 200, await previewFoundationSourceUpdate(decodeURIComponent(parts[2]), input.ref ? String(input.ref) : undefined));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 4 && parts[3] === 'migrations' && method === 'POST') {
      const input = await body(req);
      const appKeys = Array.isArray(input.appKeys) ? input.appKeys.map((value: unknown) => String(value)) : [];
      return json(res, 200, await migrateFoundationSourceUpdate(String(input.planId ?? ''), appKeys));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 3 && method === 'DELETE') {
      await removeUnusedFoundationSource(decodeURIComponent(parts[2]));
      return json(res, 200, { removed: true });
    }

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
      if (parts.length === 4 && parts[3] === 'presentation' && method === 'GET') return json(res, 200, await getApplicationPresentation(key));
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'initialize' && method === 'POST') return json(res, 201, await initializeApplicationPresentation(key));
      if (parts.length === 4 && parts[3] === 'presentation' && method === 'PUT') return json(res, 200, await savePresentationDraft(key, await body(req)));
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'publish' && method === 'POST') return json(res, 200, await publishPresentation(key));
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'rollback' && method === 'POST') {
        const input = await body(req);
        return json(res, 200, await rollbackPresentation(key, Number(input.version)));
      }
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'active.css' && method === 'GET') {
        const css = await getActivePresentationCss(key);
        if (css === null) return json(res, 404, { error: 'No active presentation version.' });
        res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(css);
      }
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'draft.css' && method === 'GET') {
        const css = await getDraftPresentationCss(key);
        if (css === null) return json(res, 404, { error: 'No presentation draft.' });
        res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
        return res.end(css);
      }
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'assets' && method === 'POST') {
        const input = await body(req);
        if (!isMultipartBody(input) || !input.files.asset) throw new Error('Upload an asset file using the asset field.');
        const file = input.files.asset;
        return json(res, 201, await uploadPresentationAsset(key, { id: String(input.fields.id ?? ''), name: String(input.fields.name ?? ''), type: String(input.fields.type ?? 'other') as any, alt: input.fields.alt, filename: file.filename, content: file.content }));
      }
      if (parts.length === 6 && parts[3] === 'presentation' && parts[4] === 'assets' && method === 'DELETE') return json(res, 200, await removePresentationAsset(key, decodeURIComponent(parts[5])));
      if (parts.length === 6 && parts[3] === 'presentation' && parts[4] === 'assets' && method === 'GET') {
        const file = await getPresentationAssetPath(key, decodeURIComponent(parts[5]));
        const info = await stat(file);
        const extension = path.extname(file).toLowerCase();
        const contentType = extension === '.svg' ? 'image/svg+xml' : extension === '.png' ? 'image/png' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.webp' ? 'image/webp' : extension === '.ico' ? 'image/x-icon' : 'application/octet-stream';
        res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store', 'content-length': String(info.size) });
        return createReadStream(file).pipe(res);
      }
      if (parts.length >= 6 && parts[3] === 'package-assets' && method === 'GET') {
        const packageName = decodeURIComponent(parts[4]);
        const modulePath = `./${decodeURIComponent(parts.slice(5).join('/'))}`;
        const asset = await getAppPackageAsset(key, packageName, modulePath);
        const info = await stat(asset.filePath);
        const contentType = asset.filePath.endsWith('.css') ? 'text/css; charset=utf-8' : asset.filePath.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/javascript; charset=utf-8';
        res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store', 'content-length': String(info.size) });
        return createReadStream(asset.filePath).pipe(res);
      }
      if (parts.length === 4 && parts[3] === 'packages' && method === 'GET') return json(res, 200, await getAppPackageCatalog(key));
      if (parts.length === 4 && parts[3] === 'packages' && method === 'POST') {
        const input = await body(req);
        return json(res, 201, await installManualPackage({ sourcePath: String(input.sourcePath ?? ''), scope: 'app', appKey: key }));
      }
      if (parts.length === 5 && parts[3] === 'packages' && parts[4] === 'acquire' && method === 'POST') return json(res, 201, await acquirePackage(await body(req), 'app', key));
      if (parts.length === 4 && parts[3] === 'foundation-dependencies' && method === 'POST') {
        const input = await body(req);
        const packageNames = Array.isArray(input.packageNames) ? input.packageNames.map((value: unknown) => String(value)) : [];
        return json(res, 200, await addAppFoundationDependencies({ appKey: key, sourceId: String(input.sourceId ?? ''), packageNames }));
      }
      if (parts.length === 5 && parts[3] === 'foundation-dependencies' && parts[4] && method === 'GET') {
        return json(res, 200, await getAppFoundationDependencies({ appKey: key, sourceId: decodeURIComponent(parts[4]) }));
      }
      if (parts.length === 6 && parts[3] === 'packages' && parts[5] === 'enable' && method === 'POST') {
        const input = await body(req);
        return json(res, 200, await enableAppPackage(key, decodeURIComponent(parts[4]), input.version ? String(input.version) : undefined));
      }
      if (parts.length === 6 && parts[3] === 'packages' && parts[5] === 'disable' && method === 'POST') {
        return json(res, 200, await disableAppPackage(key, decodeURIComponent(parts[4])));
      }
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

const artifactWatcher = await startApplicationArtifactWatchers(appsDir, event => {
  for (const client of sseClients) client.write(`event: artifact-change\ndata: ${JSON.stringify(event)}\n\n`);
});

server.listen(port, '0.0.0.0', () => console.log(`UI Platform API listening on http://localhost:${port}`));

async function shutdown() {
  stopWatcher();
  await artifactWatcher.close();
  stopAllPreviews();
  for (const client of sseClients) client.end();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
