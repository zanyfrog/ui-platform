import { FixturePreviewPanel } from '../../src/client/fixture-preview/panel.js';
import { defaultSample, defaultPanelSample, defaultRouteSample } from '../../src/client/fixture-preview/samples.js';
import { EditorRuntimeContext } from '../../src/client/artifact-editor/context.js';
import { renderSourceEditor, type SourceEditorState } from '../../src/client/artifact-editor/source-editor.js';
import { BuilderWorkspaceCoordinator, type WorkspaceEditorAdapter } from '../../src/client/builder-workspace/coordinator.js';
import { selectFixturePreview } from '../../src/client/builder-workspace/fixture-preview-binding.js';
import { workspaceIdentityKey, type AuthorizedWorkspaceArtifact } from '../../src/shared/builder-workspace.js';
import { configureAutosave, autosaveConfiguration } from '../../src/client/artifact-editor/autosave-configuration.js';
import { editorSessionSnapshot } from '../../src/client/artifact-editor/session.js';
import type { ArtifactEditorTransport, EditorArtifactDto, EditorSaveDto } from '../../src/shared/artifact-editor.js';

// Test-only parent realm facade: no real session or artifact endpoint exists on the fixture server.
const sessionCalls: unknown[] = [], unexpected: unknown[] = [], saves: Array<{ time: number; locator: string; changes: EditorSaveDto }> = [];
globalThis.fetch = async (url, init) => {
  if (url !== '/api/editor/session' || (init?.method ?? 'GET') !== 'GET') { unexpected.push({ url: String(url), method: init?.method }); throw new Error('TEST_PARENT_ENDPOINT_DENIED'); }
  sessionCalls.push({ url, method: 'GET' });
  return Response.json({ revision: 'synthetic-session', csrfToken: 'synthetic-not-a-credential', principal: { subjectId: 'synthetic-subject', label: 'Synthetic fixture identity', roleIds: [], applicationKeys: ['synthetic-app'], isDevelopmentFixture: true }, fixtures: [] });
};
globalThis.EventSource = class { constructor() { unexpected.push('EventSource'); throw new Error('TEST_PARENT_EVENTSOURCE_DENIED'); } } as unknown as typeof EventSource;
configureAutosave({ enabled: false, delayMs: 2000 });
function dto(locator: string): EditorArtifactDto {
  const manifest = { artifactId: `synthetic-${locator}`, artifactType: 'fixture', schemaVersion: 1, definitionVersion: 1, name: locator, files: { definition: 'one.json' } };
  return { locator, manifest, manifestContent: JSON.stringify(manifest), files: [{ path: 'one.json', role: 'definition', content: '{"synthetic":1}' }, { path: 'two.txt', role: 'notes', content: `synthetic saved ${locator}` }], checksum: `baseline-${locator}`, capabilities: { edit: true, format: true }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] } } as EditorArtifactDto;
}
const stored = new Map(['one', 'two'].map(locator => [locator, dto(locator)]));
let hold = false, release: (() => void) | undefined;
const transport: ArtifactEditorTransport = {
  load: async locator => { if (!stored.has(locator)) throw new Error('TEST_ARTIFACT_DENIED'); return structuredClone(stored.get(locator)!); },
  save: async (locator, changes) => {
    const current = stored.get(locator); if (!current || changes.expectedChecksum !== current.checksum) throw new Error('TEST_SAVE_IDENTITY_MISMATCH');
    saves.push({ time: Date.now(), locator, changes: structuredClone(changes) });
    if (hold) await new Promise<void>(resolve => { release = resolve; });
    const next = structuredClone(current);
    for (const file of next.files) if (changes.files && Object.hasOwn(changes.files, file.path)) file.content = changes.files[file.path]!;
    next.checksum += '-saved'; stored.set(locator, next); return { saved: true, artifact: structuredClone(next), validation: next.validation };
  }, validateSaved: async () => ({ valid: true, diagnostics: [] }), getReferences: async () => ({ outgoing: [] }), subscribe: () => () => {},
};
const banner = document.createElement('p'); banner.textContent = 'SYNTHETIC IN-MEMORY EDITING VERIFICATION · Existing source-editor help text below does not imply Foundation or backend access.'; document.body.append(banner);
const stage = document.createElement('div'); stage.setAttribute('aria-label', 'Actual source-editing test stage'); document.body.append(stage);
const panel = new FixturePreviewPanel(); document.body.append(panel.element);
const contexts = new Map<string, { context: EditorRuntimeContext; element: HTMLElement; sourceState: SourceEditorState; mutationCalls: string[] }>();
const artifact = (locator: string): AuthorizedWorkspaceArtifact => ({ identity: { owner: { kind: 'application', id: 'synthetic-permanent-app' }, format: 'generic', id: `synthetic-${locator}` }, applicationKey: 'synthetic-app', applicationId: 'synthetic-permanent-app', locator, name: `Synthetic ${locator}`, group: 'Other', kind: 'fixture', editable: true, generic: dto(locator) });
const coordinator = new BuilderWorkspaceCoordinator(async (_key, target) => {
  const locator = target.identity.id === 'synthetic-one' ? 'one' : target.identity.id === 'synthetic-two' ? 'two' : undefined;
  if (!locator || workspaceIdentityKey(target.identity) !== workspaceIdentityKey(artifact(locator).identity)) throw new Error('TEST_AUTHORIZATION_IDENTITY_DENIED');
  return artifact(locator);
}, async authorized => {
  const context = new EditorRuntimeContext('synthetic-app', () => transport, window);
  const mutationCalls: string[] = [];
  // Spies record forbidden Preview operations without changing the existing implementation.
  for (const name of ['flush', 'discard', 'close', 'decide', 'repairSave'] as const) {
    const method = context[name].bind(context);
    (context as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => { mutationCalls.push(name); return (method as (...args: unknown[]) => unknown)(...args); };
  }
  await context.open(authorized.locator);
  const element = document.createElement('article'); element.dataset.locator = authorized.locator;
  const sourceState: SourceEditorState = { selected: { file: 'two.txt' } };
  renderSourceEditor(element, context, sourceState);
  const record = { context, element, sourceState, mutationCalls }; contexts.set(authorized.locator, record);
  let range: [number, number] = [0, 0];
  const unsubscribe = context.subscribe(() => { if (coordinator.focused === workspaceIdentityKey(authorized.identity)) updateBinding(); });
  const adapter: WorkspaceEditorAdapter = {
    element, state: () => ({ dirty: !!context.snapshot?.dirty, pending: context.snapshot?.saveState === 'saving' }),
    async focus() { stage.replaceChildren(element); const input = element.querySelector<HTMLTextAreaElement>('.artifact-source-editor')!; input.focus(); input.setSelectionRange(...range); },
    deactivate() { const input = element.querySelector<HTMLTextAreaElement>('.artifact-source-editor'); if (input) range = [input.selectionStart, input.selectionEnd]; element.remove(); },
    suspend() { context.suspend(); element.remove(); }, guardClose: async () => !context.snapshot?.dirty,
    async dispose() { unsubscribe(); await context.discard(); await context.dispose(); element.remove(); },
  };
  return adapter;
}, () => editorSessionSnapshot()?.principal?.subjectId);
function updateBinding() {
  const tab = coordinator.focused && coordinator.tabs.get(coordinator.focused), session = editorSessionSnapshot();
  selectFixturePreview(panel, tab && session?.principal ? { artifact: tab.artifact, subjectId: session.principal.subjectId, sessionId: session.revision, dirty: tab.editor.state().dirty } : undefined);
}
coordinator.subscribe(updateBinding);
function active() { const tab = coordinator.focused && coordinator.tabs.get(coordinator.focused); if (!tab) throw new Error('TEST_NO_ACTIVE_TAB'); return contexts.get(tab.artifact.locator)!; }
function snapshot() {
  const current = active(), input = current.element.querySelector<HTMLTextAreaElement>('.artifact-source-editor')!;
  return { editor: current.context.snapshot, stored: [...stored], originalIdentity: coordinator.tabs.get(coordinator.focused!)!.artifact.identity, focusedKey: coordinator.focused, selectedFile: current.element.querySelector<HTMLSelectElement>('select')!.value, range: [input.selectionStart, input.selectionEnd], sourceText: input.value, focus: document.activeElement === input, mutationCalls: [...current.mutationCalls], saves: structuredClone(saves), autosave: autosaveConfiguration() };
}
function repaintAfterHistory() { const current = active(), input = current.element.querySelector<HTMLTextAreaElement>('.artifact-source-editor')!, range = [input.selectionStart, input.selectionEnd]; renderSourceEditor(current.element, current.context, current.sourceState); const replacement = current.element.querySelector<HTMLTextAreaElement>('.artifact-source-editor')!; replacement.focus(); replacement.setSelectionRange(range[0], range[1]); }
const api = {
  panel, coordinator, snapshot, stored, saves, sessionCalls, unexpected, defaults: { card: defaultSample, panel: defaultPanelSample, route: defaultRouteSample },
  async open(locator: 'one' | 'two') { return coordinator.open('synthetic-app', { identity: artifact(locator).identity }); },
  focusSource() { active().element.querySelector<HTMLTextAreaElement>('.artifact-source-editor')!.focus(); },
  userUndo() { active().context.undo(); repaintAfterHistory(); }, userRedo() { active().context.redo(); repaintAfterHistory(); },
  configure(enabled: boolean) { configureAutosave({ enabled, delayMs: 2000 }); }, hold() { hold = true; },
  async release() { hold = false; release?.(); for (let i = 0; i < 12; i++) await Promise.resolve(); },
  async cleanup() { hold = false; release?.(); await coordinator.dispose(); panel.dispose(); configureAutosave({ enabled: true, delayMs: 2000 }); },
};
// Populate only synthetic session state before the actual coordinator's first authorization callback.
import { refreshEditorSession } from '../../src/client/artifact-editor/session.js';
void refreshEditorSession().then(() => api.open('one')).then(() => Object.assign(window, { editingHarness: api }));
