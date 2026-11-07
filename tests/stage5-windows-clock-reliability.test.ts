import { it, expect, vi } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { realpath, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { TLSSocket } from 'node:tls';
import { ServiceRpcVerifier } from '../src/server/production/service-rpc.js';
import { InternalJwtClock, internalJwtClock, InternalJwtReplay } from '../src/server/production/internal-jwt-clock.js';
import { InternalVerifier } from '../src/server/production/internal-trust.js';
import { digest } from '../src/server/production/boundary.js';
import { generateKeyPair, SignJWT, jwtVerify } from '../src/server/production/node_modules/jose/dist/webapi/index.js';
async function guard() {
  const root = process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT, original = process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if (!root || !original || await realpath('.') !== await realpath(root) || await realpath(root) === await realpath(original)) throw Error('PHYSICAL_ISOLATION_REQUIRED');
}

it('latches invalid readings, wall steps, suspension divergence and untrustworthy sample duration', async () => {
  await guard();
  for (const [delta, elapsed] of [[-1, 1], [1, 1000], [1000, 1], [0, -1], [60_000, 1]]) {
    let wall = 1_800_000_000_000, mono = 1_000_000_000n;
    const clock = new InternalJwtClock(() => wall, () => mono);
    clock.sample(); wall += delta!; mono += BigInt(elapsed!) * 1_000_000n;
    expect(() => clock.sample()).toThrow(); wall = 1_800_000_001_000; mono = 2_000_000_000n;
    expect(() => clock.sample()).toThrow();
  }
  for (const bad of [NaN, Infinity, 1.5, null, '1800000000000']) {
    let reading: unknown = bad;
    const clock = new InternalJwtClock(() => reading, () => 0n);
    expect(() => clock.sample()).toThrow(); reading = 1_800_000_000_000;
    expect(() => clock.sample()).toThrow();
  }
  const unavailable = new InternalJwtClock(() => { throw Error('unavailable'); }, () => 0n);
  expect(() => unavailable.sample()).toThrow();
  let mono = 0n;
  const delayed = new InternalJwtClock(() => 1_800_000_000_000, () => (mono += 65_000_000n));
  expect(() => delayed.sample()).toThrow();
});

it('keeps live replay entries at capacity and permits eviction only after wall expiry and monotonic retention', async () => {
  await guard(); const replay = new InternalJwtReplay(), base = 1_800_000_000;
  const sample = (offset: number, elapsed: bigint) => ({ wall: (base + offset) * 1000, before: elapsed, after: elapsed });
  for (let i = 0; i < 8192; i++) replay.consume({ iss: 'issuer', jti: String(i), iat: base, exp: base + 15 }, sample(0, 0n));
  const next = { iss: 'issuer', jti: 'new', iat: base + 15, exp: base + 30 };
  expect(() => replay.consume(next, sample(15, 14_999_999_999n))).toThrow();
  expect(() => replay.consume({ ...next, iat: base, exp: base + 15 }, sample(14, 15_000_000_000n))).toThrow();
  expect(() => replay.consume({ iss: 'issuer', jti: '0', iat: base, exp: base + 15 }, sample(14, 14_000_000_000n))).toThrow();
  expect(() => replay.consume(next, sample(15, 15_000_000_000n))).not.toThrow();
});

it('refuses rollback and expiry during actor verification, then refuses the prior epoch and signing key', async () => {
  await guard(); const base = 1_800_000_000, bytes = Buffer.from('{}');
  const socket = new TLSSocket();
  Object.defineProperty(socket, 'authorized', { value: true });
  socket.getPeerCertificate = (() => ({ fingerprint256: 'test-peer' })) as any;
  const keys = await generateKeyPair('EdDSA'), nextKeys = await generateKeyPair('EdDSA');
  const actor = { enrollment: { applicationId: 'app' }, sessionId: 'session', releaseId: 'release', sessionEpoch: 1 };
  const token = (iat: number, aud = 'old', key = keys.privateKey) => new SignJWT({ ...actor, method: 'POST', path: '/probe', bodyHash: digest(bytes), range: '' })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'runtime', typ: 'uib-internal+jwt' }).setIssuer('runtime').setAudience(aud).setIssuedAt(iat).setExpirationTime(iat + 15).setJti(randomUUID()).sign(key);
  const verify = (audience: string, active: () => Promise<boolean>, key = keys.publicKey) => new InternalVerifier(audience, [{ issuer: 'runtime', keyId: 'runtime', publicKey: key, certificateFingerprint: 'test-peer', applications: ['app'] }], { current: async () => true } as any, active);
  const call = (v: InternalVerifier, t: string) => v.authenticate({ socket, method: 'POST', url: '/probe', headers: { authorization: 'Bearer ' + t } } as any, bytes);
  let wall = base * 1000, mono = 0n, clock = new InternalJwtClock(() => wall, () => mono);
  vi.spyOn(internalJwtClock, 'sample').mockImplementation(() => clock.sample());
  try {
    for (const step of [-1, 15_000, 60_000]) {
      wall = base * 1000; mono = 0n; clock = new InternalJwtClock(() => wall, () => mono);
      const v = verify('old', async () => { wall += step; mono += BigInt(step === 15_000 ? step : 1) * 1_000_000n; return true; });
      await expect(call(v, await token(base))).rejects.toThrow();
    }
    wall = base * 1000; mono = 0n; clock = new InternalJwtClock(() => wall, () => mono);
    const v = verify('old', async () => true), original = await token(base);
    await expect(call(v, original)).resolves.toMatchObject(actor);
    await expect(call(v, original)).rejects.toThrow();
    wall += 16_000; mono += 16_000_000_000n;
    await expect(call(v, await token(base + 16))).resolves.toMatchObject(actor);
    wall -= 15_000; mono += 1_000_000n;
    await expect(call(v, original)).rejects.toThrow();
    clock = new InternalJwtClock(() => wall, () => mono);
    const next = verify('new', async () => true, nextKeys.publicKey);
    await expect(call(verify('new', async () => true), original)).rejects.toThrow();
    await expect(call(next, await token(base + 1, 'new'))).rejects.toThrow();
    await expect(call(next, await token(base + 1, 'new', nextKeys.privateKey))).resolves.toMatchObject(actor);
    await expect(call(verify('new', async () => false, nextKeys.publicKey), await token(base + 1, 'new', nextKeys.privateKey))).rejects.toThrow();
  } finally { vi.restoreAllMocks(); socket.destroy(); }
});
it('compares real signed JWTs on six directed Windows peer pairs, independent starts and restarts', async () => {
  await guard();
  const runs: any[] = [], children: ChildProcess[] = [];
  let priorAssertion: any;
  async function peer(label: string) {
    const child = spawn(process.execPath, ['--import','tsx','tests/fixtures/stage5-windows-clock-peer.mjs'], { cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    children.push(child); let seq = 0, errors = '';
    child.stderr!.on('data', b => errors += String(b));
    const pending = new Map<number, any>();
    const ready: any = await new Promise((resolve, reject) => {
      child.once('error', reject); child.once('exit', c => reject(Error('PEER_EXIT ' + c + ' ' + errors)));
      child.on('message', (m: any) => { if (m.ready) resolve(m); else { const p = pending.get(m.id); pending.delete(m.id); if (p) m.error ? p.reject(Error(m.error)) : p.resolve(m); } });
    });
    return { label, ...ready, child, call(message: any): Promise<any> { return new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); child.send({ ...message, id }); }); } };
  }
  try {
    for (let epoch = 0; epoch < 3; epoch++) {
      const peers = [];
      for (const label of ['runtime', 'data', 'management']) { peers.push(await peer(label)); await new Promise(r => setTimeout(r, 137 + epoch * 43)); }
      const run: any = { epoch, peers: peers.map(({ label, pid, audience, node, v8, sqlite, executable }) => ({ label, pid, audience, node, v8, sqlite, executable })), pairs: [] };
      if (priorAssertion) {
        const restarted = await peers[1]!.call({ op: 'verify', issuer: 'runtime', key: priorAssertion.key, tokens: priorAssertion.tokens });
        run.oldAudienceAfterRestart = restarted.outcomes;
        for (const source of ['date', 'sqlite']) { expect(restarted.outcomes[source].allowed).toBe(false); expect(restarted.outcomes[source].claim).toBe('aud'); }
      }
      for (const sender of peers) for (const receiver of peers) if (sender !== receiver) run.pairs.push({ from: sender.label, to: receiver.label, samples: 0, dateDenied: 0, sqliteDenied: 0, dateFuture: 0, sqliteFuture: 0, dateMinMs: Infinity, sqliteMinMs: Infinity, secondBoundaries: new Set(), refusals: [] });
      const start = performance.now();
      do {
        for (const pair of run.pairs) {
          const sender = peers.find(p => p.label === pair.from)!, receiver = peers.find(p => p.label === pair.to)!;
          const issued = await sender.call({ op: 'issue', issuer: sender.label, audience: receiver.audience });
          const result = await receiver.call({ op: 'verify', issuer: sender.label, key: sender.key, tokens: issued.tokens });
          pair.samples++;
          for (const source of ['date', 'sqlite']) {
            const o = result.outcomes[source];
            pair[source + 'MinMs'] = Math.min(pair[source + 'MinMs'], o.receiverMs - o.senderMs);
            if (o.iat > Math.floor(o.receiverMs / 1000)) pair[source + 'Future']++;
            if (!o.allowed) { pair[source + 'Denied']++; if (pair.refusals.length < 6) pair.refusals.push({ source, ...o }); }
            if (o.senderMs % 1000 < 20 || o.senderMs % 1000 > 980) pair.secondBoundaries.add(Math.floor(o.senderMs / 1000));
          }
        }
      } while (performance.now() - start < 6000);
      for (const p of run.pairs) p.secondBoundaries = [...p.secondBoundaries];
      const old = await peers[0]!.call({ op: 'issue', issuer: 'runtime', audience: peers[1]!.audience });
      priorAssertion = { key: peers[0]!.key, tokens: old.tokens };
      runs.push(run);
      for (const p of peers) { const ended = new Promise(r => p.child.once('exit', r)); p.child.kill(); await ended; }
    }
    await mkdir('diagnostics', { recursive: true });
    await writeFile('diagnostics/windows-clock-peers.json', JSON.stringify({ runs, policy: 'Existing pinned jose; zero tolerance; 15s assertion lifetime; date baseline versus experimental in-memory SQLite OS clock. Production clock source under test.' }, null, 2));
    for (const run of runs) for (const p of run.pairs) { expect(p.samples).toBeGreaterThan(20); expect(p.sqliteDenied).toBe(0); expect(p.sqliteFuture).toBe(0); expect(p.secondBoundaries.length).toBeGreaterThan(1); }
  } finally { for (const c of children) if (c.exitCode === null && c.signalCode === null) c.kill(); }
}, 60000);

it('retains strict pinned-verifier boundaries and exposes backward-jump replay requirements', async () => {
  await guard(); const keys = await generateKeyPair('EdDSA'), other = await generateKeyPair('EdDSA'), base = 1_800_000_000, observations: any[] = [];
  const token = (claims: any = {}, key = keys.privateKey) => new SignJWT({ iss: 'runtime', aud: 'data-instance', iat: base, exp: base + 15, jti: randomUUID(), ...claims }).setProtectedHeader({ alg: 'EdDSA' }).sign(key);
  async function verify(t: string, ms: number) { return jwtVerify(t, keys.publicKey, { algorithms: ['EdDSA'], issuer: 'runtime', audience: 'data-instance', maxTokenAge: 15, requiredClaims: ['iat', 'exp', 'jti'], currentDate: new Date(ms) }); }
  for (const [label, claims, ms, allowed] of [
    ['valid', {}, base * 1000, true], ['before-expiry', {}, (base + 15) * 1000 - 1, true], ['expiry', {}, (base + 15) * 1000, false],
    ['future-1ms', { iat: base + 1, exp: base + 16 }, (base + 1) * 1000 - 1, false], ['nbf', { nbf: base + 1 }, base * 1000, false],
    ['maximum-age', { exp: base + 60 }, (base + 16) * 1000, false], ['wrong-audience', { aud: 'old-instance' }, base * 1000, false],
    ['wrong-issuer', { iss: 'unauthorized' }, base * 1000, false], ['forward-jump', {}, (base + 100) * 1000, false],
  ] as const) {
    let ok = true, code = 'ALLOW'; try { await verify(await token(claims), ms); } catch (e: any) { ok = false; code = e.code; }
    observations.push({ label, allowed: ok, code }); expect(ok, label).toBe(allowed);
  }
  await expect(verify(await token({}, other.privateKey), base * 1000)).rejects.toThrow();
  // Reproduce the CURRENT nonce eviction algorithm. A source swap alone cannot
  // promise replay safety across wall-clock rollback; do not silently add a policy.
  const used = new Map<string, number>(), t = await token();
  async function existingNonceCheck(ms: number) { const { payload: p } = await verify(t, ms); for (const [id, exp] of used) if (exp <= ms / 1000) used.delete(id); if (used.has(p.jti!)) throw Error('REPLAY'); used.set(p.jti!, p.exp!); }
  await existingNonceCheck(base * 1000); await expect(existingNonceCheck(base * 1000)).rejects.toThrow('REPLAY');
  // Another valid assertion at a later time causes ordinary expired nonce eviction.
  for (const [id, exp] of used) if (exp <= base + 16) used.delete(id);
  await existingNonceCheck((base + 1) * 1000);
  observations.push({ label: 'rollback-after-expired-nonce-eviction', replayAcceptedByExistingAlgorithm: true, implication: 'A clock-source-only replacement is insufficient for the requested jump/replay qualification; discontinuity contract requires review.' });
  await mkdir('diagnostics', { recursive: true }); await writeFile('diagnostics/windows-clock-boundaries.json', JSON.stringify({ observations, applicationPolicyChanged: false }, null, 2));
});

it('rejects expiry-eviction then backward-jump replay in the actual corrected RPC verifier', async () => {
  await guard(); const base = 1_800_000_000;
  let receiver = base * 1000, elapsed = 0n;
  const clock = new InternalJwtClock(() => receiver, () => elapsed);
  const keys = await generateKeyPair('EdDSA'), bytes = Buffer.from('{}');
  const socket = new TLSSocket();
  Object.defineProperty(socket, 'authorized', { value: true });
  socket.getPeerCertificate = (() => ({ fingerprint256: 'diagnostic-peer' })) as any;
  const verifier = new ServiceRpcVerifier('instance', [{ id: 'runtime', keyId: 'runtime', key: keys.publicKey, fingerprint: 'diagnostic-peer', paths: ['/probe'] }]);
  const token = (iat: number) => new SignJWT({ method: 'POST', path: '/probe', bodyHash: digest(bytes) }).setProtectedHeader({ alg: 'EdDSA', kid: 'runtime', typ: 'uib-service-rpc+jwt' }).setIssuer('runtime').setAudience('instance').setIssuedAt(iat).setExpirationTime(iat + 15).setJti(randomUUID()).sign(keys.privateKey);
  const first = await token(base), later = await token(base + 16);
  const authenticate = (t: string) => verifier.authenticate({ socket, method: 'POST', url: '/probe', headers: { authorization: 'Bearer ' + t } } as any, bytes);
  const outcomes: any[] = [];
  try {
    vi.spyOn(internalJwtClock, 'sample').mockImplementation(() => clock.sample());
    outcomes.push({ phase: 'first', accepted: await authenticate(first) === 'runtime' });
    await expect(authenticate(first)).rejects.toThrow(); outcomes.push({ phase: 'immediate-replay', rejected: true });
    receiver = (base + 16) * 1000; elapsed = 16_000_000_000n;
    await expect(authenticate(first)).rejects.toThrow(); outcomes.push({ phase: 'expired', rejected: true });
    outcomes.push({ phase: 'later-valid-request-evicts-expired-nonce', accepted: await authenticate(later) === 'runtime' });
    receiver = (base + 1) * 1000;
    await expect(authenticate(first)).rejects.toThrow();
    outcomes.push({ phase: 'backward-jump-replay', accepted: false });
    receiver = (base + 16) * 1000;
    await expect(authenticate(await token(base + 16))).rejects.toThrow();
  } finally { vi.restoreAllMocks(); socket.destroy(); }
  await mkdir('diagnostics', { recursive: true }); await writeFile('diagnostics/windows-clock-actual-rpc-rollback.json', JSON.stringify({ outcomes, scope: 'Actual corrected verifier and pinned jose; simulated trusted-clock discontinuity and TLS peer identity; real network/certificate negatives covered separately by unchanged Stage 5 security tests. Demonstrates rollback refusal and sticky fault.' }, null, 2));
});
