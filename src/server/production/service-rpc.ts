import { request as requestHttps } from 'node:https';
import { TLSSocket } from 'node:tls';
import type { IncomingMessage, RequestListener } from 'node:http';
import { SignJWT, jwtVerify, type CryptoKey } from 'jose';
import { body, deny, digest, json, random } from './boundary.js';

import { internalJwtClock, internalJwtLifetime, InternalJwtReplay } from './internal-jwt-clock.js';

export interface RpcPeer { id: string; keyId: string; key: CryptoKey; fingerprint: string; paths: string[] }
/** Infrastructure RPC authenticates services only. It never creates a User/role/permission. */
export class ServiceRpcVerifier {
  private readonly replay = new InternalJwtReplay();
  constructor(private readonly audience: string, private readonly peers: RpcPeer[]) {
    if (!audience || new Set(peers.map(p => p.keyId)).size !== peers.length) deny();
  }
  async authenticate(request: IncomingMessage, bytes: Buffer) {
    if (!(request.socket instanceof TLSSocket) || !request.socket.authorized || request.method !== 'POST') deny();
    const fingerprint = request.socket.getPeerCertificate().fingerprint256, token = request.headers.authorization;
    if (typeof token !== 'string' || !token.startsWith('Bearer ') || token.length > 8192) deny();
    const currentDate = new Date(internalJwtClock.sample().wall);
    const result = await jwtVerify(token.slice(7), header => {
      const peer = this.peers.find(p => p.keyId === header.kid && p.fingerprint === fingerprint && p.paths.includes(request.url ?? ''));
      if (!peer || header.typ !== 'uib-service-rpc+jwt') deny(); return peer.key;
    }, { audience: this.audience, algorithms: ['EdDSA'], currentDate, maxTokenAge: internalJwtLifetime, requiredClaims: ['iss', 'iat', 'exp', 'jti'] });
    const p = result.payload, peer = this.peers.find(s => s.keyId === result.protectedHeader.kid && s.id === p.iss);
    if (!peer || p.path !== request.url || p.method !== request.method || p.bodyHash !== digest(bytes)) deny();
    this.replay.consume(p, internalJwtClock.sample());
    return peer.id;
  }
}
export class ServiceRpcClient {
  private readonly url: URL;
  constructor(endpoint: string, private readonly tls: { ca: string; cert: string; key: string }, private readonly id: string,
    private readonly keyId: string, private readonly signingKey: CryptoKey, private readonly audience: string, private readonly paths: string[], private readonly timeoutMs = 3000) {
    this.url = new URL(endpoint); if (this.url.protocol !== 'https:' || this.url.pathname !== '/' || this.url.username || this.url.password || this.url.search || this.url.hash || !audience) deny();
  }
  async call(path: string, value: unknown): Promise<any> {
    if (!this.paths.includes(path)) deny(); const bytes = Buffer.from(JSON.stringify(value));
    const issuedAt = Math.floor(internalJwtClock.sample().wall / 1000);
    const token = await new SignJWT({ method: 'POST', path, bodyHash: digest(bytes) }).setProtectedHeader({ alg: 'EdDSA', kid: this.keyId, typ: 'uib-service-rpc+jwt' })
      .setIssuer(this.id).setAudience(this.audience).setIssuedAt(issuedAt).setExpirationTime(issuedAt + internalJwtLifetime).setJti(random()).sign(this.signingKey);
    return new Promise((resolve, reject) => {
      const request = requestHttps(new URL(path, this.url), { ...this.tls, rejectUnauthorized: true, method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } }, response => {
        const chunks: Buffer[] = []; let size = 0;
        response.on('data', chunk => { if ((size += chunk.length) > 65536) response.destroy(new Error('RPC_LIMIT')); else chunks.push(Buffer.from(chunk)); });
        response.on('error', reject); response.on('end', () => { try { if (response.statusCode !== 200) deny(); resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('SERVICE_RPC_UNAVAILABLE')); } });
      });
      request.setTimeout(this.timeoutMs, () => request.destroy(new Error('SERVICE_RPC_UNAVAILABLE'))); request.on('error', reject); request.end(bytes);
    });
  }
}
export function serviceRpcHandler(verifier: ServiceRpcVerifier, operations: Record<string, (value: unknown, serviceId: string) => Promise<unknown>>): RequestListener {
  return async (request, response) => {
    try { const bytes = await body(request); const peer = await verifier.authenticate(request, bytes), operation = operations[request.url ?? '']; if (!operation) deny(); json(response, 200, await operation(JSON.parse(bytes.toString('utf8')), peer)); }
    catch { json(response, 403, { code: 'SERVICE_RPC_DENIED' }); }
  };
}
