import '@ui-base/ui';
import '@ui-base/forms';
import '@ui-base/ui/styles.css';
import '../../src/client/artifact-editor/editor.css';
import { EditorRuntimeContext } from '../../src/client/artifact-editor/context.js';
import { mountEditorShell } from '../../src/client/artifact-editor/shell.js';
import { createDefaultEditorPlugins } from '../../src/client/artifact-editor/default-plugins.js';
import { invalidateEditorSession, refreshEditorSession } from '../../src/client/artifact-editor/session.js';
import type { EditorArtifactDto } from '../../src/shared/artifact-editor.js';
import type { EditorPresentationDescriptor } from '../../src/shared/editor-presentation.js';

const fixture = document.querySelector<HTMLElement>('#fixture')!, results = document.querySelector('#results')!;
const descriptor: EditorPresentationDescriptor = { id: 'browser-form', artifactType: 'form', definitionVersion: 1, preferredEditorIds: ['missing-optional'], sections: [
  { id: 'identity', label: 'Artifact', target: 'manifest', fields: [{ id: 'name', label: 'Name', path: ['name'], control: 'text' }] },
  { id: 'configuration', label: 'Configuration', target: 'manifest', fields: [{ id: 'amount', label: 'Amount', path: ['config', 'amount'], control: 'number', visibleWhen: { path: ['config', 'active'], equals: true } }, { id: 'active', label: 'Active', path: ['config', 'active'], control: 'boolean' }] },
  { id: 'form-fields', label: 'Fields', target: 'file', role: 'definition', fields: [{ id: 'fields', label: 'Fields', control: 'collection', path: ['fields'], itemKeys: ['id', 'field'], fields: [{ id: 'label', label: 'Field label', path: ['label'], control: 'text' }, { id: 'validators', label: 'Validators', path: ['validators'], control: 'collection', itemKeys: ['validator'], fields: [{ id: 'max', label: 'Maximum length', path: ['max'], control: 'number' }] }] }] },
] };
let subject = 'editor', revision = 1, editable = true, saves = 0;
const manifest = { artifactId: 'form', artifactType: 'form', schemaVersion: 1, definitionVersion: 1, name: 'Form', files: { definition: 'form.json' }, config: { amount: 20, active: true } };
const validFile = '{"fields":[{"id":"permanent-a","field":"lastName","type":"text","label":"Last name","x:extension":{"preserve":true},"validators":[{"validator":"max-length","max":25}]}]}';
let disk: EditorArtifactDto = { locator: 'one', manifest, manifestContent: JSON.stringify(manifest), files: [{ path: 'form.json', role: 'definition', content: validFile }], checksum: 'baseline', capabilities: { edit: true, format: true }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] }, presentation: descriptor };
window.fetch = async (input, options) => {
  if (String(input) === '/api/editor/session') return Response.json({ revision: String(revision), csrfToken: 'csrf', fixtures: [], principal: { subjectId: subject, label: subject, roleIds: [subject], applicationKeys: ['alpha'], isDevelopmentFixture: true } });
  if (options?.method === 'PUT') {
    saves++; const changes = JSON.parse(String(options.body));
    if (changes.manifest !== undefined) { disk.manifestContent = changes.manifest; try { disk.manifest = JSON.parse(changes.manifest); } catch { disk.manifest = null; } }
    if (changes.files?.['form.json'] !== undefined) disk.files[0].content = changes.files['form.json'];
    disk.checksum += 'x'; return Response.json({ saved: true, artifact: disk, validation: disk.validation });
  }
  return Response.json({ ...disk, capabilities: { edit: editable, format: editable } });
};
class FixtureEvents extends EventTarget { close() {} }
Object.defineProperty(window, 'EventSource', { value: FixtureEvents });
const context = new EditorRuntimeContext('alpha'), plugins = createDefaultEditorPlugins();
const unhandled: unknown[] = [];
window.addEventListener('unhandledrejection', event => { unhandled.push(event.reason); });
let cleaned = 0;
plugins.register({ id: 'broken', artifactTypes: ['form'], definitionVersions: [1], contributes: [{ id: 'tab', label: 'Broken plugin', slot: 'tab' }] }, {
  tab: (_container, _context, scope) => { scope.onCleanup(() => { cleaned++; throw new Error('cleanup failure'); }); throw new Error('mount failure'); },
});
plugins.register({ id: 'events', artifactTypes: ['form'], definitionVersions: [1], contributes: [{ id: 'action', label: 'Edit action', slot: 'toolbar', requiresEdit: true }] }, {
  action: (container, _context, scope) => { const button = document.createElement('button'); button.textContent = 'Fail action'; container.append(button); scope.listen(button, 'click', async () => { throw new Error('async event failure'); }); },
});
plugins.register({ id: 'async-failure', artifactTypes: ['form'], definitionVersions: [1], contributes: [{ id: 'tab', label: 'Async failure', slot: 'tab' }] }, {
  tab: async (_container, _context, scope) => { scope.onCleanup(async () => { throw new Error('async cleanup'); }); await Promise.resolve(); throw new Error('async mount'); },
});
plugins.register({ id: 'subscription-failure', artifactTypes: ['form'], definitionVersions: [1], contributes: [{ id: 'tab', label: 'Subscription failure', slot: 'tab' }] }, {
  tab: (_container, _context, scope) => { scope.subscribe(() => { throw new Error('subscription failure'); }); },
});
const view = mountEditorShell(fixture, context, {}, plugins);
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
async function test(name: string, action: () => Promise<void> | void) { const row = document.createElement('li'); results.append(row); try { await action(); row.textContent = `PASS: ${name}`; } catch (error) { row.textContent = `FAIL: ${name}: ${String(error)}`; throw error; } }
function input(panel: string, label: string, value: string) {
  const panelElement = fixture.querySelector<HTMLElement>(`[data-editor-panel="${panel}"]`)!;
  [...fixture.querySelectorAll<HTMLElement>('uib-tab')].find(tab => tab.getAttribute('aria-controls') === panelElement.id)?.click();
  const control = fixture.querySelector<HTMLInputElement>(`[data-editor-panel="${panel}"] [aria-label="${label}"]`)!;
  assert(control && !control.disabled, `Missing editable field ${label}`); control.focus(); control.value = value; control.setSelectionRange?.(value.length, value.length); control.dispatchEvent(new Event('input', { bubbles: true }));
}
try {
  await context.open('one');
  await test('Descriptor-driven fields use UI Base wrappers and multiple plugins share one context', () => {
    assert(fixture.querySelector('uib-forms-field')?.shadowRoot, 'UI Base field wrapper not mounted');
    assert(fixture.querySelector('[data-editor-panel="plugin:configuration:properties"]') && fixture.querySelector('[data-editor-panel="plugin:form-fields:properties"]'), 'Plugin tabs missing');
    input('properties', 'Name', 'Updated name');
    assert(context.snapshot?.artifact.manifest?.name === 'Updated name', 'Name not updated');
    assert(fixture.querySelector('[data-editor-panel="source"]')?.textContent?.includes('Updated name'), 'Source panel not synchronized');
    input('properties', 'Amount', '42');
    assert(fixture.querySelector<HTMLInputElement>('[data-editor-panel="plugin:configuration:properties"] [aria-label="Amount"]')?.value === '42', 'Plugin field stale');
    input('plugin:form-fields:properties', 'Field label', 'New last name');
    assert(fixture.querySelector<HTMLInputElement>('[data-editor-panel="properties"] [aria-label="Field label"]')?.value === 'New last name', 'Properties field stale');
    assert(context.snapshot?.artifact.files[0].content.includes('"preserve":true'), 'Unknown content lost');
  });
  await test('Repeated input preserves focus and incomplete numeric drafts stay in the shared source', () => {
    // Select the properties tab so browser focus can be restored to its visible control.
    input('properties', 'Amount', '-');
    assert((document.activeElement as HTMLElement)?.dataset.editorFocus?.includes('amount'), 'Focus lost on field update');
    input('properties', 'Amount', '-3');
    assert(context.snapshot?.artifact.manifest?.config?.amount === -3, 'Second input failed');
    input('properties', 'Amount', '-');
    assert(context.snapshot?.artifact.manifest?.config?.amount === '-', 'Invalid draft was coerced or discarded');
    assert(fixture.textContent?.includes('Editing draft') && fixture.textContent?.includes('do not validate unsaved edits'), 'Editing and saved diagnostics conflated');
  });
  await test('Validator configuration preview uses the shared validator and does not block invalid drafts', () => {
    input('properties', 'Maximum length', '0');
    assert(fixture.textContent?.includes('max-length requires a positive integer max.'), 'Shared validator preview missing');
    assert(JSON.parse(context.snapshot!.artifact.files[0].content).fields[0].validators[0].max === 0, 'Invalid configuration was blocked');
    const boolean = fixture.querySelector<HTMLSelectElement>('[data-editor-panel="properties"] [aria-label="Active"]')!;
    boolean.value = 'false'; boolean.dispatchEvent(new Event('change'));
    assert(!fixture.querySelector('[aria-label="Amount"]'), 'Conditional field stayed visible');
    const latest = context.snapshot!.artifact.manifest!; context.setManifest(JSON.stringify({ ...latest, config: { ...latest.config, active: true } }));
    assert(fixture.querySelector('[aria-label="Amount"]'), 'Conditional field did not restore');
  });
  await test('Invalid and unsupported structured source remains intact and compatible regions remain editable', () => {
    context.setFile('form.json', '{broken');
    assert(fixture.textContent?.includes('Invalid JSON source'), 'Invalid state missing');
    input('properties', 'Name', 'Still editable'); assert(context.snapshot?.artifact.files[0].content === '{broken', 'Invalid JSON lost');
    context.setFile('form.json', '{"fields":{"extension":"keep"}}');
    assert(fixture.textContent?.includes('Unsupported visual structure'), 'Unsupported state missing');
    assert(context.snapshot?.artifact.files[0].content === '{"fields":{"extension":"keep"}}', 'Unsupported source changed');
    context.setFile('form.json', validFile); assert(fixture.querySelector('[aria-label="Field label"]'), 'Fields did not recover after source repaired');
  });
  await test('Missing/incompatible plugins and mount, event, cleanup failures leave other panels usable', async () => {
    assert(fixture.textContent?.includes('missing-optional') && fixture.textContent?.includes('Editor plugin failed'), 'Plugin diagnostics missing');
    const button = [...fixture.querySelectorAll('button')].find(button => button.textContent === 'Fail action')!; button.click(); await Promise.resolve(); await Promise.resolve();
    assert(fixture.querySelector('[data-editor-contribution="plugin:events:action"]')?.textContent?.includes('Editor plugin failed'), 'Async error escaped boundary');
    input('properties', 'Name', 'After failure'); assert(context.snapshot?.artifact.manifest?.name === 'After failure' && cleaned > 0, 'Failure broke shared host');
    const unregister = plugins.register({ id: 'future', artifactTypes: ['form'], definitionVersions: [2], contributes: [{ id: 'tab', label: 'Future', slot: 'tab' }] }, { tab: () => {} });
    assert(fixture.textContent?.includes('incompatible definition version'), 'Incompatible plugin missing explanation'); unregister();
  });
  await test('Permission changes remove all plugin/field source and original-user recovery restores dirty edits', async () => {
    invalidateEditorSession(); subject = 'reviewer'; revision++; await refreshEditorSession();
    assert(!fixture.querySelector('input') && !fixture.querySelector('pre') && !fixture.textContent?.includes('After failure'), 'Revoked source still mounted');
    let denied = false; try { await context.compare(); } catch { denied = true; } assert(denied, 'Other identity could recover');
    invalidateEditorSession(); subject = 'editor'; revision++; await refreshEditorSession(); await context.compare(); await context.decide('resume');
    assert(fixture.querySelector<HTMLInputElement>('[data-editor-panel="properties"] [aria-label="Name"]')?.value === 'After failure', 'Recovered properties stale');
  });
  await test('Read-only recovery disables fields and removes edit-only plugin actions', async () => {
    await context.flush(); context.suspend(); editable = false; await context.compare(); await context.decide('reload');
    assert([...fixture.querySelectorAll<HTMLInputElement>('input,textarea,select')].every(input => input.disabled), 'Read-only fields enabled');
    assert(!fixture.querySelector('[data-editor-contribution="plugin:events:action"]'), 'Edit-only plugin exposed');
    context.suspend(); editable = true; await context.compare(); await context.decide('reload');
  });
  await test('Malformed manifests and unknown descriptor versions preserve raw content without invented controls', () => {
    context.setManifest('{broken'); assert(!fixture.querySelector('input') && fixture.textContent?.includes('manifest is malformed'), 'Malformed manifest controls invented');
    assert(context.snapshot?.artifact.manifestContent === '{broken', 'Malformed manifest source lost');
    context.setManifest(JSON.stringify({ ...manifest, definitionVersion: 99 }));
    assert(fixture.textContent?.includes('No compatible property descriptor'), 'Version mismatch not detected');
  });
  await context.discard(); await context.dispose(); view.destroy();
  await test('Panel/plugin cleanup releases the DOM and leaves a single Phase 1 save sequence', () => {
    assert(!fixture.children.length && cleaned > 0, 'Panel cleanup missing'); assert(saves === 1, 'Independent save path detected'); assert(unhandled.length === 0, 'Plugin failure escaped isolation');
  });
  document.body.dataset.result = 'passed'; const done = document.createElement('p'); done.textContent = 'All 9 WP3 browser integration tests passed.'; results.after(done);
} catch (error) { document.body.dataset.result = 'failed'; console.error(error); }
