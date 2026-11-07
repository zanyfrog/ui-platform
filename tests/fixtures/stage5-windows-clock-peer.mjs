// Diagnostic only: never imported by application code. Tokens and keys stay in IPC.
import { internalJwtClock } from '../../src/server/production/internal-jwt-clock.ts';
import { randomUUID } from 'node:crypto';
import { generateKeyPair, exportJWK, importJWK, SignJWT, jwtVerify } from '../../src/server/production/node_modules/jose/dist/webapi/index.js';
const osNow = () => internalJwtClock.sample().wall;
const keys = await generateKeyPair('EdDSA');
const audience = randomUUID(), used = { date: new Map(), sqlite: new Map() };
const read = source => source === 'date' ? Date.now() : osNow();
process.on('message', async m => {
  try {
    if (m.op === 'issue') {
      const tokens = {};
      for (const source of ['date', 'sqlite']) {
        const ms = read(source), iat = Math.floor(ms / 1000), jti = randomUUID();
        tokens[source] = { ms, iat, exp: iat + 15, token: await new SignJWT({ method: 'POST', path: '/probe', bodyHash: 'fixed-probe-body' })
          .setProtectedHeader({ alg: 'EdDSA', typ: 'uib-service-rpc+jwt' }).setIssuer(m.issuer).setAudience(m.audience)
          .setIssuedAt(iat).setExpirationTime(iat + 15).setJti(jti).sign(keys.privateKey) };
      }
      process.send({ id: m.id, tokens });
    } else if (m.op === 'verify') {
      const key = await importJWK(m.key, 'EdDSA'), outcomes = {};
      for (const source of ['date', 'sqlite']) {
        const ms = read(source), t = m.tokens[source];
        try {
          const { payload: p } = await jwtVerify(t.token, key, { audience, issuer: m.issuer, algorithms: ['EdDSA'], maxTokenAge: 15,
            requiredClaims: ['iss', 'aud', 'iat', 'exp', 'jti'], ...(source === 'sqlite' ? { currentDate: new Date(ms) } : {}) });
          const explicitNow = read(source) / 1000;
          if (p.iat > explicitNow || p.exp - p.iat > 15 || p.method !== 'POST' || p.path !== '/probe' || p.bodyHash !== 'fixed-probe-body') throw Error('EXPLICIT_BINDING_OR_TIME');
          for (const [nonce, exp] of used[source]) if (exp <= explicitNow) used[source].delete(nonce);
          if (used[source].has(p.jti) || used[source].size >= 8192) throw Error('REPLAY');
          used[source].set(p.jti, p.exp);
          outcomes[source] = { allowed: true, senderMs: t.ms, receiverMs: ms, iat: t.iat, exp: t.exp };
        } catch (e) { outcomes[source] = { allowed: false, code: e.code ?? e.message, claim: e.claim ?? null, reason: e.reason ?? null,
          senderMs: t.ms, receiverMs: ms, iat: t.iat, exp: t.exp }; }
      }
      process.send({ id: m.id, outcomes });
    }
  } catch (e) { process.send({ id: m.id, error: e.message }); }
});
process.send({ ready: true, audience, key: await exportJWK(keys.publicKey), pid: process.pid,
  node: process.version, v8: process.versions.v8, sqlite: process.versions.sqlite, executable: process.execPath });
