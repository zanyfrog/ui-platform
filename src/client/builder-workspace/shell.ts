import { workspaceIdentityKey, type WorkspaceArtifact, type WorkspaceTarget } from '../../shared/builder-workspace.js';
import { BuilderWorkspaceCoordinator } from './coordinator.js';
import { mountWorkspaceEditor } from './adapters.js';
import { authorizeWorkspace, workspaceRequest } from './requests.js';
import { editorSessionSnapshot, subscribeEditorSession, retainDevelopmentWorkspaceSession } from '../artifact-editor/session.js';
import '../artifact-editor/editor.css';
import './workspace.css';

const shell = document.createElement('section'); shell.className = 'builder-workspace'; shell.setAttribute('aria-label', 'Application Builder workspace');
shell.innerHTML = `<header><button data-collapse aria-expanded="true">Application navigation</button><strong data-title></strong><button data-refresh>Refresh artifacts</button></header>
  <p data-status role="status"></p><div class="workspace-layout"><nav aria-label="Application artifacts"></nav><section class="workspace-main"><div role="tablist" aria-label="Open artifacts"></div><div data-stage></div></section></div>`;
const find = <T extends HTMLElement>(selector: string) => shell.querySelector<T>(selector)!;
let applicationKey = '', discovery: WorkspaceArtifact[] = [], navigationSequence = 0, parked = true;
let revision = editorSessionSnapshot()?.revision, checking = false;
const status = (message: string) => { find('[data-status]').textContent = message; };
const run = (action: () => Promise<unknown>) => { void action().catch(error => status(String(error.message ?? error))); };
const coordinator = new BuilderWorkspaceCoordinator(authorizeWorkspace, artifact => mountWorkspaceEditor(artifact, renderTabs, componentId => {
  const related = discovery.find(item => item.componentId === componentId || item.locator === componentId);
  if (related) run(() => navigate({ identity: related.identity })); else status('Definition is unavailable in this authorized Application context.');
}, () => run(() => coordinator.close(workspaceIdentityKey(artifact.identity)))), () => editorSessionSnapshot()?.principal?.subjectId);

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
