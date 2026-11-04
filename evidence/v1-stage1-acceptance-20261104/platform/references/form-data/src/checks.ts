import '@ui-base/forms';
import { components } from 'virtual:uip-visual-artifacts';
import { mountVisualArtifact } from '@ui-platform/visual-artifacts/runtime';
import { generateForm } from '@ui-platform/visual-artifacts';
import schema from '../person.dataset.json';
import type { ArtifactMetadata, RuntimeArtifact } from '@ui-platform/visual-artifacts';
const results: string[] = [];
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); results.push(`PASS: ${message}`); };
const artifact = components.find(component => component.metadata.componentId === 'cmp_platform_person_form_reference')!;
const metadata = artifact.metadata as ArtifactMetadata & { form: NonNullable<ArtifactMetadata['form']>; public: NonNullable<ArtifactMetadata['public']> };
const wait = (event: Promise<void>, instance: { state: Record<string, unknown> }) => Promise.race([event, new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Submit event missing: ' + JSON.stringify(instance.state))), 5000))]);
async function run() {
  const initialRecord = { id: 'person-one', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test', status: 'pending', internalNotes: 'retain' };
  const writes: unknown[] = [], events: string[] = [];
  let fail = false;
  const services = { 'dataset.write': async (input: unknown) => { writes.push(input); return fail ? { success: false, committed: false, errors: ['denied'] } : { success: true, committed: true }; }, 'dataset.read': async () => [{ ...initialRecord, firstName: 'Augusta' }] };
  const instance = mountVisualArtifact(artifact, { components: [], packages: [], inputs: { operation: 'edit', initialRecord }, services, fieldAuthorization: { [metadata.form.datasetId]: { internalNotes: { write: false } } } });
  document.body.append(instance.host);
  const control = (key: string) => instance.root.querySelector<HTMLElement>(`[data-uip-node="control_${key}"]`)!;
  check(control('status').hidden, 'default/public mode is restrictive');
  check(control('firstName').getAttribute('value') === 'Ada', 'initial record populates Package control');
  instance.update({ mode: 'admin', operation: 'edit', initialRecord });
  check(!control('status').hidden, 'selected admin mode overrides default visibility');
  check(control('internalNotes').hasAttribute('disabled'), 'host authorization overrides admin editability');
  instance.update({ mode: 'public', operation: 'edit', initialRecord });
  check((instance.state.values as typeof initialRecord).internalNotes === 'retain', 'hidden/read-only values survive mode changes');
  for (const name of Object.keys(metadata.public.events)) instance.host.addEventListener(name, () => events.push(name));
  const change = (key: string, value: string) => { const element = control(key) as unknown as HTMLElement & { value: string }; element.value = value; element.dispatchEvent(new Event('input', { bubbles: true, composed: true })); };
  const submit = () => instance.root.querySelector('[data-uip-node="form"]')!.dispatchEvent(new CustomEvent('uib-forms-form-submit', { detail: { valid: true }, bubbles: true, composed: true }));
  change('firstName', 'Augusta');
  const done = new Promise<void>(resolve => instance.host.addEventListener('submitSucceeded', () => resolve(), { once: true })); submit(); await wait(done, instance);
  check(JSON.stringify((writes[0] as { records: unknown[] }).records) === JSON.stringify([{ id: 'person-one', firstName: 'Augusta' }]), 'update submits only permitted changed fields and identity');
  check(events.includes('submitStarted') && events.includes('recordUpdated'), 'success state emits declared public events');
  await Promise.resolve(); check(instance.state.submitted && !instance.state.dirty && !instance.state.submitting, 'success updates local state');
  fail = true; change('firstName', 'Rejected');
  const rejected = new Promise<void>(resolve => instance.host.addEventListener('submitFailed', () => resolve(), { once: true })); submit(); await wait(rejected, instance); await Promise.resolve();
  check(Boolean(instance.state.submitError) && !instance.state.submitting, 'backend failure produces state and public failure event');
  const before = writes.length; change('firstName', ''); submit(); await Promise.resolve();
  check(writes.length === before && Object.keys(instance.state.validation as object).length > 0, 'required validation prevents adapter invocation');
  instance.destroy();

  // Exercise the actual renderer/runtime with controls removed by both direct
  // and ancestor conditions. Adapters capture payloads; protected persistence
  // and tamper denial are separately exercised by the WP4 browser journey.
  for (const operation of ['create', 'edit']) {
    // A fresh test artifact, not a clone of a pinned managed source revision.
    const m = { schemaVersion: 1, artifactId: `art_hidden_${operation}`, componentId: `cmp_platform_hidden_${operation}`, kind: 'component', name: `hidden-${operation}`, displayName: 'Hidden submission test' } as typeof metadata;
    const files = generateForm(m, schema);
    m.state = { ...m.state, show: true };
    m.conditions = [{ node: 'control_firstName', when: 'local.show' }, { node: 'row_lastName', when: 'local.show' }];
    m.modes = { default: 'public', overrides: { public: { control_email: { visible: false }, control_status: { visible: false } }, admin: { control_email: { visible: true } } } };
    m.form.fields.find(f => f.key === 'status')!.calculation = { persist: true, expression: { version: 1, expression: { kind: 'literal', value: 'computed' } } };
    const payloads: Array<{ records: Record<string, unknown>[] }> = [];
    let saved = { ...initialRecord } as Record<string, unknown>;
    const hidden = mountVisualArtifact({ metadata: m, source: files.source, css: files.css }, { components: [], packages: [], inputs: { mode: 'admin', operation, initialRecord },
      fieldAuthorization: { [m.form.datasetId]: { internalNotes: operation === 'create' ? { write: false } : { read: false } } },
      services: { 'dataset.write': async input => { const payload = input as typeof payloads[number]; payloads.push(payload); saved = { ...saved, ...payload.records[0] }; return { success: true, committed: true }; }, 'dataset.read': async () => [saved] } });
    document.body.append(hidden.host);
    const edit = (key: string, value: string) => { const element = hidden.root.querySelector<HTMLElement & { value: string }>(`[data-uip-node="control_${key}"]`)!; element.value = value; element.dispatchEvent(new Event('input', { bubbles: true, composed: true })); };
    edit('firstName', 'Retained first'); edit('lastName', 'Retained last'); edit('email', 'hidden@example.test');
    (hidden.state.values as Record<string, unknown>).internalNotes = 'crafted';
    hidden.state.show = false; hidden.update({ mode: 'public', operation, initialRecord });
    check(!hidden.root.querySelector('[data-uip-node="control_firstName"]') && !hidden.root.querySelector('[data-uip-node="row_lastName"]'), `${operation}: direct and ancestor conditions remove controls`);
    check(hidden.root.querySelector<HTMLElement>('[data-uip-node="control_email"]')!.hidden, `${operation}: mode hides the retained email`);
    const completed = new Promise<void>(resolve => hidden.host.addEventListener('submitSucceeded', () => resolve(), { once: true }));
    hidden.root.querySelector('[data-uip-node="form"]')!.dispatchEvent(new CustomEvent('uib-forms-form-submit', { detail: { valid: true }, bubbles: true, composed: true }));
    await wait(completed, hidden); await Promise.resolve();
    const record = payloads[0].records[0];
    check(record.firstName === 'Retained first' && record.lastName === 'Retained last' && record.email === 'hidden@example.test', `${operation}: condition-hidden and mode-hidden values submit`);
    check(record.status === 'computed' && !Object.hasOwn(record, 'internalNotes'), `${operation}: hidden calculated value submits while host-denied value is excluded`);
    hidden.state.show = true; hidden.update({ mode: 'admin', operation, initialRecord });
    check(hidden.root.querySelector('[data-uip-node="control_firstName"]')!.getAttribute('value') === 'Retained first', `${operation}: revealing the field preserves its value`);
    (hidden.state.values as Record<string, unknown>).firstName = ''; hidden.state.show = false; hidden.update({ mode: 'public', operation, initialRecord });
    const invalid = new Promise<void>(resolve => hidden.host.addEventListener('submitFailed', () => resolve(), { once: true }));
    hidden.root.querySelector('[data-uip-node="form"]')!.dispatchEvent(new CustomEvent('uib-forms-form-submit', { detail: { valid: true }, bubbles: true, composed: true }));
    await wait(invalid, hidden); await Promise.resolve();
    check(payloads.length === 1 && Object.hasOwn(hidden.state.validation as object, 'field_person-firstName'), `${operation}: hidden required field still blocks invalid submission`);
    hidden.destroy();
  }

  const page: RuntimeArtifact = { metadata: { schemaVersion: 1, artifactId: 'art_mode_binding_test', kind: 'page', name: 'mode-test', displayName: 'Mode test', route: '/test', state: { mode: 'public' }, bindings: [{ node: 'person', target: 'property:mode', value: 'local.mode' }], events: [{ node: 'switch', event: 'click', actions: [{ kind: 'set', state: 'mode', value: { literal: 'admin' } }] }] }, source: '<div class="uip-layout-item" data-uip-node="root"><button data-uip-node="switch">Switch mode</button><uip-component data-uip-node="person" data-uip-component="cmp_platform_person_form_reference"></uip-component></div>', css: '' };
  const parent = mountVisualArtifact(page, { components: [artifact], packages: [], services }); document.body.append(parent.host);
  const child = parent.root.querySelector<HTMLElement>('[data-uip-node="person"]')!;
  parent.root.querySelector<HTMLButtonElement>('button')!.click(); await Promise.resolve();
  check(!child.shadowRoot!.querySelector<HTMLElement>('[data-uip-node="control_status"]')!.hidden, 'existing expression/event model dynamically binds mode without duplicating Form');
  parent.destroy();
  document.querySelector('#results')!.textContent = results.join('\n'); document.body.dataset.result = 'passed';
}
run().catch(error => { document.querySelector('#results')!.textContent = results.join('\n') + '\nFAIL: ' + String(error); document.body.dataset.result = 'failed'; });
