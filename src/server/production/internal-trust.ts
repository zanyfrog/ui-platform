import type { IncomingMessage } from 'node:http';
import { TLSSocket } from 'node:tls';
import { SignJWT, jwtVerify, type CryptoKey } from 'jose';
import type { Enrollment, IdentityDirectory } from './enrollment.js';
import { deny, digest, random } from './boundary.js';

export interface InternalActor { enrollment: Enrollment; sessionId: string; releaseId: string; sessionEpoch?: number }
export interface InternalService { issuer: string; keyId: string; publicKey: CryptoKey; certificateFingerprint: string; applications: string[] }
export class InternalSigner {
  constructor(private readonly issuer: string, private readonly keyId: string, private readonly key: CryptoKey, private readonly audience: string) {}
  async sign(actor: InternalActor, method: string, path: string, bytes: Uint8Array, now = Math.floor(Date.now() / 1000), range = '') {
    return new SignJWT({ ...actor, method, path, range, bodyHash: digest(bytes) }).setProtectedHeader({ alg: 'EdDSA', kid: this.keyId, typ: 'uib-internal+jwt' })
      .setIssuer(this.issuer).setAudience(this.audience).setIssuedAt(now).setExpirationTime(now + 15).setJti(random()).sign(this.key);
  }
}
/** Data receiver instance audience must be freshly generated at each start. */
export class InternalVerifier {
  private readonly used = new Map<string, number>();
  constructor(readonly instanceAudience: string, private readonly services: InternalService[], private readonly directory: IdentityDirectory,
    private readonly activeSession: (actor: InternalActor) => Promise<boolean>) {
    if (!instanceAudience || new Set(services.map(s => s.keyId)).size !== services.length || services.some(s => !s.certificateFingerprint || !s.applications.length)) deny();
  }
  async authenticate(request: IncomingMessage, bytes: Uint8Array): Promise<InternalActor> {
    if (!(request.socket instanceof TLSSocket) || !request.socket.authorized) deny();
    const fingerprint = (request.socket as TLSSocket).getPeerCertificate().fingerprint256;
    if (!fingerprint) deny();
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || authorization.length > 8192) deny();
    const verified = await jwtVerify(authorization.slice(7), async header => {
      const service = this.services.find(s => s.keyId === header.kid && s.certificateFingerprint === fingerprint);
      if (!service || header.typ !== 'uib-internal+jwt') deny(); return service!.publicKey;
    }, { audience: this.instanceAudience, algorithms: ['EdDSA'], maxTokenAge: 15, requiredClaims: ['iss', 'aud', 'iat', 'exp', 'jti'] });
    const p = verified.payload, service = this.services.find(s => s.keyId === verified.protectedHeader.kid && s.issuer === p.iss);
    const actor = p as unknown as InternalActor;
    if (!service || !actor.enrollment || !service.applications.includes(actor.enrollment.applicationId) || typeof actor.sessionId !== 'string' || !actor.sessionId ||
        typeof actor.releaseId !== 'string' || !actor.releaseId || p.method !== request.method || p.path !== request.url || p.range !== (request.headers.range ?? '') || p.bodyHash !== digest(bytes) ||
        typeof p.iat !== 'number' || typeof p.exp !== 'number' || p.iat > Date.now() / 1000 || p.exp - p.iat > 15 || typeof p.jti !== 'string') deny();
    const now = Date.now() / 1000;
    for (const [nonce, expires] of this.used) if (expires <= now) this.used.delete(nonce);
    const nonce = JSON.stringify([p.iss, p.jti]);
    if (this.used.has(nonce) || this.used.size >= 8192) deny();
    this.used.set(nonce, p.exp!);
    if (!await this.directory.current(actor.enrollment) || !await this.activeSession(actor)) deny();
    return structuredClone(actor);
  }
}
