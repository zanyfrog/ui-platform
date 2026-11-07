import {step,event} from './private-access-trace.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { deny, digest, identifier, json } from './boundary.js';

export interface PrivateAssetVersion { applicationId: string; id: string; version: string; name: string; mediaType: string;
  bytes: { file: string; sha256: string }; thumbnail?: { file: string; sha256: string; mediaType?: 'image/png' | 'image/jpeg' | 'image/webp' } }
/** Hash/version transport over a Data-owned store outside any public/export root. */
export class PrivateAssets {
  constructor(private readonly root: string, private readonly lookup: (applicationId: string, id: string, version: string) => Promise<PrivateAssetVersion | undefined>) {
    if (!path.isAbsolute(root)) deny();
  }
  async reply(request: IncomingMessage, response: ServerResponse, applicationId: string, id: string, version: string, variant: 'metadata' | 'thumbnail' | 'download',
    authorize: () => Promise<() => Promise<void>>) {
    // Denial is uniform and has no hash, length, filename or conditional-cache result.
    try {
      if (!identifier(applicationId) || !identifier(id) || !identifier(version) || !['GET', 'HEAD'].includes(request.method ?? '')) deny();
      const check = await step('asset.authorize',authorize); await step('asset.current.first',check);
      const asset = await this.lookup(applicationId, id, version);
      if (!asset || asset.applicationId !== applicationId || asset.id !== id || asset.version !== version) deny();
      const selected = variant === 'thumbnail' ? asset.thumbnail : asset.bytes; if (!selected) deny();
      const file = path.resolve(this.root, selected!.file), root = await realpath(this.root);
      if (root !== path.resolve(this.root) || !file.startsWith(root + path.sep)) deny();
      for (let current = file; ; current = path.dirname(current)) {
        const info = await lstat(current); if (info.isSymbolicLink()) deny();
        if (path.dirname(current) === current) break;
      }
      const stat = await lstat(file); if (!stat.isFile() || stat.nlink !== 1 || stat.size > 20_000_000) deny();
      const bytes = await step('asset.bytes',()=>readFile(file)); if (digest(bytes) !== selected!.sha256) deny();
      await step('asset.current.repeat',check);
      if (variant === 'metadata') { json(response, 200, { id, version, name: asset.name, sha256: selected!.sha256, size: bytes.length }); return; }
      let start = 0, end = bytes.length - 1, partial = false;
      const range = request.headers.range;
      if (range !== undefined) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || !bytes.length || (!match[1] && !match[2])) { response.writeHead(416, { 'cache-control': 'private, no-store', vary: 'Cookie' }).end(); return; }
        if (!match[1]) { const suffix = Number(match[2]); if (!Number.isSafeInteger(suffix) || suffix <= 0) deny(); start = Math.max(0, bytes.length - suffix); }
        else { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end; }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length) { response.writeHead(416, { 'cache-control': 'private, no-store', vary: 'Cookie' }).end(); return; }
        partial = true;
      }
      await check();
      const thumbnailType = variant === 'thumbnail' && asset.thumbnail?.mediaType;
      const inline = thumbnailType && ['image/png', 'image/jpeg', 'image/webp'].includes(thumbnailType);
      response.writeHead(partial ? 206 : 200, { 'content-type': inline ? thumbnailType : 'application/octet-stream', 'content-disposition': inline ? 'inline' : 'attachment', 'x-content-type-options': 'nosniff',
        'cache-control': 'private, no-store', vary: 'Cookie', 'accept-ranges': 'bytes', 'content-length': end - start + 1,
        ...(partial ? { 'content-range': `bytes ${start}-${end}/${bytes.length}` } : {}) });
      response.end(request.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
    } catch { event('private-assets:denied');json(response, 403, { code: 'PROTECTED_REQUEST_DENIED' }); }
  }
}
