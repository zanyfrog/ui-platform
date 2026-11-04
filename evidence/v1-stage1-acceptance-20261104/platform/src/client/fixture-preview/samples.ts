import { routePath, matchCompositionRoute } from '../../../packages/visual-artifacts/src/composition.js';
interface SurfaceSample { heading: string; body: string; footer: string; variant: 'outlined' | 'elevated' | 'flat'; density: 'comfortable' | 'compact' }
export interface CardSample extends SurfaceSample { fixture: 'native-card-v1'; header: string; selectable: boolean; disabled: boolean; selected: boolean }
export interface PanelSample extends SurfaceSample { fixture: 'native-panel-v1'; collapsible: boolean; open: boolean }
export interface RouteSample { fixture: 'route-inspector-v1'; template: 'person' | 'project-item'; params: Record<string, string> }
export type FixtureSample = CardSample | PanelSample | RouteSample;
export class FixtureDenied extends Error { constructor(public readonly code: string) { super(code); } }
export const defaultSample = (): CardSample => ({ fixture: 'native-card-v1', heading: 'Synthetic Card', header: '', body: 'Authored synthetic slot text', footer: 'Synthetic footer', variant: 'outlined', density: 'comfortable', selectable: true, disabled: false, selected: false });
export const defaultPanelSample = (): PanelSample => ({ fixture: 'native-panel-v1', heading: 'Synthetic Panel', body: 'Synthetic Panel body', footer: 'Synthetic Panel footer', variant: 'outlined', density: 'comfortable', collapsible: true, open: true });
export const defaultRouteSample = (): RouteSample => ({ fixture: 'route-inspector-v1', template: 'person', params: { personId: 'synthetic person' } });
function data(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new FixtureDenied('SAMPLE_SCHEMA_UNSUPPORTED');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length || Object.entries(descriptors).some(([key, value]) => ['__proto__', 'constructor', 'prototype'].includes(key) || value.get || value.set)) throw new FixtureDenied('SAMPLE_FIELDS_UNSUPPORTED');
  return input as Record<string, unknown>;
}
function fields(input: Record<string, unknown>, required: string[], optional: string[] = []) {
  if (required.some(key => !Object.hasOwn(input, key)) || Object.getOwnPropertyNames(input).some(key => ![...required, ...optional].includes(key))) throw new FixtureDenied('SAMPLE_FIELDS_UNSUPPORTED');
}
function text(value: unknown, key: string, limit = 512): string {
  if (typeof value !== 'string' || value.length > limit || /[\u0000-\u001f<>]/.test(value)) throw new FixtureDenied(`SAMPLE_TEXT_INVALID:${key}`);
  return value;
}
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') throw new FixtureDenied('SAMPLE_PROPERTY_INVALID'); return value; }
const surfaceKeys = ['fixture', 'heading', 'body', 'footer', 'variant', 'density'];
const templates = Object.freeze({
  person: Object.freeze({ routeId: 'synthetic-person-route', pageId: 'synthetic-person-page', path: '/people/:personId' }),
  'project-item': Object.freeze({ routeId: 'synthetic-project-route', pageId: 'synthetic-project-page', path: '/projects/[projectId]/items/:itemId' }),
});
export function inspectRoute(sample: RouteSample) {
  const route = templates[sample.template], path = routePath(route, sample.params);
  const matched = matchCompositionRoute([route], path);
  return { template: route.path, path, matched: matched?.params ?? null };
}
/** Exact data-only schemas. Optional added Card fields retain accepted v1 defaults. */
export function validateSample(input: unknown): FixtureSample {
  const value = data(input);
  if (value.fixture === 'route-inspector-v1') {
    fields(value, ['fixture', 'template', 'params']);
    if (value.template !== 'person' && value.template !== 'project-item') throw new FixtureDenied('ROUTE_TEMPLATE_UNSUPPORTED');
    const params = data(value.params), names = value.template === 'person' ? ['personId'] : ['projectId', 'itemId'];
    fields(params, names);
    const result: RouteSample = { fixture: value.fixture, template: value.template, params: Object.fromEntries(names.map(key => {
      const item = text(params[key], key, 128); if (!item.trim()) throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);
      try { encodeURIComponent(item); } catch { throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`); }
      return [key, item];
    })) };
    inspectRoute(result); return result;
  }
  if (value.fixture !== 'native-card-v1' && value.fixture !== 'native-panel-v1') throw new FixtureDenied('FIXTURE_RENDERER_NOT_ADMITTED');
  fields(value, [...surfaceKeys, ...(value.fixture === 'native-card-v1' ? ['selectable'] : ['collapsible', 'open'])], value.fixture === 'native-card-v1' ? ['header', 'disabled', 'selected'] : []);
  const heading = text(value.heading, 'heading'), body = text(value.body, 'body'), footer = text(value.footer, 'footer');
  if (typeof value.variant !== 'string' || !['outlined', 'elevated', 'flat'].includes(value.variant) || typeof value.density !== 'string' || !['comfortable', 'compact'].includes(value.density)) throw new FixtureDenied('SAMPLE_PROPERTY_INVALID');
  const surface = { heading, body, footer, variant: value.variant as SurfaceSample['variant'], density: value.density as SurfaceSample['density'] };
  if (value.fixture === 'native-panel-v1') return { fixture: value.fixture, ...surface, collapsible: boolean(value.collapsible), open: boolean(value.open) };
  const selectable = boolean(value.selectable), selected = boolean(Object.hasOwn(value, 'selected') ? value.selected : false);
  if (selected && !selectable) throw new FixtureDenied('CARD_SELECTED_REQUIRES_SELECTABLE');
  return { fixture: value.fixture, ...surface, header: text(Object.hasOwn(value, 'header') ? value.header : '', 'header'), selectable, disabled: boolean(Object.hasOwn(value, 'disabled') ? value.disabled : false), selected };
}
export function sampleSummary(sample: FixtureSample): string {
  if (sample.fixture === 'route-inspector-v1') return JSON.stringify(inspectRoute(sample), null, 2);
  return [sample.heading, sample.fixture === 'native-card-v1' ? sample.header : '', sample.body, sample.footer].filter(Boolean).join('\n');
}
export function denyCapability(capability: string): never { throw new FixtureDenied(`FIXTURE_CAPABILITY_DENIED:${capability}`); }
export const unsupportedFixtures = Object.freeze({
  component: 'PLATFORM_COMPONENT_CAPTURE_UNAVAILABLE: protected capture prerequisites remain open',
  package: 'PACKAGE_NOT_ADMITTED: only Card and the native Panel layout fixture are admitted',
  regions: 'REGION_SCHEMA_UNSUPPORTED: composition rendering is not admitted',
  route: 'ROUTE_RENDERING_UNAVAILABLE: the pure inspector does not render Pages or Menus',
  form: 'FORM_MODE_UNSUPPORTED: create/edit Form renderer closure is not admitted',
  source: 'EXECUTABLE_SOURCE_DENIED: no source functions or imports', resource: 'RESOURCE_NOT_ADMITTED: no URL or external resource capability',
  saved: 'SAVED_CAPTURE_UNAVAILABLE: D6 acquisition and trusted revocation prerequisites remain open',
});
