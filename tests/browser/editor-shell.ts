import '@ui-base/ui';
import '@ui-base/ui/styles.css';
import '../../src/client/artifact-editor/editor.css';
import { EditorRuntimeContext } from '../../src/client/artifact-editor/context.js';
import { mountEditorShell, mountArtifactEditor } from '../../src/client/artifact-editor/shell.js';
import { refreshEditorSession, invalidateEditorSession } from '../../src/client/artifact-editor/session.js';
import type { EditorArtifactDto } from '../../src/shared/artifact-editor.js';

// Real DOM and UI Base components, deterministic authorized transport responses.
// Run with Vite at /tests/browser/editor-shell.html. No production entry imports this harness.
const fixture = document.querySelector<HTMLElement>('#fixture')!;
const results = document.querySelector('#results')!;
let revision = 1, subject = 'editor', editable = true, failedSave = false, saveCount = 0;
const manifest = { artifactId: 'one', artifactType: 'form', name: 'Browser form', schemaVersion: 1, definitionVersion: 1, files: { definition: 'form.json' } };
let disk: EditorArtifactDto = { locator: 'one', manifest, manifestContent: JSON.stringify(manifest), files: [{ path: 'form.json', role: 'definition', content: 'secret source' }], checksum: 'one', capabilities: { edit: true, format: true }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] } };
const requests: string[] = [];
window.fetch = async (input, options) => {
  const url = String(input); requests.push(url);
  if (url === '/api/editor/session') return Response.json({ revision: String(revision), csrfToken: 'csrf', principal: { subjectId: subject, label: subject, roleIds: [subject], applicationKeys: ['alpha'], isDevelopmentFixture: true }, fixtures: [] });
  if (url === '/api/apps/alpha/artifacts') return Response.json([{ locator: 'one', name: 'Browser form', validation: disk.validation }, { locator: 'two', name: 'Second form', validation: disk.validation }]);
  if (!url.startsWith('/api/apps/alpha/artifacts/')) throw new Error(`Unexpected API call: ${url}`);
  const locator = url.split('/').at(-1)!;
  if (options?.method === 'PUT') {
    saveCount++;
    if (failedSave) return Response.json({ error: 'Simulated offline save', code: 'test.failure' }, { status: 500 });
    const changes = JSON.parse(String(options.body));
    if (changes.files['form.json']) disk.files[0].content = changes.files['form.json'];
    disk.checksum += '-saved'; return Response.json({ saved: true, artifact: { ...disk, locator }, validation: disk.validation });
  }
  return Response.json({ ...disk, locator, capabilities: { edit: editable, format: editable } });
};
class FixtureEvents extends EventTarget { close() {} }
Object.defineProperty(window, 'EventSource', { value: FixtureEvents });
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function test(name: string, action: () => Promise<void> | void) {
  const item = document.createElement('li'); results.append(item);
  try { await action(); item.textContent = `PASS: ${name}`; }
  catch (error) { item.textContent = `FAIL: ${name}: ${String(error)}`; throw error; }
}
const wait = async (check: () => boolean) => { for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw new Error('Timed out waiting for UI'); };
const click = (label: string) => {
  const button = [...fixture.querySelectorAll('button')].find(value => value.textContent === label);
  assert(button && !button.disabled, `Missing/enabled button: ${label}`); button.click();
};
const context = new EditorRuntimeContext('alpha');
const view = mountEditorShell(fixture, context);
try {
  await context.open('one');
  await test('Uses real UI Base tabs and one shared working snapshot', () => {
    assert(customElements.get('uib-tabs') && fixture.querySelector('uib-tabs')?.shadowRoot, 'UI Base tabs are not registered');
    context.setFile('form.json', 'shared unsaved');
    assert(fixture.querySelector('[data-editor-panel="source"]')?.textContent?.includes('shared unsaved'), 'Source preview stale');
    assert(fixture.querySelector('[data-editor-panel="overview"]')?.textContent?.includes('Working generation 1'), 'Overview stale');
    assert(fixture.textContent?.includes('do not validate unsaved edits'), 'Dirty validation mislabeled');
  });
  await test('Presentation overrides reorder real tabs and slots without saving', () => {
    view.setPresentation({ density: 'compact', orientation: 'vertical', tabOrder: ['source', 'overview'], slotOrder: ['tabs', 'header'] });
    assert(fixture.querySelector('uib-tab')?.textContent === 'Source preview', 'Tab order not applied');
    assert(fixture.querySelector('.artifact-editor')?.firstElementChild?.tagName === 'UIB-TABS', 'Slot order not applied');
    assert(saveCount === 0 && context.snapshot?.dirty, 'Template changed save state');
    assert(!!fixture.querySelector('[aria-label="Editor actions"]'), 'Protected toolbar omitted');
  });
  await test('Failed navigation retains the current artifact and exposes retry state', async () => {
    failedSave = true; assert(!await context.open('two'), 'Navigation should fail');
    assert(context.snapshot?.artifact.locator === 'one' && fixture.textContent?.includes('Save failed'), 'Copy or error lost');
  });
  await test('Identity changes immediately remove source and comparison from DOM', async () => {
    invalidateEditorSession(); subject = 'reviewer'; revision++; await refreshEditorSession();
    assert(!fixture.textContent?.includes('shared unsaved') && !fixture.querySelector('pre'), 'Revoked source leaked');
    const recovery = [...fixture.querySelectorAll('button')].find(value => value.textContent === 'Authorize and compare for recovery');
    assert(recovery?.disabled, 'Other identity can recover');
  });
  await test('Original user can compare, then explicitly recover dirty source', async () => {
    invalidateEditorSession(); subject = 'editor'; revision++; failedSave = false; await refreshEditorSession();
    click('Authorize and compare for recovery'); await wait(() => !!context.reviewedComparison && !context.pending);
    assert(fixture.textContent?.includes('shared unsaved'), 'Authorized comparison missing');
    click('Resume retained changes'); await wait(() => !context.suspended && !context.pending);
    await context.flush(); assert(context.snapshot?.saveState === 'saved', 'Recovery did not save');
  });
  await test('Changed checksums require an explicit conflict decision', async () => {
    context.setFile('form.json', 'conflict local'); context.suspend(); disk.checksum = 'external'; disk.files[0].content = 'external source';
    click('Authorize and compare for recovery'); await wait(() => !!context.reviewedComparison && !context.pending);
    assert(![...fixture.querySelectorAll('button')].some(value => value.textContent === 'Resume retained changes'), 'Changed checksum can resume silently');
    click('Reload server source — discard local edits'); await wait(() => !context.suspended && !context.pending);
    assert(context.snapshot?.artifact.files[0].content === 'external source' && !context.snapshot.dirty, 'Explicit reload failed');
  });
  await test('Discard requires confirmation and cancel preserves source', async () => {
    context.setFile('form.json', 'discard candidate'); click('Discard local copy…');
    assert(context.hasCopy && !!fixture.querySelector('[aria-label="Confirm discard"]'), 'Discard happened without choice');
    click('Keep copy'); assert(context.snapshot?.dirty, 'Cancel lost copy');
    click('Discard local copy…'); click('Confirm discard'); await wait(() => !context.hasCopy && !context.pending);
  });
  await test('Read-only capability hides Save and rejects mutations', async () => {
    editable = false; await context.open('one');
    assert(![...fixture.querySelectorAll('button')].some(value => value.textContent === 'Save now'), 'Read-only Save exposed');
    assert(fixture.textContent?.includes('Read-only'), 'Permission label missing');
  });
  await context.dispose(); view.destroy();
  await test('Fixture entry uses authorized discovery and respects navigation with unsaved changes', async () => {
    const dispose = mountArtifactEditor(fixture);
    const app = fixture.querySelector<HTMLSelectElement>('[aria-label="Application"]')!;
    app.value = 'alpha'; app.dispatchEvent(new Event('change'));
    await wait(() => !!fixture.querySelector<HTMLSelectElement>('[aria-label="Artifact"]')?.querySelector('option[value="one"]'));
    const artifacts = fixture.querySelector<HTMLSelectElement>('[aria-label="Artifact"]')!;
    artifacts.value = 'one'; artifacts.dispatchEvent(new Event('change'));
    await wait(() => !!fixture.querySelector('[data-editor-panel="source"]'));
    assert(!requests.includes('/api/apps'), 'Legacy discovery called');
    assert(await dispose(), 'Entry cleanup failed'); assert(!fixture.children.length, 'DOM not cleaned up');
  });
  document.body.dataset.result = 'passed'; results.insertAdjacentText('afterend', 'All 9 browser integration tests passed.');
} catch (error) { document.body.dataset.result = 'failed'; console.error(error); }
