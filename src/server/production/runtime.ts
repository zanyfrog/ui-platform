import type { IncomingMessage, RequestListener } from 'node:http';
import { TLSSocket } from 'node:tls';
import type { SecureSessions } from './sessions.js';
import type { OidcLogin } from './oidc.js';
import { body, cookie, deny, digest, json, noActor } from './boundary.js';
import type { InternalActor } from './internal-trust.js';

export interface RuntimeTransport {
  send(actor: InternalActor, path: string, bytes: Buffer, request: IncomingMessage): Promise<{ status: number; headers: Record<string, string>; bytes: Buffer }>;
}
export interface PublicRelease { releaseId: string; manifestFingerprint?: string; publicFiles: ReadonlyMap<string, { bytes: Uint8Array; sha256: string; mediaType: string }> }
/** Public runtime imports no Builder, development proxy, management router or filesystem store. */
export function runtimeHandler(options: { sessions: SecureSessions; login: OidcLogin; selected: () => Promise<PublicRelease>; transport: RuntimeTransport;
  /** Caddy must overwrite forwarded headers; only these operator-configured socket peers are trusted. */
  trustedProxyAddresses?: string[] }): RequestListener {
  return async (request, response) => {
    try {
      noActor(request);
      // Reject ambiguous/encoded paths before URL normalization. Queries are allowed only for login/callback.
      const raw = request.url ?? '/', rawPath = raw.split('?')[0]!;
      if (rawPath.includes('%') || raw.includes('\\') || raw.startsWith('//') || rawPath.split('/').some(s => s === '.' || s === '..')) deny();
      const url = new URL(raw, options.sessions.publicOrigin);
      if (url.origin !== options.sessions.publicOrigin) deny();
      if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/runtime/')) {
        const encrypted = request.socket instanceof TLSSocket && request.socket.encrypted;
        const proxy = options.trustedProxyAddresses?.includes(request.socket.remoteAddress ?? '') && request.headers['x-forwarded-proto'] === 'https' &&
          request.headers.host === new URL(options.sessions.publicOrigin).host;
        if (!encrypted && !proxy) deny();
      }
      if (url.pathname === '/auth/login' && request.method === 'GET') {
        const result = await options.login.start(request, url.searchParams.get('returnTo') ?? '/');
        response.writeHead(302, { location: result.url, 'set-cookie': result.cookie, 'cache-control': 'no-store' }).end(); return;
      }
      if (url.pathname === '/auth/callback' && request.method === 'GET') {
        const result = await options.login.finish(request);
        response.writeHead(302, { location: result.returnTo, 'set-cookie': [result.cookie, result.clearTransaction], 'cache-control': 'no-store' }).end(); return;
      }
      if (url.search) deny();
      if (url.pathname === '/auth/session' && request.method === 'GET') {
        const session = await options.sessions.read(request); json(response, 200, { csrf: session.csrf }); return;
      }
      if (url.pathname === '/auth/logout' && request.method === 'POST') {
        const header = await options.sessions.logout(request); response.setHeader('set-cookie', header); json(response, 200, { loggedOut: true }); return;
      }
      const protectedRoute = url.pathname === '/runtime/execute' || /^\/runtime\/assets\/[A-Za-z0-9_.:-]+\/[A-Za-z0-9_.:-]+\/(metadata|thumbnail|download)$/.test(url.pathname);
      if (protectedRoute) {
        if (url.pathname === '/runtime/execute' ? request.method !== 'POST' : !['GET', 'HEAD'].includes(request.method ?? '')) deny();
        const session = await options.sessions.read(request, request.method === 'POST');
        const bytes = await body(request), release = await options.selected();
        const current = await options.sessions.read(request, request.method === 'POST');
        if (JSON.stringify(session.enrollment) !== JSON.stringify(current.enrollment) || session.epoch !== current.epoch) deny();
        const actor = { enrollment: current.enrollment, sessionId: digest(cookie(request, options.sessions.cookieName)!), releaseId: release.releaseId, sessionEpoch: current.epoch };
        let result: Awaited<ReturnType<RuntimeTransport['send']>>;
        try { result = await options.transport.send(actor, url.pathname, bytes, request); }
        catch { json(response,503,{code:'UPSTREAM_UNAVAILABLE',commitOutcome:request.method==='POST'?'unknown':'not-committed'}); return; }
        // No upstream cookies/redirects/cache policy, arbitrary routes, or server diagnostics reach browser.
        if (![200, 206, 403, 404, 416].includes(result.status) || result.bytes.length > 20_000_000) deny();
        const allowed = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition'];
        response.writeHead(result.status, { ...Object.fromEntries(Object.entries(result.headers).filter(([key]) => allowed.includes(key.toLowerCase()))),
          'cache-control': 'private, no-store', vary: 'Cookie', 'x-content-type-options': 'nosniff' }).end(request.method === 'HEAD' ? undefined : result.bytes); return;
      }
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/runtime/') || url.pathname.startsWith('/auth/') || !['GET', 'HEAD'].includes(request.method ?? '')) {
        json(response, 404, { code: 'NOT_FOUND' }); return;
      }
      const release = await options.selected(), file = release.publicFiles.get(url.pathname);
      if (!file || digest(file.bytes) !== file.sha256) { json(response, 404, { code: 'NOT_FOUND' }); return; }
      response.writeHead(200, { 'content-type': file.mediaType, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff',
        ...(release.manifestFingerprint ? { 'x-ui-release': release.releaseId, 'x-ui-manifest-fingerprint': release.manifestFingerprint } : {}),
        'content-security-policy': "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" }).end(request.method === 'HEAD' ? undefined : file.bytes);
    } catch { json(response, 403, { code: 'PROTECTED_REQUEST_DENIED' }); }
  };
}
