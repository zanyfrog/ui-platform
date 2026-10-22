import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSample, defaultPanelSample, defaultRouteSample, inspectRoute, sampleSummary, validateSample } from '../../src/client/fixture-preview/samples.js';
test('Card added fields retain v1 defaults and exact supported optional fields', () => {
  const sample = defaultSample();
  const { header, disabled, selected, ...legacy } = sample;
  assert.deepEqual(validateSample(legacy), sample);
  for (const field of ['header', 'disabled', 'selected']) assert.throws(() => validateSample({ ...sample, [field]: null }));
  for (const change of [{ header: '<b>bad</b>' }, { header: 'x'.repeat(513) }, { selected: 'true' }, { disabled: 1 }, { selectable: false, selected: true }, { handler: 'x' }, { style: '' }, { services: {} }, { css: '' }, { mediaSrc: 'https://example.invalid' }]) assert.throws(() => validateSample({ ...sample, ...change }));
  const value = validateSample({ ...sample, header: 'Synthetic header', selected: true, disabled: true });
  assert.equal(value.fixture, 'native-card-v1'); assert.match(sampleSummary(value), /Synthetic header/);
  const hidden = { ...sample }; Object.defineProperty(hidden, 'handler', { value: 'not-admitted', enumerable: false }); assert.throws(() => validateSample(hidden));
});
test('Panel exact text, appearance and local open/collapsible contracts', () => {
  const sample = defaultPanelSample(); assert.deepEqual(validateSample(sample), sample);
  for (const variant of ['outlined', 'elevated', 'flat']) for (const density of ['comfortable', 'compact']) for (const collapsible of [true, false]) for (const open of [true, false]) {
    const value = validateSample({ ...sample, variant, density, collapsible, open }); assert.equal(value.fixture, 'native-panel-v1');
  }
  for (const change of [{ open: 0 }, { collapsible: null }, { heading: '<img>' }, { footer: 'x'.repeat(513) }, { actions: [] }, { disabled: true }, { css: '' }, { functions: {} }, { service: '' }]) assert.throws(() => validateSample({ ...sample, ...change }));
  const missing = { ...sample } as Record<string, unknown>; delete missing.open; assert.throws(() => validateSample(missing));
});
test('two fixed route templates use real pure helpers for encoding and match inspection', () => {
  for (const sample of [defaultRouteSample(), { fixture: 'route-inspector-v1', template: 'project-item', params: { projectId: 'A/B & C', itemId: 'item?#雪' } }]) {
    const value = validateSample(sample); assert.equal(value.fixture, 'route-inspector-v1');
    if (value.fixture !== 'route-inspector-v1') throw new Error('Wrong fixture');
    assert.deepEqual(inspectRoute(value).matched, value.params);
    assert(!inspectRoute(value).path.includes('?')); assert(!inspectRoute(value).path.includes('#'));
    assert.match(sampleSummary(value), /matched/);
  }
});
test('route inspector rejects arbitrary templates, extras, missing, invalid and over-limit values', () => {
  const sample = defaultRouteSample();
  for (const change of [{ template: '/anything/:id' }, { params: {} }, { params: { personId: 'ok', extra: 'bad' } }, { params: { personId: '' } }, { params: { personId: 'x'.repeat(129) } }, { params: { personId: '\uD800' } }, { params: { personId: '<a>' } }, { params: { personId: 1 } }, { navigate: true }, { pathname: '/live' }]) assert.throws(() => validateSample({ ...sample, ...change }));
  let invoked = false; const params = {}; Object.defineProperty(params, 'personId', { get() { invoked = true; return 'bad'; }, enumerable: true });
  assert.throws(() => validateSample({ ...sample, params })); assert.equal(invoked, false);
  assert.throws(() => validateSample({ ...sample, params: JSON.parse('{"personId":"ok","__proto__":{}}') }));
});
