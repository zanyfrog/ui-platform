import { workspaceIdentityKey, type WorkspaceArtifact, type WorkspaceTarget } from '../../shared/builder-workspace.js';
import { BuilderWorkspaceCoordinator } from './coordinator.js';
import { mountWorkspaceEditor } from './adapters.js';
import { authorizeWorkspace, workspaceRequest } from './requests.js';
import { editorSessionSnapshot, subscribeEditorSession, retainDevelopmentWorkspaceSession, createEditorSessionBinding } from '../artifact-editor/session.js';
import '../artifact-editor/editor.css';
import './workspace.css';
import type { EditorRuntimeContext } from '../artifact-editor/context.js';
import { editForm, formSource } from '../artifact-editor/form-editor.js';
import type { WorkspaceLinkOrigin } from './coordinator.js';
import { chooseFormCreation } from '../artifact-editor/form-creation.js';
import { chooseVisualCreation } from '../visual-artifacts/creation.js';

const shell = document.createElement('section'); shell.className = 'builder-workspace'; shell.setAttribute('aria-label', 'Application Builder workspace');
shell.innerHTML = `<header><button data-collapse aria-expanded="true">Application navigation</button><strong data-title></strong><button data-refresh>Refresh artifacts</button><button data-create-dataset>Create Dataset</button><button data-create-form>Create Form</button><button data-return-link hidden>Return and link Dataset to Form</button><button data-cancel-link hidden>Cancel Dataset link</button></header>
  <p data-status role="status"></p><div class="workspace-layout"><nav aria-label="Application artifacts"></nav><section class="workspace-main"><div role="tablist" aria-label="Open artifacts"></div><div data-stage></div></section></div>`;
const find = <T extends HTMLElement>(selector: string) => shell.querySelector<T>(selector)!;
for (const operation of ['Create Menu', 'Upload Application asset']) {
  const button = document.createElement('button'); button.textContent = operation; find('header').append(button);
  button.onclick = () => run(async () => {
    const key = applicationKey, binding = createEditorSessionBinding();
    const owner = discovery[0]?.applicationId; if (!owner) throw new Error('Refresh and authorize the Application before continuing.');
    if (operation === 'Create Menu') {
      const name = prompt('Menu name:'); if (!name?.trim()) return;
      const id = `menu-${crypto.randomUUID()}`, locator = `menus/${id}.json`;
      const response = await fetch(`/api/apps/${encodeURIComponent(key)}/composition-source?path=${encodeURIComponent(locator)}`, { method: 'PUT', headers: { ...await binding.headers(), 'x-editor-application-id': owner, 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'normal', content: JSON.stringify({ schemaVersion: 1, menuId: id, name: name.trim(), items: [] }, null, 2) + '\n', expectedHash: null }) });
      const value = await response.json(); binding.assert(); if (!response.ok) throw new Error(value.error ?? 'Menu creation denied.');
      if (parked || key !== applicationKey) return; await discover(); const created = discovery.find(item => item.locator === locator); if (created) await navigate({ identity: created.identity });
    } else {
      const upload = await new Promise<{ file: File; path: string } | undefined>(resolve => {
        const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Upload Application asset');
        dialog.innerHTML = '<form method="dialog"><label>Application asset<input type="file" required></label><label>Asset source path<input name="path" value="assets/images/image.png" required></label><button>Upload asset</button><button type="button">Cancel</button></form>';
        const file = dialog.querySelector<HTMLInputElement>('[type=file]')!, path = dialog.querySelector<HTMLInputElement>('[name=path]')!;
        file.onchange = () => { if (file.files?.[0]) path.value = 'assets/images/' + file.files[0].name.toLowerCase().replace(/[^a-z0-9.\-]/g, '-'); };
        let result: { file: File; path: string } | undefined;
        dialog.querySelector('form')!.onsubmit = event => { event.preventDefault(); if (file.files?.[0]) { result = { file: file.files[0], path: path.value }; dialog.close(); } };
        dialog.querySelector<HTMLButtonElement>('[type=button]')!.onclick = () => dialog.close(); dialog.onclose = () => { dialog.remove(); resolve(result); }; document.body.append(dialog); dialog.showModal();
      });
      if (!upload || parked || key !== applicationKey) return;
      const headers = { ...await binding.headers(), 'x-editor-application-id': owner };
      const endpoint = `/api/apps/${encodeURIComponent(key)}/composition-asset`;
      const info = await fetch(`${endpoint}?info=1&path=${encodeURIComponent(upload.path)}`, { headers }); const current = await info.json(); binding.assert(); if (!info.ok) throw new Error(current.error ?? 'Asset selection denied.');
      if (current.hash && !confirm(`Replace the existing Application asset at ${upload.path}?`)) return;
      const data = new FormData(); data.set('asset', upload.file); data.set('path', upload.path); data.set('expectedHash', current.hash ?? '');
      const response = await fetch(endpoint, { method: 'POST', headers: { ...await binding.headers(), 'x-editor-application-id': owner }, body: data }); const value = await response.json(); binding.assert(); if (!response.ok) throw new Error(value.error ?? 'Asset upload denied.');
      if (!parked && key === applicationKey) status(`Saved portable Application asset ${upload.path}. Refresh the branding choices to select it.`);
    }
  });
}
for (const [kind, label] of [['page', 'Create Page'], ['shell', 'Create Shell'], ['component', 'Create Platform Component']] as const) {
  const create = document.createElement('button'); create.textContent = label; create.dataset.createVisual = kind;
  create.onclick = () => run(async () => {
    const key = applicationKey, binding = createEditorSessionBinding();
    const input = await chooseVisualCreation(kind, discovery.filter(item => item.kind === 'shell' && item.identity.id).map(item => ({ id: item.identity.id!, name: item.name })));
    if (!input || parked || key !== applicationKey) return;
    const response = await fetch(`/api/apps/${encodeURIComponent(key)}/visual-${kind === 'page' ? 'pages' : kind === 'shell' ? 'shells' : 'components'}`, { method: 'POST', headers: { ...await binding.headers(), 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const value = await response.json(); binding.assert(); if (!response.ok) throw new Error(value.error ?? 'Visual creation denied.');
    if (parked || key !== applicationKey) return;
    await discover(); const created = discovery.find(item => item.kind === kind && (item.identity.id === value.metadata?.artifactId || !!value.metadata?.componentId && item.componentId === value.metadata.componentId));
    if (created) await navigate({ identity: created.identity });
  });
  find('header').append(create);
}
let applicationKey = '', discovery: WorkspaceArtifact[] = [], navigationSequence = 0, parked = true;
let revision = editorSessionSnapshot()?.revision, checking = false;
const status = (message: string) => { find('[data-status]').textContent = message; };
const run = (action: () => Promise<unknown>) => { void action().catch(error => status(String(error.message ?? error))); };
const coordinator = new BuilderWorkspaceCoordinator(authorizeWorkspace, artifact => mountWorkspaceEditor(artifact, renderTabs, componentId => {
  const related = discovery.find(item => item.componentId === componentId || item.locator === componentId);
  if (related) run(() => navigate({ identity: related.identity })); else status('Definition is unavailable in this authorized Application context.');
}, () => run(() => coordinator.close(workspaceIdentityKey(artifact.identity))), createDatasetFromForm), () => editorSessionSnapshot()?.principal?.subjectId);
let pendingLink: { origin: WorkspaceLinkOrigin; context: EditorRuntimeContext; generation: number; componentId: string; dataset: WorkspaceArtifact } | undefined;
function showLink() { find('[data-return-link]').hidden = find('[data-cancel-link]').hidden = !pendingLink; }
async function createDataset(key: string, name: string) {
  const binding = createEditorSessionBinding(), headers = await binding.headers();
  const response = await fetch(`/api/apps/${encodeURIComponent(key)}/datasets/create`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
  const value = await response.json(); binding.assert();
  if (!response.ok) throw new Error(value.error ?? 'Dataset creation denied.');
  if (parked || key !== applicationKey) throw new Error('Application changed during Dataset creation. No link was made.');
  await discover(); const created = discovery.find(item => item.kind === 'dataset' && item.identity.id === value.manifest.artifactId);
  if (!created) throw new Error('Created Dataset is unavailable. No link was made.'); return created;
}
async function createDatasetFromForm(context: EditorRuntimeContext) {
  const name = prompt('Dataset name'); if (!name?.trim()) return;
  await context.flush(); if (context.snapshot?.dirty) throw new Error('Save a valid originating Form first.');
  const origin = coordinator.captureLinkOrigin(), generation = context.snapshot!.localGeneration, componentId = formSource(context).metadata.componentId!;
  pendingLink = undefined; showLink();
  const dataset = await createDataset(origin.applicationKey, name);
  coordinator.assertLinkOrigin(origin);
  if (context.snapshot?.localGeneration !== generation || formSource(context).metadata.componentId !== componentId) throw new Error('Origin changed during creation. Dataset is retained without a link.');
  pendingLink = { origin, context, generation, componentId, dataset }; showLink(); await navigate({ identity: dataset.identity });
  status('Configure and save the Dataset. Apply/Connect remain explicit. Return and link when ready, or cancel the link.');
}
find('[data-cancel-link]').onclick = () => { pendingLink = undefined; showLink(); status('Dataset link canceled. Originating Form is unchanged.'); };
find('[data-return-link]').onclick = () => run(async () => {
  const pending = pendingLink; if (!pending) return;
  const { origin, context } = pending; coordinator.assertLinkOrigin(origin);
  const target = await authorizeWorkspace(origin.applicationKey, { identity: pending.dataset.identity });
  if (!target.generic?.validation.valid || target.applicationId !== origin.applicationId || target.identity.owner.kind !== 'application' || target.identity.owner.id !== origin.applicationId) throw new Error('Save a valid Dataset under the original Application before linking.');
  const schema = JSON.parse(target.generic.files.find(f => f.role === 'definition')!.content);
  if (schema.dataset.id !== pending.dataset.identity.id) throw new Error('Dataset identity changed. No link was made.');
  await navigate({ identity: coordinator.assertLinkOrigin(origin).artifact.identity }, origin.applicationKey);
  coordinator.assertLinkOrigin(origin);
  const currentTarget = await authorizeWorkspace(origin.applicationKey, { identity: pending.dataset.identity });
  coordinator.assertLinkOrigin(origin);
  if (currentTarget.generic?.checksum !== target.generic.checksum) throw new Error('Dataset changed while linking. Review and retry explicitly.');
  if (pendingLink !== pending || context.snapshot?.localGeneration !== pending.generation || formSource(context).metadata.componentId !== pending.componentId) throw new Error('Origin changed. No link was made.');
  if (formSource(context).metadata.form!.fields.length) throw new Error('Remove existing mappings explicitly before linking a different Dataset.');
  editForm(context, `link/${schema.dataset.id}`, m => { m.form!.datasetId = schema.dataset.id; m.form!.primaryKey = schema.fields.find((f: { type: string }) => f.type === 'id')?.key ?? 'id'; });
  pendingLink = undefined; showLink(); status('Dataset linked. Use Dataset Mapping after Apply/Connect to map verified fields.');
});
find('[data-create-form]').onclick = () => run(async () => {
  const key = applicationKey, binding = createEditorSessionBinding(), input = await chooseFormCreation(key); if (!input || parked || key !== applicationKey) return;
  const response = await fetch(`/api/apps/${encodeURIComponent(key)}/visual-components`, { method: 'POST', headers: { ...await binding.headers(), 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const value = await response.json(); binding.assert(); if (!response.ok) throw new Error(value.error ?? 'Form creation denied.');
  if (parked || applicationKey !== key) return; await discover(); const created = discovery.find(d => d.componentId === value.metadata?.componentId); if (created) await navigate({ identity: created.identity });
});

function renderTabs() {
  const tabs = find('[role="tablist"]'); tabs.replaceChildren();
  for (const tab of coordinator.tabs.values()) {
    const row = document.createElement('span'), button = document.createElement('button'), close = document.createElement('button');
    const state = tab.editor.state();
    button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(coordinator.focused === tab.key));
    button.textContent = tab.suspended ? 'Suspended artifact' : `${tab.artifact.name}${state.dirty ? ' •' : ''}${state.pending ? ' (pending)' : ''}${state.conflict ? ' (conflict)' : ''}`;
    button.onclick = () => run(async () => {
      const key = tab.artifact.identity.owner.kind === 'application' ? tab.artifact.applicationKey : applicationKey;
      await navigate({ identity: tab.artifact.identity }, key);
    });
    close.textContent = '×'; close.setAttribute('aria-label', `Close ${tab.suspended ? 'suspended artifact' : tab.artifact.name}`);
    close.onclick = () => run(async () => { if (!await coordinator.close(tab.key)) status('Tab retained. Keep or recover the draft; wait for any pending save before closing.'); });
    row.append(button, close); tabs.append(row);
  }
  const stage = find('[data-stage]'), focused = coordinator.focused ? coordinator.tabs.get(coordinator.focused) : undefined;
  if (!parked && focused && !focused.suspended) {
    if (stage.firstElementChild !== focused.editor.element) stage.replaceChildren(focused.editor.element);
  } else stage.replaceChildren();
}
coordinator.subscribe(renderTabs);
async function discover() {
  const sequence = ++navigationSequence, key = applicationKey;
  const next = await workspaceRequest<WorkspaceArtifact[]>(key);
  if (sequence !== navigationSequence || key !== applicationKey || parked) return;
  discovery = next; const nav = find('nav'); nav.replaceChildren();
  for (const group of ['Pages', 'Shells', 'Components and Forms', 'Datasets', 'Workflows', 'Triggers', 'Menus', 'Application presentation/settings', 'Other artifacts']) {
    const entries = next.filter(item => item.group === group); if (!entries.length) continue;
    const details = document.createElement('details'); details.open = true;
    const heading = document.createElement('summary'); heading.textContent = group; details.append(heading);
    for (const item of entries) {
      const button = document.createElement('button'); button.textContent = `${item.name}${item.identity.repairLocator ? ' (repair-only locator)' : ''}${!item.editable ? ' (read-only)' : ''}`;
      button.dataset.artifactKey = workspaceIdentityKey(item.identity);
      button.onclick = () => run(() => navigate({ identity: item.identity })); details.append(button);
    }
    nav.append(details);
  }
  status('Select an artifact. Tabs retain their editor context during this session.');
}
export async function navigate(target: WorkspaceTarget, key = applicationKey) {
  if (parked) throw new Error('Open the Application workspace before navigating.');
  status('Checking artifact access…');
  const opened = await coordinator.open(key, target);
  if (opened) {
    if (applicationKey !== key) { applicationKey = key; find('[data-title]').textContent = key; run(discover); }
    status('Artifact authorized. Existing editor save behavior applies.');
  }
  return opened;
}
find('[data-refresh]').onclick = () => run(discover);
find('[data-create-dataset]').onclick = () => run(async () => {
  const name = prompt('Dataset name'); if (!name?.trim()) return;
  const key = applicationKey, binding = createEditorSessionBinding(), headers = await binding.headers();
  const response = await fetch(`/api/apps/${encodeURIComponent(key)}/datasets/create`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
  const value = await response.json(); binding.assert();
  if (!response.ok) throw new Error(value.error ?? 'Dataset creation denied.');
  if (parked || key !== applicationKey) return;
  await discover(); const created = discovery.find(item => item.kind === 'dataset' && item.identity.id === value.manifest.artifactId);
  if (created) await navigate({ identity: created.identity });
});
find('[data-collapse]').onclick = () => { const nav = find('nav'); nav.hidden = !nav.hidden; find('[data-collapse]').setAttribute('aria-expanded', String(!nav.hidden)); shell.classList.toggle('navigation-collapsed', nav.hidden); };
subscribeEditorSession(() => {
  const next = editorSessionSnapshot()?.revision;
  if (revision !== next) {
    revision = next; coordinator.suspend(); discovery = []; find('nav').replaceChildren(); navigationSequence++;
    status('Access suspended. Select the original authorized identity to reopen and recover retained tabs.');
  }
});
// Refresh authority while visible, even when the development cookie identity is unchanged.
setInterval(() => {
  if (parked || checking || !coordinator.focused) return;
  const tab = coordinator.tabs.get(coordinator.focused)!; checking = true;
  const observedKey = tab.key, observedApplication = tab.artifact.applicationKey;
  const current = () => !parked && coordinator.focused === observedKey && tab.artifact.applicationKey === observedApplication;
  void authorizeWorkspace(tab.artifact.applicationKey, { identity: tab.artifact.identity }).then(next => {
    if (!current()) return;
    if (next.editable !== tab.artifact.editable) throw new Error('Artifact authority changed.');
  }).catch(() => { if (!current()) return; coordinator.suspend(); discovery = []; find('nav').replaceChildren(); status('Artifact access changed. Source hidden; reauthorize under the original identity to recover.'); }).finally(() => { checking = false; });
}, 2000);
export function parkWorkspace() { parked = true; navigationSequence++; coordinator.park(); shell.remove(); }
export async function mountApplicationWorkspace(target: HTMLElement, app: { key: string; name: string }) {
  retainDevelopmentWorkspaceSession();
  coordinator.park(); applicationKey = app.key; parked = false;
  find('[data-title]').textContent = app.name; target.replaceChildren(shell); renderTabs();
  try { await discover(); } catch (error) { coordinator.suspend(); status(String(error)); }
}
