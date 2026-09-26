import { EditorRuntimeContext } from './context.js';
import { discoverEditorArtifacts } from './transport.js';
import { editorSessionSnapshot, subscribeEditorSession } from './session.js';
import { renderProperties } from './properties.js';
import { EditorPluginRegistry, mountPlugin } from './plugins.js';
import { createDefaultEditorPlugins } from './default-plugins.js';
import { diagnosticLocation, renderSourceEditor, type SourceEditorState } from './source-editor.js';

export type EditorTab = 'overview' | 'properties' | 'source' | 'diagnostics' | `plugin:${string}`;
type EditorSlot = 'header' | 'toolbar' | 'tabs' | 'diagnostics' | 'extras';
export interface EditorPresentation {
  density?: 'comfortable' | 'compact';
  orientation?: 'horizontal' | 'vertical';
  tabOrder?: EditorTab[];
  slotOrder?: EditorSlot[];
}
const tabLabels: Partial<Record<EditorTab, string>> = { overview: 'Overview', properties: 'Properties', source: 'Source', diagnostics: 'Saved diagnostics' };
function order<T extends string>(requested: T[] | undefined, defaults: T[]): T[] {
  return [...new Set([...(requested ?? []).filter(value => defaults.includes(value)), ...defaults])];
}
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node;
}

/** Presentation-only adapter; overrides cannot omit protected controls or inject behavior. */
export function mountEditorShell(container: HTMLElement, context: EditorRuntimeContext, initial: EditorPresentation = {}, plugins: EditorPluginRegistry = createDefaultEditorPlugins()) {
  let presentation = initial, activeTab: EditorTab = 'overview', confirmDiscard = false, message = '';
  const sourceState: SourceEditorState = {};
  let displayedLocator: string | undefined;
  let pluginCleanups: (() => void)[] = [];
  let destroyed = false;
  const shell = element('section'); shell.className = 'artifact-editor'; shell.setAttribute('aria-label', 'Generic Artifact Editor'); container.append(shell);
  const run = (action: () => Promise<unknown>) => {
    message = ''; void action().catch(error => { message = error instanceof Error ? error.message : String(error); }).finally(render);
  };
  function button(label: string, action: () => void, disabled = false) {
    const control = element('button', label); control.type = 'button'; control.disabled = disabled; control.addEventListener('click', action); return control;
  }
  function render() {
    if (destroyed) return;
    const focused = document.activeElement instanceof HTMLElement && shell.contains(document.activeElement) ? document.activeElement : undefined;
    const focusKey = focused?.dataset.editorFocus;
    const selection = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement ? [focused.selectionStart, focused.selectionEnd] : undefined;
    for (const cleanup of pluginCleanups) cleanup(); pluginCleanups = [];
    const snapshot = context.snapshot;
    if (snapshot?.artifact.locator !== displayedLocator || !context.hasCopy) confirmDiscard = false;
    displayedLocator = snapshot?.artifact.locator;
    shell.dataset.density = presentation.density === 'compact' ? 'compact' : 'comfortable';
    const header = element('header'); header.append(element('h2', context.suspended ? 'Editor access suspended' : snapshot?.artifact.manifest?.name ?? 'Generic Artifact Editor'));
    header.append(element('p', context.suspended ? 'Source is hidden. Return to the original identity to compare and recover, or deliberately discard this copy.' : snapshot ? `${snapshot.artifact.manifest?.artifactType ?? 'Unknown artifact'} · ${snapshot.artifact.capabilities.edit ? 'Editing permitted' : 'Read-only'}` : 'Choose an authorized artifact.'));
    const toolbar = element('div'); toolbar.className = 'editor-toolbar'; toolbar.setAttribute('aria-label', 'Editor actions');
    const state = element('span', context.suspended ? 'Access revoked / suspended' : snapshot?.saveState === 'saving' ? 'Saving' : snapshot?.saveState === 'conflict' ? 'Conflict — local changes preserved' : snapshot?.saveState === 'error' ? 'Save failed' : snapshot?.dirty ? 'Editing — unsaved changes' : snapshot?.saveState === 'saved' ? 'Saved' : 'No pending changes'); state.setAttribute('role', 'status'); toolbar.append(state);
    if (snapshot?.artifact.capabilities.edit) toolbar.append(button(snapshot.saveState === 'error' ? 'Retry save' : 'Save now', () => run(() => context.flush()), !context.canEdit || snapshot.saveState === 'conflict'));
    if (snapshot) toolbar.append(button('Suspend editor', () => { context.suspend(); }, context.pending));
    if (context.hasCopy) {
      toolbar.append(button(context.suspended ? 'Authorize and compare for recovery' : 'Compare with server', () => run(() => context.compare()), context.pending || (context.suspended && !context.canRecover)));
      toolbar.append(button('Close artifact', () => run(async () => { if (!await context.close()) message = 'Navigation stopped. Resolve or discard the retained changes before leaving.'; }), context.pending));
      toolbar.append(button('Discard local copy…', () => { confirmDiscard = true; render(); }, context.pending));
    }
    const diagnostics = element('aside'); diagnostics.setAttribute('aria-label', 'Editor status'); diagnostics.setAttribute('aria-live', 'polite');
    if (message) diagnostics.append(element('p', message));
    if (snapshot?.error) diagnostics.append(element('p', snapshot.error));
    if (snapshot) {
      diagnostics.append(element('p', `Saved-source validation: ${snapshot.artifact.validation.diagnostics.length} issue(s).${snapshot.dirty ? ' These results do not validate unsaved edits.' : ''}`));
    }
    if (confirmDiscard && context.hasCopy) {
      const decision = element('div'); decision.setAttribute('role', 'group'); decision.setAttribute('aria-label', 'Confirm discard');
      decision.append(element('p', 'Discard retained local changes and close this artifact? Already-admitted saves may have completed; this does not undo server writes.'),
        button('Confirm discard', () => run(async () => { await context.discard(); confirmDiscard = false; }), context.pending),
        button('Keep copy', () => { confirmDiscard = false; render(); })); diagnostics.append(decision);
    }
    const comparison = context.reviewedComparison;
    if (comparison) {
      const review = element('section'); review.setAttribute('aria-label', 'Source comparison');
      review.append(element('h3', 'Review local and current server source'));
      for (const [label, value] of [['Local source', comparison.local], ['Server source', comparison.remote]] as const) {
        const pre = element('pre', JSON.stringify({ manifest: value.manifestContent, files: value.files }, null, 2));
        review.append(element('h4', label), pre);
      }
      review.append(button('Reload server source — discard local edits', () => run(() => context.decide('reload')), context.pending));
      if (comparison.remote.capabilities.edit) {
        if (context.suspended && comparison.remote.checksum === comparison.local.checksum) review.append(button('Resume retained changes', () => run(() => context.decide('resume')), context.pending));
        if (context.suspended || snapshot?.saveState === 'conflict') review.append(button('Keep local source — replace server source', () => run(() => context.decide('keep-local')), context.pending));
      }
      diagnostics.append(review);
    }
    const contributions = plugins.select(context);
    const openSource = () => { activeTab = 'source'; render(); };
    for (const issue of contributions.issues) diagnostics.append(element('p', issue));
    const pluginTabs = contributions.selected.filter(value => value.contribution.slot === 'tab');
    const tabs = document.createElement('uib-tabs'); tabs.setAttribute('orientation', presentation.orientation === 'vertical' ? 'vertical' : 'horizontal');
    const tabOrder = order<EditorTab>(presentation.tabOrder, ['overview', 'properties', ...pluginTabs.map(value => value.key as EditorTab), 'source', 'diagnostics']);
    if (!tabOrder.includes(activeTab)) activeTab = 'overview';
    tabs.setAttribute('selected', String(tabOrder.indexOf(activeTab)));
    if (snapshot) for (const id of tabOrder) {
      const plugin = pluginTabs.find(value => value.key === id);
      const tab = document.createElement('uib-tab'); tab.textContent = tabLabels[id] ?? plugin?.contribution.label ?? id;
      const panel = document.createElement('uib-tab-panel'); panel.dataset.editorPanel = id;
      if (id === 'overview') {
        panel.append(element('p', `Artifact: ${snapshot.artifact.manifest?.artifactId ?? 'Malformed manifest'}`), element('p', `Working generation ${snapshot.localGeneration}; saved generation ${snapshot.lastSavedGeneration}.`));
      } else if (id === 'properties') {
        renderProperties(panel, context, openSource);
      } else if (plugin) {
        pluginCleanups.push(mountPlugin(panel, context, plugin.render, openSource));
      } else if (id === 'source') {
        renderSourceEditor(panel, context, sourceState);
      } else {
        panel.append(element('p', 'Authoritative saved-source diagnostics. Select a diagnostic with a location to navigate to that source.'));
        if (!snapshot.artifact.validation.diagnostics.length) panel.append(element('p', 'No saved-source diagnostics.'));
        for (const diagnostic of snapshot.artifact.validation.diagnostics) {
          const item = element('section'); item.className = 'editor-diagnostic';
          const location = diagnosticLocation(diagnostic);
          item.append(element('p', `${diagnostic.severity.toUpperCase()} · ${diagnostic.code} · ${diagnostic.message}`));
          if (location) item.append(button(`Open ${location.file}${location.line ? `:${location.line}${location.column ? `:${location.column}` : ''}` : ''}`, () => { sourceState.selected = location; activeTab = 'source'; render(); }));
          else item.append(element('p', 'No precise source location was supplied by the authoritative validator.'));
          panel.append(item);
        }
      }
      tabs.append(tab, panel);
    }
    tabs.addEventListener('uib-tabs-change', event => { activeTab = tabOrder[Number((event as CustomEvent).detail?.newValue)] ?? activeTab; });
    const extras = element('footer', 'Build integration not configured. Git history and reverse references are not available.');
    for (const plugin of contributions.selected.filter(value => value.contribution.slot !== 'tab')) {
      const target = element('div'); target.dataset.editorContribution = plugin.key;
      (plugin.contribution.slot === 'toolbar' ? toolbar : extras).append(target);
      pluginCleanups.push(mountPlugin(target, context, plugin.render, openSource));
    }
    const slots = { header, toolbar, tabs, diagnostics, extras };
    shell.replaceChildren(...order(presentation.slotOrder, ['header', 'toolbar', 'tabs', 'diagnostics', 'extras']).map(id => slots[id]));
    if (focusKey) {
      const next = [...shell.querySelectorAll<HTMLElement>('[data-editor-focus]')].find(value => value.dataset.editorFocus === focusKey && value.closest('[data-editor-panel]')?.getAttribute('data-editor-panel') === focused?.closest('[data-editor-panel]')?.getAttribute('data-editor-panel'));
      next?.focus({ preventScroll: true });
      if (selection && selection[0] !== null && selection[1] !== null && (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement)) next.setSelectionRange(selection[0], selection[1]);
    }
  }
  const unsubscribe = context.subscribe(() => { message = ''; render(); });
  const detachPlugins = plugins.subscribe(render); render();
  return {
    setPresentation(next: EditorPresentation) { presentation = next; render(); },
    destroy() { destroyed = true; unsubscribe(); detachPlugins(); for (const cleanup of pluginCleanups) cleanup(); pluginCleanups = []; shell.remove(); },
  };
}

/** Fixture-mode entry point: application grants come from the session, never legacy management discovery. */
export function mountArtifactEditor(container: HTMLElement, presentationByApp: Readonly<Record<string, EditorPresentation>> = {}) {
  const contexts = new Map<string, EditorRuntimeContext>();
  let context: EditorRuntimeContext | undefined, view: ReturnType<typeof mountEditorShell> | undefined, sequence = 0;
  let detachNavigation: (() => void) | undefined;
  const navigation = element('nav'); navigation.setAttribute('aria-label', 'Artifact navigation');
  const applications = element('select'); applications.setAttribute('aria-label', 'Application');
  const artifacts = element('select'); artifacts.setAttribute('aria-label', 'Artifact');
  const status = element('p'); status.setAttribute('role', 'status');
  const body = element('div'); navigation.append(applications, artifacts, status); container.replaceChildren(navigation, body);
  function show(next: EditorRuntimeContext) {
    detachNavigation?.(); view?.destroy(); context = next; view = mountEditorShell(body, next, presentationByApp[next.applicationKey]);
    detachNavigation = next.subscribe(() => { artifacts.value = next.snapshot?.artifact.locator ?? ''; });
  }
  async function discover() {
    const current = ++sequence; artifacts.replaceChildren(new Option('Choose artifact', '')); artifacts.disabled = true;
    const session = editorSessionSnapshot(), key = applications.value;
    if (!session?.principal?.applicationKeys.includes(key)) return;
    try {
      const results = await discoverEditorArtifacts(key);
      if (current !== sequence || editorSessionSnapshot()?.revision !== session.revision) return;
      for (const result of results) artifacts.add(new Option(result.name ?? result.artifactId ?? 'Unknown artifact', result.locator));
      artifacts.value = context?.snapshot?.artifact.locator ?? ''; artifacts.disabled = false; status.textContent = results.length ? '' : 'No authorized artifacts found.';
    } catch (error) { if (current === sequence) status.textContent = error instanceof Error ? error.message : String(error); }
  }
  const refresh = () => {
    const key = context?.applicationKey ?? applications.value;
    applications.replaceChildren(new Option('Choose application', ''));
    for (const appKey of editorSessionSnapshot()?.principal?.applicationKeys ?? []) applications.add(new Option(appKey, appKey));
    applications.value = key; status.textContent = ''; void discover();
  };
  applications.addEventListener('change', async () => {
    const key = applications.value; applications.disabled = artifacts.disabled = true;
    try {
      if (context && !await context.close()) { applications.value = context.applicationKey; status.textContent = 'Navigation stopped. Recover or discard the retained copy first.'; return; }
      if (key) { let next = contexts.get(key); if (!next) { next = new EditorRuntimeContext(key); contexts.set(key, next); } show(next); }
      else { detachNavigation?.(); view?.destroy(); view = undefined; context = undefined; }
      await discover();
    } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
    finally { applications.disabled = false; artifacts.disabled = !artifacts.options.length; }
  });
  artifacts.addEventListener('change', async () => {
    if (!context || !artifacts.value) return;
    const locator = artifacts.value; artifacts.disabled = applications.disabled = true;
    try { if (!await context.open(locator)) status.textContent = 'Navigation stopped. Resolve or discard the retained changes first.'; }
    catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
    finally { artifacts.value = context.snapshot?.artifact.locator ?? ''; artifacts.disabled = applications.disabled = false; }
  });
  const unsubscribe = subscribeEditorSession(refresh); refresh();
  return async () => {
    // A refused navigation must not leave some reusable application contexts disposed.
    for (const value of contexts.values()) if (!await value.close()) return false;
    for (const value of contexts.values()) if (!await value.dispose()) return false;
    sequence++; unsubscribe(); detachNavigation?.(); view?.destroy(); container.replaceChildren(); return true;
  };
}
