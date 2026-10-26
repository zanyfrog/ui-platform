import { workspaceIdentityKey, type WorkspaceArtifact, type WorkspaceTarget } from '../../shared/builder-workspace.js';
import { FixturePreviewPanel } from '../fixture-preview/panel.js';
import { selectFixturePreview } from './fixture-preview-binding.js';
import { SavedPreviewRequestController } from './saved-preview-request.js';
import { savedPreviewUnavailableText } from '../../shared/saved-preview-request.js';

export interface ShellViewTab {
  key: string; artifact: WorkspaceArtifact; suspended: boolean; element: HTMLElement;
  state: { dirty: boolean; pending: boolean; conflict?: boolean };
}
export interface ShellViewState {
  active: boolean; applicationKey: string; tabs: ShellViewTab[]; focused?: string;
  session?: { revision: string; principal: { subjectId: string } | null };
}
export interface ShellViewActions { navigate(target: WorkspaceTarget, applicationKey?: string): void; close(key: string): void }
export const shellTabLabel = (tab: Pick<ShellViewTab, 'artifact' | 'suspended' | 'state'>) => tab.suspended ? 'Suspended artifact' : `${tab.artifact.name}${tab.state.dirty ? ' •' : ''}${tab.state.pending ? ' (pending)' : ''}${tab.state.conflict ? ' (conflict)' : ''}`;
const groups = ['Pages', 'Shells', 'Components and Forms', 'Datasets', 'Workflows', 'Triggers', 'Menus', 'Application presentation/settings', 'Other artifacts'];

/** Shared production presentation only. Importing this module has no DOM, request or scheduler effects. */
export function createBuilderShellView(actions: ShellViewActions, savedPreview = new SavedPreviewRequestController()) {
  const element = document.createElement('section'); element.className = 'builder-workspace'; element.setAttribute('aria-label', 'Application Builder workspace');
  element.innerHTML = `<header><button data-collapse aria-expanded="true">Application navigation</button><strong data-title></strong><button data-refresh>Refresh artifacts</button><button data-create-dataset>Create Dataset</button><button data-create-form>Create Form</button><button data-return-link hidden>Return and link Dataset to Form</button><button data-cancel-link hidden>Cancel Dataset link</button></header>
    <p data-status role="status"></p><div class="workspace-layout"><nav aria-label="Application artifacts"></nav><section class="workspace-main"><div role="tablist" aria-label="Open artifacts"></div><div data-stage></div></section></div>`;
  const find = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector)!;
  const preview = new FixturePreviewPanel(); element.append(preview.element);
  const savedSection=document.createElement('section');savedSection.setAttribute('aria-label','Saved Preview readiness');
  const savedHeading=document.createElement('h3');savedHeading.textContent='Saved Preview · unavailable';
  const savedCheck=document.createElement('button');savedCheck.textContent='Check saved Preview availability';savedCheck.dataset.viewAction='saved-check';
  const savedStatus=document.createElement('p');savedStatus.setAttribute('role','status');savedStatus.dataset.savedPreviewStatus='';savedSection.append(savedHeading,savedCheck,savedStatus);element.append(savedSection);
  const unsubscribeSaved=savedPreview.subscribe(value=>{
    savedCheck.disabled=['parked','suspended','disposed'].includes(value.state);
    savedStatus.textContent=`Saved-artifact rendering is unavailable. ${value.outcome?savedPreviewUnavailableText[value.outcome.code]:value.reason}${value.selection?.dirty?' Unsaved changes are excluded; editor autosave remains unchanged.':''}`;
    savedSection.dataset.state=value.state;savedSection.dataset.code=value.outcome?.code??'';
  });
  let mounted = false, disposed = false;
  let state: ShellViewState = { active: false, applicationKey: '', tabs: [] };
  let navigation = new Map<string, WorkspaceArtifact>();
  function click(event: MouseEvent) {
    if (!mounted || disposed || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-view-action]');
    if (!button || !element.contains(button)) return;
    const key = button.dataset.viewKey!;
    if (button.dataset.viewAction === 'saved-check') {
      void savedPreview.check();
    } else if (button.dataset.viewAction === 'collapse') {
      const nav = find('nav'); nav.hidden = !nav.hidden;
      button.setAttribute('aria-expanded', String(!nav.hidden)); element.classList.toggle('navigation-collapsed', nav.hidden);
    } else if (button.dataset.viewAction === 'artifact') {
      const artifact = navigation.get(key); if (artifact) actions.navigate({ identity: artifact.identity });
    } else if (button.dataset.viewAction === 'tab') {
      const tab = state.tabs.find(tab => tab.key === key); if (tab) actions.navigate({ identity: tab.artifact.identity }, tab.artifact.identity.owner.kind === 'application' ? tab.artifact.applicationKey : state.applicationKey);
    } else if (button.dataset.viewAction === 'close' && state.tabs.some(tab => tab.key === key)) actions.close(key);
  }
  find('[data-collapse]').dataset.viewAction = 'collapse';
  function render(next: ShellViewState) {
    if (disposed) return;
    state = next; const tabs = find('[role=tablist]'); tabs.replaceChildren();
    for (const tab of next.tabs) {
      const row = document.createElement('span'), button = document.createElement('button'), close = document.createElement('button');
      button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(next.focused === tab.key));
      button.textContent = shellTabLabel(tab);
      button.dataset.viewAction = 'tab'; button.dataset.viewKey = tab.key;
      close.textContent = '×'; close.setAttribute('aria-label', `Close ${tab.suspended ? 'suspended artifact' : tab.artifact.name}`);
      close.dataset.viewAction = 'close'; close.dataset.viewKey = tab.key;
      row.append(button, close); tabs.append(row);
    }
    const stage = find('[data-stage]'), focused = next.tabs.find(tab => tab.key === next.focused);
    if (mounted && next.active && focused && !focused.suspended) {
      if (stage.firstElementChild !== focused.element) stage.replaceChildren(focused.element);
    } else stage.replaceChildren();
    selectFixturePreview(preview, mounted && next.active && focused && !focused.suspended && next.session?.principal ? {
      subjectId: next.session.principal.subjectId, sessionId: next.session.revision, artifact: focused.artifact, dirty: focused.state.dirty,
    } : undefined);
    savedPreview.select(mounted&&next.active&&focused&&!focused.suspended&&next.session?.principal?{
      subjectId:next.session.principal.subjectId,sessionRevision:next.session.revision,
      applicationId:focused.artifact.applicationId,applicationKey:focused.artifact.applicationKey,
      identity:focused.artifact.identity,kind:focused.artifact.kind,dirty:focused.state.dirty,
    }:undefined);
  }
  return {
    element, preview, savedPreview,
    status(message: string) { if (!disposed) find('[data-status]').textContent = message; },
    title(message: string) { if (!disposed) find('[data-title]').textContent = message; },
    artifacts(entries: readonly WorkspaceArtifact[]) {
      if (disposed) return;
      navigation = new Map(entries.map(artifact => [workspaceIdentityKey(artifact.identity), artifact]));
      const nav = find('nav'); nav.replaceChildren();
      for (const group of groups) {
        const matching = entries.filter(item => item.group === group); if (!matching.length) continue;
        const details = document.createElement('details'); details.open = true;
        const heading = document.createElement('summary'); heading.textContent = group; details.append(heading);
        for (const artifact of matching) {
          const button = document.createElement('button'); button.textContent = `${artifact.name}${artifact.identity.repairLocator ? ' (repair-only locator)' : ''}${!artifact.editable ? ' (read-only)' : ''}`;
          button.dataset.artifactKey = workspaceIdentityKey(artifact.identity); button.dataset.viewAction = 'artifact'; button.dataset.viewKey = button.dataset.artifactKey;
          details.append(button);
        }
        nav.append(details);
      }
    },
    render,
    mount(target: HTMLElement, title: string) {
      if (disposed) throw new Error('SHELL_VIEW_DISPOSED');
      if (!mounted) { mounted = true; element.addEventListener('click', click); }
      savedPreview.resume();
      find('[data-title]').textContent = title; target.replaceChildren(element);
    },
    park() {
      if (disposed) return;
      mounted = false; element.removeEventListener('click', click); savedPreview.park(); preview.select(); find('[data-stage]').replaceChildren(); element.remove();
    },
    dispose() {
      if (disposed) return;
      mounted = false; disposed = true; element.removeEventListener('click', click); preview.dispose();
      unsubscribeSaved();savedPreview.dispose();
      navigation.clear(); state = { active: false, applicationKey: '', tabs: [] }; find('[data-stage]').replaceChildren(); element.remove();
    },
  };
}
