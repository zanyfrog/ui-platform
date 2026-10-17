import { expect, it } from 'vitest';
import { validateArtifact, primaryRouteSignature, insertNode, parseSource, legacyPackageSettingContracts, type RuntimeArtifact, type PackageComponent } from '@ui-platform/visual-artifacts';
import { visualSourceReferences } from '../src/server/application-diagnostic-adapters.js';
import { ApplicationDataClient, createApplicationDataServices, createHttpApplicationDataTransport } from '../packages/platform-core/src/application-data.js';
const artifact = (): RuntimeArtifact => ({ metadata: { schemaVersion: 1, artifactId: 'art_delete', kind: 'page', name: 'delete', displayName: 'Delete', route: '/people/:id', state: { result: null }, events: [{ node: 'delete', event: 'click', actions: [{ kind: 'record-delete', version: 1, datasetId: 'dataset-id', primaryFieldId: 'primary-id', recordId: 'route.id', resultState: 'result' }] }] }, source: '<div class="uip-layout-item" data-uip-node="wrap"><button data-uip-node="delete">Delete</button></div>', css: '' });
it('validates the additive versioned declaration and extracts the permanent Dataset dependency', () => {
  const a = artifact(); expect(validateArtifact(a)).toEqual([]); expect(visualSourceReferences(a)).toEqual([{ kind: 'dataset', id: 'dataset-id' }]);
  a.metadata.events![0].actions.push({ kind: 'service', reference: 'dataset.read', input: { literal: { datasetId: 'dataset-id' } } });
  expect(validateArtifact(a, [], [], ['dataset.read'])).toEqual([]);
});
it.each([{ version: 2 }, { primaryFieldId: '' }, { datasetId: '' }, { resultState: 'undeclared' }, { recordId: 'route.__proto__.id' }, { actor: 'admin' }])('rejects malformed delete declaration %j', change => {
  const a = artifact(); Object.assign(a.metadata.events![0].actions[0], change); expect(validateArtifact(a).some(item => item.severity === 'error')).toBe(true);
});
it.each([{ state: 'text', resultState: 'length' }, { state: [], resultState: 'length' }, { state: { 1: null }, resultState: 1 }])('rejects an incorrectly typed local result declaration %j', value => {
  const a = artifact(); a.metadata.state = value.state as unknown as Record<string, unknown>; Object.assign(a.metadata.events![0].actions[0], { resultState: value.resultState });
  expect(validateArtifact(a).some(item => item.severity === 'error')).toBe(true);
});
it('uses the existing ApplicationDataClient operations transport without constructing client row keys', async () => {
  const calls: unknown[] = [], result = { success: false, committed: false, errors: [{ code: 'AUTHORIZATION_DENIED' }] };
  const services = createApplicationDataServices(new ApplicationDataClient({ async send(path, intent) { calls.push({ path, intent }); return result; } }));
  const intent = { kind: 'record-delete', version: 1, datasetId: 'dataset-id', primaryFieldId: 'primary-id', recordId: 'selected' };
  expect(await services['dataset.deleteRecord'](intent)).toBe(result); expect(calls).toEqual([{ path: 'operations', intent }]);
});
it('uses the same collision signature for creation and complete composition validation', () => {
  expect(primaryRouteSignature('/people/:id/')).toBe(primaryRouteSignature('/people/[record]'));
  expect(() => primaryRouteSignature('/people/../admin')).toThrow();
  expect(primaryRouteSignature('/people/register')).not.toBe(primaryRouteSignature('/people/:id'));
});
it('inserts only explicit public slot content and preserves the referenced definition', () => {
  const source = '<uip-component data-uip-node="instance" data-uip-component="cmp_platform_shared"></uip-component>';
  let index = 0; const next = insertNode(source, 'p', undefined, 'instance', () => `node_${index++}`, 'footer');
  const nodes = parseSource(next).nodes; expect(nodes[0].attributes['data-uip-component']).toBe('cmp_platform_shared'); expect(nodes[1].attributes.slot).toBe('footer');
  expect(() => insertNode(source, 'p', undefined, 'instance')).toThrow('ordinary HTML');
});
it('adapts only declared legacy presentation values and preserves native validation', () => {
  const pkg: PackageComponent = { id: 'legacy:heading', tagName: 'uib-heading', presentation: { settings: { size: { type: 'select', options: ['compact', 'large'] }, visual_mode: { type: 'select', options: ['panel-right', 'background'] } } } };
  expect(legacyPackageSettingContracts(pkg)).toEqual({ size: { type: 'string', enum: ['compact', 'large'], default: undefined } });
  const a = artifact(); a.metadata.events = []; a.source = '<div class="uip-layout-item" data-uip-node="wrap"><uib-heading data-uip-node="heading" data-uip-component="legacy:heading" data-uip-settings=\'{"size":"large"}\'></uib-heading></div>';
  expect(validateArtifact(a, [], [pkg])).toEqual([]);
  a.source = a.source.replace('large', 'invented'); expect(validateArtifact(a, [], [pkg]).some(item => item.severity === 'error')).toBe(true);
  a.source = a.source.replace('"size":"invented"', '"visual_mode":"background"'); expect(validateArtifact(a, [], [pkg]).some(item => item.severity === 'error')).toBe(true);
});
it('distinguishes known HTTP denial from an uncertain server response', async () => {
  const intent = { datasetId: 'dataset', operation: 'delete' as const, records: [{ id: 'one' }] };
  const denied = createHttpApplicationDataTransport({ credential: () => undefined, fetch: async () => new Response('', { status: 403 }) });
  await expect(denied.send('operations', intent)).rejects.toMatchObject({ commitOutcome: 'not-committed' });
  const unavailable = createHttpApplicationDataTransport({ credential: () => undefined, fetch: async () => new Response('', { status: 503 }) });
  await expect(unavailable.send('operations', intent)).rejects.toThrow('outcome is unknown');
});
