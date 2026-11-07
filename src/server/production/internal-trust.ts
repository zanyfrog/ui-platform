import type { IncomingMessage } from 'node:http';
import { TLSSocket } from 'node:tls';
import { SignJWT, jwtVerify, type CryptoKey } from 'jose';
import type { Enrollment, IdentityDirectory } from './enrollment.js';
import { deny, digest, random } from './boundary.js';

import { assertInternalJwtTime, internalJwtClock, internalJwtLifetime, InternalJwtReplay } from './internal-jwt-clock.js';

export interface InternalActor { enrollment: Enrollment; sessionId: string; releaseId: string; sessionEpoch?: number }
export interface InternalService { issuer: string; keyId: string; publicKey: CryptoKey; certificateFingerprint: string; applications: string[] }
export class InternalSigner {
  constructor(private readonly issuer: string, private readonly keyId: string, private readonly key: CryptoKey, private readonly audience: string) {}
  async sign(actor: InternalActor, method: string, path: string, bytes: Uint8Array, range = '') {
    const now = Math.floor(internalJwtClock.sample().wall / 1000);
    return new SignJWT({ ...actor, method, path, range, bodyHash: digest(bytes) }).setProtectedHeader({ alg: 'EdDSA', kid: this.keyId, typ: 'uib-internal+jwt' })
      .setIssuer(this.issuer).setAudience(this.audience).setIssuedAt(now).setExpirationTime(now + internalJwtLifetime).setJti(random()).sign(this.key);
  }
}
/** Data receiver instance audience must be freshly generated at each start. */
export class InternalVerifier {
  private readonly replay = new InternalJwtReplay();
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
    const currentDate = new Date(internalJwtClock.sample().wall);
    const verified = await jwtVerify(authorization.slice(7), async header => {
      const service = this.services.find(s => s.keyId === header.kid && s.certificateFingerprint === fingerprint);
      if (!service || header.typ !== 'uib-internal+jwt') deny(); return service!.publicKey;
    }, { audience: this.instanceAudience, algorithms: ['EdDSA'], currentDate, maxTokenAge: internalJwtLifetime, requiredClaims: ['iss', 'aud', 'iat', 'exp', 'jti'] });
    const p = verified.payload, service = this.services.find(s => s.keyId === verified.protectedHeader.kid && s.issuer === p.iss);
    const actor = p as unknown as InternalActor;
    if (!service || !actor.enrollment || !service.applications.includes(actor.enrollment.applicationId) || typeof actor.sessionId !== 'string' || !actor.sessionId ||
        typeof actor.releaseId !== 'string' || !actor.releaseId || p.method !== request.method || p.path !== request.url || p.range !== (request.headers.range ?? '') || p.bodyHash !== digest(bytes)) deny();
    this.replay.consume(p, internalJwtClock.sample());
    if (!await this.directory.current(actor.enrollment) || !await this.activeSession(actor)) deny();
    assertInternalJwtTime(p, internalJwtClock.sample());
    return structuredClone(actor);
  }
}
