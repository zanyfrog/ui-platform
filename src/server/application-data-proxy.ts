import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';

export interface ApplicationDataProxyConfig { enabled: boolean; environment: string; protectedHostUrl?: string;
  v1Identity?: { resolveUser(request: IncomingMessage): string | null; trustedUiServerKey: string;
    applicationId: string; authorityId: string; policyDigest(): string; origins: string[] } }

/** Only transports Dataset intent to the existing protected host. It never supplies an actor or evaluates policy. */
export function createApplicationDataProxy(config: ApplicationDataProxyConfig) {
  if (config.v1Identity && (config.environment !== 'development' || config.v1Identity.trustedUiServerKey.length < 32 ||
      !config.v1Identity.applicationId || !config.v1Identity.authorityId || !config.v1Identity.origins.length))
    throw new Error('V1_DATA_IDENTITY_INVALID');
  let target: URL | undefined;
  if (config.enabled && config.environment === 'development' && config.protectedHostUrl) {
    const parsed = new URL(config.protectedHostUrl);
    if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('APPLICATION_DATA_HOST_INVALID');
    target = parsed;
  }
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (!['/api/application-data/queries', '/api/application-data/operations'].includes(url.pathname)) return false;
    if (config.environment !== 'development' || !config.enabled) { response.writeHead(404).end(); return true; }
    if (!target) { response.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ code: 'APPLICATION_DATA_UNAVAILABLE' })); return true; }
    if (request.method !== 'POST' || url.search) { response.writeHead(403).end(); return true; }
    let authorization = request.headers.authorization;
    let v1UserId: string | null = null;
    if (config.v1Identity) {
      if (authorization || typeof request.headers.origin !== 'string' || !config.v1Identity.origins.includes(request.headers.origin)) {
        response.writeHead(403).end(); return true;
      }
      try { v1UserId = config.v1Identity.resolveUser(request); } catch { response.writeHead(403).end(); return true; }
      if (!v1UserId) { response.writeHead(401).end(); return true; }
    } else if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      response.writeHead(403).end(); return true;
    }
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request) {
        const bytes = Buffer.from(chunk); size += bytes.length;
        if (size > 1_000_000) throw new Error('REQUEST_TOO_LARGE');
        chunks.push(bytes);
      }
      if (config.v1Identity && v1UserId) {
        // Recheck after reading a potentially slow request body, then mint one-use authority immediately before forwarding.
        if (config.v1Identity.resolveUser(request) !== v1UserId) throw new Error('V1_SESSION_CHANGED');
        const payload = Buffer.from(JSON.stringify({ userId: v1UserId, applicationId: config.v1Identity.applicationId,
          authorityId: config.v1Identity.authorityId, policyDigest: config.v1Identity.policyDigest(),
          issuedAt: Date.now(), nonce: randomBytes(24).toString('hex') })).toString('base64url');
        const mac = createHmac('sha256', config.v1Identity.trustedUiServerKey).update(payload).digest('base64url');
        authorization = `Bearer v1.${payload}.${mac}`;
      }
      const path = url.pathname.endsWith('/queries') ? '/queries' : '/operations';
      const upstream = await fetch(new URL(path, target), { method: 'POST',
        headers: { authorization: authorization!, 'content-type': 'application/json' }, body: Buffer.concat(chunks), signal: AbortSignal.timeout(15_000) });
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (bytes.length > 1_000_000 || ![200, 401, 403, 404].includes(upstream.status)) throw new Error('UPSTREAM_UNAVAILABLE');
      response.writeHead(upstream.status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(bytes);
    } catch {
      response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ code: 'APPLICATION_DATA_UNAVAILABLE' }));
    }
    return true;
  };
}
