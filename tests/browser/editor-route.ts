import '@ui-base/ui';
import '@ui-base/forms';
import '@ui-base/ui/styles.css';
import '../../src/client/artifact-editor/editor.css';
import { EditorRuntimeContext } from '../../src/client/artifact-editor/context.js';
import { mountEditorShell } from '../../src/client/artifact-editor/shell.js';
import { refreshEditorSession } from '../../src/client/artifact-editor/session.js';
import type { EditorArtifactDto } from '../../src/shared/artifact-editor.js';

const fixture = document.querySelector<HTMLElement>('#fixture')!, results = document.querySelector('#results')!;
const descriptor = { id: 'route-v1', artifactType: 'route', definitionVersion: 1, sections: [
  { id: 'identity', label: 'Artifact properties', target: 'manifest' as const, fields: [{ id: 'name', label: 'Name', path: ['name'], control: 'text' }] },
  { id: 'configuration', label: 'Configuration', target: 'manifest' as const, fields: [{ id: 'route-path', label: 'Route path', path: ['config', 'path'], control: 'text' }, { id: 'page', label: 'Page reference', path: ['config', 'page'], control: 'text' }] },
] };
let disk: EditorArtifactDto = { locator: 'route', manifest: { artifactId: 'route', artifactType: 'route', schemaVersion: 1, definitionVersion: 1, name: 'Route', files: {}, config: { path: 'home', page: 'home' } }, manifestContent: '', files: [], checksum: 'route-1', capabilities: { edit: true, format: true }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] }, presentation: descriptor };
disk.manifestContent = JSON.stringify(disk.manifest);
window.fetch = async (input, options) => {
  if (String(input) === '/api/editor/session') return Response.json({ revision: '1', csrfToken: 'csrf', principal: { subjectId: 'editor', label: 'editor', roleIds: ['editor'], applicationKeys: ['alpha'], isDevelopmentFixture: true }, fixtures: [] });
  if (options?.method === 'PUT') { const changes = JSON.parse(String(options.body)); if (typeof changes.manifest === 'string') { disk.manifestContent = changes.manifest; disk.manifest = JSON.parse(changes.manifest); } disk.checksum += '-saved'; return Response.json({ saved: true, artifact: disk, validation: disk.validation }); }
  return Response.json(disk);
};
class FixtureEvents extends EventTarget { close() {} }
Object.defineProperty(window, 'EventSource', { value: FixtureEvents });
const context = new EditorRuntimeContext('alpha'); mountEditorShell(fixture, context);
const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message); };
const test = async (name: string, check: () => void | Promise<void>) => { const item = document.createElement('li'); results.append(item); try { await check(); item.textContent = `PASS: ${name}`; } catch (error) { item.textContent = `FAIL: ${name}: ${String(error)}`; throw error; } };
try {
  await refreshEditorSession(); await context.open('route');
  await test('Route proof editor, Properties and Source share the route working copy', () => {
    const tab = [...fixture.querySelectorAll<HTMLElement>('uib-tab')].find(value => value.textContent === 'Route designer')!; assert(tab, 'Route designer tab missing'); tab.click();
    const input = fixture.querySelector<HTMLInputElement>('[aria-label="Route path proof editor"]')!; assert(input && input.value === 'home', 'Route proof control missing'); input.value = 'account'; input.dispatchEvent(new Event('input', { bubbles: true }));
    assert(context.snapshot?.artifact.manifest?.config?.path === 'account', 'Route proof did not update shared manifest');
    const properties = fixture.querySelector<HTMLInputElement>('[data-editor-panel="plugin:configuration:properties"] [aria-label="Route path"]')!; assert(properties?.value === 'account', 'Properties did not observe route proof edit');
    const source = fixture.querySelector<HTMLTextAreaElement>('[aria-label="Source for artifact.json"]')!; assert(source.value.includes('account'), 'Source did not observe route proof edit');
  });
  await context.flush(); assert(context.snapshot?.saveState === 'saved', 'Route proof save did not use existing autosave/format transaction');
  document.body.dataset.result = 'passed'; results.after(document.createTextNode('WP5 Route proof browser test passed.'));
} catch (error) { document.body.dataset.result = 'failed'; console.error(error); }
