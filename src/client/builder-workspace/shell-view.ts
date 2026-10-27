import { workspaceIdentityKey, type WorkspaceArtifact, type WorkspaceTarget } from '../../shared/builder-workspace.js';
import { FixturePreviewPanel } from '../fixture-preview/panel.js';
import { selectFixturePreview } from './fixture-preview-binding.js';
import { SavedPreviewRequestController } from './saved-preview-request.js';
import { savedPreviewUnavailableText } from '../../shared/saved-preview-request.js';
import type { SavedCardTargetReader, SavedCardTargetSnapshot } from '../visual-artifacts/saved-card-target.js';

export interface ShellViewTab {
  key: string; artifact: WorkspaceArtifact; suspended: boolean; element: HTMLElement;
  state: { dirty: boolean; pending: boolean; conflict?: boolean };
  savedCardTarget?: SavedCardTargetReader;
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
    <p data-status role="status"></p><p class="note">Navigation opens artifacts or component definitions. To add a component instance, open a Page and use its insertion controls.</p><div class="workspace-layout"><nav aria-label="Application artifacts"></nav><section class="workspace-main"><div role="tablist" aria-label="Open artifacts"></div><div data-stage></div></section></div>`;
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
  let ownerReader: SavedCardTargetReader | undefined, ownerKey: string | undefined, ownerEpoch = 0;
  let ownerGeneration: { selection:number; source:number } | undefined;
  let unsubscribeOwner = () => {};
  function detachOwner() { ownerEpoch++; try { unsubscribeOwner(); } catch { /* A failed detach cannot preserve request identity. */ } unsubscribeOwner = () => {}; ownerReader = undefined; ownerKey = undefined; ownerGeneration = undefined; }
  function focusedSelection() {
    const focused = state.tabs.find(tab => tab.key === state.focused);
    return mounted && state.active && focused && !focused.suspended && state.session?.principal ? { focused, base: {
      subjectId:state.session.principal.subjectId,sessionRevision:state.session.revision,
      applicationId:focused.artifact.applicationId,applicationKey:focused.artifact.applicationKey,
      identity:focused.artifact.identity,kind:focused.artifact.kind,dirty:focused.state.dirty,
    }} : undefined;
  }
  function applyOwner(snapshot: SavedCardTargetSnapshot | undefined, force=false) {
    const selection=focusedSelection();
    if(!selection){savedPreview.select(undefined,force);return;}
    try { savedPreview.select({...selection.base,...(snapshot?{ownerSelection:snapshot}:{}),...(snapshot?.state==='identified'?{sourceNode:{nodeId:snapshot.target.source.nodeId,savedRevision:snapshot.target.source.committedHash}}:{})},force); }
    catch { savedPreview.select({},force); }
  }
  function bindOwner() {
    const selected=focusedSelection(),reader=selected?.focused.savedCardTarget;
    const key=selected?JSON.stringify([selected.base.subjectId,selected.base.sessionRevision,selected.base.applicationId,selected.base.applicationKey,workspaceIdentityKey(selected.base.identity)]):undefined;
    if(reader!==ownerReader||key!==ownerKey){
      detachOwner();ownerReader=reader;ownerKey=key;const epoch=ownerEpoch;
      // Replace before subscribing so an outgoing reader can never retain a
      // pending request while the incoming owner publishes its initial value.
      applyOwner(undefined,true);
      if(reader){
        try {
          const stop=reader.subscribe(snapshot=>{
            if(disposed||!mounted||epoch!==ownerEpoch||ownerReader!==reader)return;
            try {
              const current=reader.snapshot;
              if(epoch!==ownerEpoch||ownerReader!==reader)return;
              // A queued emission must still describe this owner's current
              // metadata. This reads no source and never resolves identity.
              if(snapshot!==current&&JSON.stringify(snapshot)!==JSON.stringify(current)){
                if(JSON.stringify(savedPreview.snapshot.selection?.ownerSelection)!==JSON.stringify(current))consumeOwner(current,true);
                return;
              }
              consumeOwner(snapshot,true);
            }catch{applyOwner(undefined,true);}
          });
          if(epoch===ownerEpoch&&!disposed)unsubscribeOwner=stop;else stop();
        } catch { detachOwner(); applyOwner(undefined,true); }
      }
    }
    if(reader&&reader===ownerReader){const epoch=ownerEpoch;try{const snapshot=reader.snapshot;if(epoch===ownerEpoch)consumeOwner(snapshot);}catch{applyOwner(undefined,true);}}
    else applyOwner(undefined);
  }
  function consumeOwner(snapshot:SavedCardTargetSnapshot,force=false){
    const generation=snapshot.generation;
    if(ownerGeneration&&(generation.selection<ownerGeneration.selection||generation.source<ownerGeneration.source)){applyOwner(undefined,true);return;}
    ownerGeneration={selection:generation.selection,source:generation.source};
    applyOwner(snapshot,force);
  }
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
    bindOwner();
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
      mounted = false; detachOwner(); element.removeEventListener('click', click); savedPreview.park(); preview.select(); find('[data-stage]').replaceChildren(); element.remove();
    },
    dispose() {
      if (disposed) return;
      mounted = false; disposed = true; detachOwner(); element.removeEventListener('click', click); preview.dispose();
      unsubscribeSaved();savedPreview.dispose();
      navigation.clear(); state = { active: false, applicationKey: '', tabs: [] }; find('[data-stage]').replaceChildren(); element.remove();
    },
  };
}
