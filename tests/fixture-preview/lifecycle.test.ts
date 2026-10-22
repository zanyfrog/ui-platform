import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PreviewLifecycle, identityKey, type PreviewIdentity } from '../../src/client/fixture-preview/lifecycle.js';
import { defaultSample, validateSample, denyCapability, unsupportedFixtures } from '../../src/client/fixture-preview/samples.js';
import { validChannel } from '../../src/client/fixture-preview/protocol.js';
import { EditingLifecycle } from '../../src/client/artifact-editor/editing-lifecycle.js';
import { configureAutosave } from '../../src/client/artifact-editor/autosave-configuration.js';
const identity: PreviewIdentity = { subjectId: 'synthetic-subject', sessionId: 'synthetic-session', applicationId: 'app-permanent-1', artifactKey: JSON.stringify(['platform', 'synthetic-owner', 'visual', 'synthetic-id']) };
const capture = (id: string) => ({ identity, captureId: id, provenance: { kind: 'fixture' as const, fixtureId: 'native-card-v1' }, content: defaultSample() });

test('identity is immutable and distinguishes original subject, session, permanent Application and owner', () => {
  const initial = structuredClone(identity), lifecycle = new PreviewLifecycle(initial); initial.applicationId = 'renamed-key-is-not-id';
  assert.equal(lifecycle.snapshot.identity.applicationId, identity.applicationId);
  for (const field of Object.keys(identity)) assert.notEqual(identityKey(identity), identityKey({ ...identity, [field]: 'different' }));
  assert.throws(() => new PreviewLifecycle({ ...identity, applicationId: '' }), /IDENTITY_INVALID/);
});
test('last success is distinct from pending and cannot be relabeled on failure', () => {
  const lifecycle = new PreviewLifecycle(identity);
  assert.equal(lifecycle.snapshot.state, 'empty');
  const first = lifecycle.refresh(); assert.equal(lifecycle.snapshot.state, 'capturing');
  assert(lifecycle.succeed(first, capture('capture-original')));
  const next = lifecycle.refresh(); assert.equal(lifecycle.snapshot.last?.captureId, 'capture-original');
  assert.equal(lifecycle.snapshot.pending?.requestId, next.requestId);
  lifecycle.fail(next, 'RESOURCE_NOT_ADMITTED');
  assert.equal(lifecycle.snapshot.state, 'stale'); assert.equal(lifecycle.snapshot.last?.captureId, 'capture-original');
  assert.equal(lifecycle.snapshot.pending, undefined);
  const external = lifecycle.snapshot; external.last!.captureId = 'tampered'; assert.equal(lifecycle.snapshot.last?.captureId, 'capture-original');
});
test('deferred response loses to explicit newer refresh', async () => {
  const lifecycle = new PreviewLifecycle(identity); const old = lifecycle.refresh();
  let resolve!: (value: ReturnType<typeof capture>) => void;
  const deferred = new Promise<ReturnType<typeof capture>>(done => { resolve = done; });
  const completion = deferred.then(value => lifecycle.succeed(old, value));
  const latest = lifecycle.refresh(); assert(lifecycle.succeed(latest, capture('new')));
  resolve(capture('old')); assert.equal(await completion, false); assert.equal(lifecycle.snapshot.last?.captureId, 'new');
});
test('a retained capture cannot be relabeled as another saved revision or fixture', () => {
  const lifecycle = new PreviewLifecycle(identity); lifecycle.succeed(lifecycle.refresh(), capture('same-capture'));
  const pending = lifecycle.refresh();
  assert.equal(lifecycle.succeed(pending, { ...capture('same-capture'), provenance: { kind: 'saved', revision: 'new-revision' } }), false);
  assert.equal(lifecycle.snapshot.last?.provenance.kind, 'fixture');
});
test('wrong response identity, request identity and sequence are rejected', () => {
  const lifecycle = new PreviewLifecycle(identity), request = lifecycle.refresh();
  for (const field of Object.keys(identity)) {
    const wrong = { ...identity, [field]: 'other' };
    assert.equal(lifecycle.succeed({ ...request, identity: wrong }, capture('wrong')), false);
    assert.equal(lifecycle.succeed(request, { ...capture('wrong'), identity: wrong }), false);
  }
  assert.equal(lifecycle.succeed({ ...request, sequence: request.sequence + 1 }, capture('wrong')), false);
  assert.equal(lifecycle.succeed({ ...request, requestId: 'replay' }, capture('wrong')), false);
});
test('invalidation cancels pending without automatic recapture or content replacement', () => {
  const lifecycle = new PreviewLifecycle(identity), first = lifecycle.refresh(); lifecycle.succeed(first, capture('old'));
  const pending = lifecycle.refresh(); lifecycle.invalidate('DEPENDENCY_CHANGED');
  assert.equal(lifecycle.snapshot.state, 'stale'); assert.equal(lifecycle.snapshot.pending, undefined);
  assert.equal(lifecycle.succeed(pending, capture('late')), false); assert.equal(lifecycle.snapshot.last?.captureId, 'old');
});
test('simulated revocation clears successful and pending content and rejects future/late work', () => {
  const lifecycle = new PreviewLifecycle(identity); lifecycle.succeed(lifecycle.refresh(), capture('old'));
  const pending = lifecycle.refresh(); lifecycle.revoke('SIMULATED');
  assert.equal(lifecycle.snapshot.state, 'revoked'); assert.equal(lifecycle.snapshot.last, undefined); assert.equal(lifecycle.snapshot.pending, undefined);
  assert.equal(lifecycle.succeed(pending, capture('late')), false); assert.throws(() => lifecycle.refresh(), /SESSION_CLOSED/);
});
test('disposal is terminal, including deferred rejection and revocation', () => {
  const lifecycle = new PreviewLifecycle(identity), pending = lifecycle.refresh(); lifecycle.dispose(); lifecycle.revoke('late'); lifecycle.invalidate('late');
  assert.equal(lifecycle.snapshot.state, 'disposed'); assert.equal(lifecycle.fail(pending, 'late'), false); assert.equal(lifecycle.succeed(pending, capture('late')), false);
  assert.throws(() => lifecycle.refresh(), /SESSION_CLOSED/);
});
test('initial failures are unavailable; explicit refresh alone recovers', () => {
  const lifecycle = new PreviewLifecycle(identity); lifecycle.fail(lifecycle.refresh(), 'UNSUPPORTED'); assert.equal(lifecycle.snapshot.state, 'unavailable');
  lifecycle.succeed(lifecycle.refresh(), capture('recovered')); assert.equal(lifecycle.snapshot.state, 'ready');
});
test('samples are bounded data with exact fields and native supported values', () => {
  const sample = defaultSample(), copy = validateSample(sample); copy.heading = 'changed'; assert.notEqual(sample.heading, copy.heading);
  for (const variant of ['outlined', 'elevated', 'flat']) assert.equal(validateSample({ ...sample, variant }).variant, variant);
  for (const change of [{ functions: {} }, { href: 'https://invalid.test' }, { body: '<script>' }, { heading: 'x'.repeat(513) }, { variant: 'unknown' }, { fixture: 'different' }, { selectable: 'true' }, { mode: 'edit' }, { regions: {} }, { route: {} }, { dataset: {} }]) assert.throws(() => validateSample({ ...sample, ...change }));
  let invoked = false; const accessor = { ...sample }; Object.defineProperty(accessor, 'heading', { get() { invoked = true; return ''; } });
  assert.throws(() => validateSample(accessor)); assert.equal(invoked, false);
  assert.throws(() => validateSample(Object.assign(Object.create({ inherited: true }), sample)));
});
test('service/resource and unsupported schema requests have specific denial reasons', () => {
  for (const capability of ['Dataset', 'Workflow', 'Trigger', 'service', 'storage', 'Publish', 'resource', 'upload', 'download', 'navigation', 'mutation']) assert.throws(() => denyCapability(capability), new RegExp(`FIXTURE_CAPABILITY_DENIED:${capability}`));
  for (const reason of Object.values(unsupportedFixtures)) assert.match(reason, /^[A-Z_]+:/);
});
test('protocol rejects cross-session, wrong nonce/identity, sequence, upgrade and extra capabilities', () => {
  const channel = { nonce: 'synthetic-nonce', session: 'synthetic-session', identity: identityKey(identity), sequence: 1 };
  assert(validChannel({ ...channel, type: 'render', sample: defaultSample() }, channel));
  for (const change of [{ nonce: 'replay' }, { session: 'other' }, { identity: 'other' }, { sequence: 2 }, { sequence: 0 }, { type: 'Publish' }, { capability: 'save' }, { sample: defaultSample() }]) assert.equal(validChannel({ ...channel, type: 'ready', ...change }, channel), false);
});
test('in-memory WP2 dirty bytes, identity and Undo/Redo history survive preview lifecycle', async () => {
  configureAutosave({ enabled: false, delayMs: 2000 }); let saves = 0;
  const draft = new EditingLifecycle({ identity: 'original-working-copy', source: 'saved' }, async value => { saves++; return value; });
  draft.edit({ identity: 'original-working-copy', source: 'dirty one' }); draft.edit({ identity: 'original-working-copy', source: 'dirty two' }); draft.undo();
  const snapshot = () => ({ current: draft.current, baseline: draft.baseline, generation: draft.generation, savedGeneration: draft.savedGeneration, history: draft.historySize, dirty: draft.dirty, canUndo: draft.canUndo, canRedo: draft.canRedo });
  const before = structuredClone(snapshot()); const lifecycle = new PreviewLifecycle(identity);
  lifecycle.succeed(lifecycle.refresh(), capture('one')); lifecycle.invalidate('changed'); lifecycle.fail(lifecycle.refresh(), 'denied'); lifecycle.revoke('SIMULATED'); lifecycle.dispose();
  assert.deepEqual(snapshot(), before); assert.equal(saves, 0);
  draft.redo(); assert.equal(draft.current.source, 'dirty two'); draft.undo(); assert.equal(draft.current.source, 'dirty one');
  await draft.dispose(); configureAutosave({ enabled: true, delayMs: 2000 });
});
