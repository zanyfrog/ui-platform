import { insertNode, isWrapper, moveNode, parseMetadata, parseSource, readNodeSettings, setNodeSetting, setNodeAttribute, setHeadingLevel, regions, recommendedRegionIds, legacyPackageSettingContracts } from '@ui-platform/visual-artifacts';
import { chooseNamedValue } from './menu-controls.js';
import type { ArtifactBundle, ArtifactFiles, ArtifactMetadata, PackageComponent } from '@ui-platform/visual-artifacts';
import type { ComponentCatalogEntry } from '../../shared/types.js';
import { EditingLifecycle, editingStatus, protectEditingDraft } from '../artifact-editor/editing-lifecycle.js';
import { specializedTransport, type SourceRequest } from '../artifact-editor/specialized-transport.js';
import { compositionAuthoring, valueControls } from './authoring-controls.js';
import { identifyRetainedSavedCard, immutableSavedCard, savedCardContextKey, type SavedCardContext, type SavedCardTargetSnapshot, type SavedCardTargetReader, type SavedCardRefusal } from './saved-card-target.js';

export interface Workspace { pages: ArtifactBundle[]; components: ArtifactBundle[]; shells: ArtifactBundle[]; packages: ComponentCatalogEntry[] }
export interface VisualWorkspaceOptions {
  request?: typeof api; workspace?: Workspace; initial?: { kind: 'page' | 'component' | 'shell'; locator: string };
  captureRequest?: () => SourceRequest;
  applicationId?: string;
  onDefinition?: (componentId: string) => void; onStateChange?: () => void;
  applicationKey?: () => string;
  savedCardContext?: { get(): SavedCardContext | undefined; subscribe(invalidate: () => void): () => void };
}
const esc = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const headingLabels = ['H1 — Page title', 'H2 — Section heading', 'H3 — Subsection heading', 'H4 — Heading level 4', 'H5 — Heading level 5', 'H6 — Heading level 6'];
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Visual Artifact request failed.'); return data;
}
export async function mountVisualEditor(target: HTMLElement, appKey: string, options: VisualWorkspaceOptions = {}) {
  const copies = new Map<string, { bundle: ArtifactBundle; kind: 'page' | 'component' | 'shell'; lifecycle: EditingLifecycle<ArtifactFiles>; saveRequest?: SourceRequest }>();
  let copy: ReturnType<typeof copies.get>;
  const transport = await specializedTransport(options, () => { for (const item of copies.values()) item.lifecycle.suspend(); target.hidden = true; });
  const request = transport.request;
  let active = !options.initial, disposed = false, operations = 0;
  const base = `/api/apps/${encodeURIComponent(appKey)}`;
  let workspace: Workspace, selected: ArtifactBundle | undefined, selectedKind: 'page' | 'component' | 'shell' = 'page';
  let files: ArtifactFiles, baseline: ArtifactFiles, hash = '', role: keyof ArtifactFiles = 'source', selectedNode = '', conflict = false, saving = false;
  let preview: HTMLIFrameElement | undefined, polling = false;
  const actionDrafts = new Map<string, NonNullable<import('./authoring-controls.js').AuthoringOptions['draft']>>();
  const readCardContext = () => { try { return options.savedCardContext?.get(); } catch { return undefined; } };
  const originalCardContextKey = savedCardContextKey(readCardContext());
  let cardEpoch = 0, cardSelectionGeneration = 0, cardSourceGeneration = 0, cardPending = false, cardTerminal = false;
  const cardListeners = new Set<(snapshot: SavedCardTargetSnapshot) => void>();
  const cardGenerations = () => ({ selection: cardSelectionGeneration, source: cardSourceGeneration });
  let cardValue: SavedCardTargetSnapshot = immutableSavedCard({ state: 'unavailable', reason: 'NO_SELECTION', generation: cardGenerations(), target: null });
  let cardCompletion: { record: object; epoch: number; selection: number; context: string | undefined; editing: number } | undefined;
  function publishCard(value: SavedCardTargetSnapshot) {
    cardValue = immutableSavedCard(value);
    for (const listener of [...cardListeners]) { if (cardValue !== value) break; if (!cardListeners.has(listener)) continue; try { listener(value); } catch { /* Metadata observers cannot interrupt editing. */ } }
  }
  function invalidateCard(reason: SavedCardRefusal, selection = false) {
    if (cardTerminal) return;
    cardEpoch++; if (selection) cardSelectionGeneration++; else cardSourceGeneration++;
    cardPending = false; cardCompletion = undefined;
    publishCard({ state: 'unavailable', reason, generation: cardGenerations(), target: null });
  }
  function cardRefusal(): SavedCardRefusal | undefined {
    if (disposed || cardTerminal) return 'DISPOSED';
    if (!originalCardContextKey) return 'NO_CONTEXT';
    if (savedCardContextKey(readCardContext()) !== originalCardContextKey || readCardContext()?.applicationId !== options.applicationId) return 'CONTEXT_CHANGED';
    if (copy?.lifecycle.suspended) return 'SUSPENDED';
    if (!active || !target.isConnected || target.hidden || document.visibilityState === 'hidden') return 'NOT_ACTIVE';
    if (!copy || selectedKind !== 'page' || !selectedNode) return 'NO_SELECTION';
    if (copy.lifecycle.inFlight || copy.lifecycle.state === 'saving') return 'SAVE_PENDING';
    if (copy.lifecycle.state === 'conflict') return 'SOURCE_UNCERTAIN';
    if (copy.lifecycle.failure || copy.lifecycle.state === 'error') return 'SAVE_FAILED';
    if (copy.lifecycle.dirty) return 'DIRTY_DRAFT';
  }
  function cardSignature() {
    return JSON.stringify([savedCardContextKey(readCardContext()), selectedNode, copy?.bundle, copy?.lifecycle.baseline,
      copy?.lifecycle.generation, copy?.lifecycle.savedGeneration, copy?.lifecycle.state, copy?.lifecycle.dirty,
      workspace.packages, workspace.components.map(bundle => bundle.metadata?.componentId)]);
  }
  function evaluateCard() {
    if (cardTerminal) return;
    const refusal = cardRefusal();
    if (refusal) { publishCard({ state: 'unavailable', reason: refusal, generation: cardGenerations(), target: null }); return; }
    const epoch = cardEpoch, signature = cardSignature(); cardPending = true;
    // Only the already-retained committed bundle/baseline is copied. No current
    // draft bytes, Component source, URL, transport or executable capability.
    const input = structuredClone({ context: readCardContext()!, bundle: copy!.bundle, baseline: copy!.lifecycle.baseline,
      candidate: selectedNode, packages: workspace.packages, componentIds: workspace.components.map(bundle => bundle.metadata?.componentId), generation: cardGenerations() });
    void identifyRetainedSavedCard(input).then(value => {
      if (cardTerminal || epoch !== cardEpoch) return;
      cardPending = false;
      if (cardRefusal() || signature !== cardSignature()) { invalidateCard('SOURCE_UNCERTAIN'); return; }
      publishCard(value);
    });
  }
  const cardVisibility = () => invalidateCard('NOT_ACTIVE');
  function currentCardSnapshot() {
    const reason = cardRefusal();
    if ((cardValue.state === 'identified' || cardPending) && reason) invalidateCard(reason);
    return cardValue;
  }
  const savedCardTarget: SavedCardTargetReader = Object.freeze({
    get snapshot() { return currentCardSnapshot(); },
    subscribe(listener: (snapshot: SavedCardTargetSnapshot) => void) {
      const current = currentCardSnapshot();
      if (!cardTerminal) cardListeners.add(listener);
      try { listener(current); } catch { /* Observers do not affect editing. */ }
      return () => { cardListeners.delete(listener); };
    },
  });
  const dirty = () => !!copy?.lifecycle.dirty;
  const list = (kind: string) => kind === 'page' ? workspace.pages : kind === 'shell' ? workspace.shells : workspace.components;
  const plural = (kind: string) => kind === 'page' ? 'pages' : kind === 'shell' ? 'shells' : 'components';
  const url = () => `${base}/visual-${plural(selectedKind)}?locator=${encodeURIComponent(selected!.locator)}`;
  target.innerHTML = `<div class="stack"><div class="pane-heading"><strong>Visual Artifacts</strong><span data-status aria-live="polite"></span></div>
    <div class="editor-actions"><button data-create="page">Create Page</button><button data-create="component">Create Platform Component</button><button data-create="form-dataset">Create Form from Dataset</button><button data-create="form">Create blank Form</button><select aria-label="Visual Artifact" data-artifacts><option value="">Select an artifact</option></select></div>
    <div data-work hidden><div class="editor-actions"><button data-undo>Undo</button><button data-redo>Redo</button><button data-save>Save Now</button><button data-repair>Advanced source repair save</button><button data-reload>Reload / discard editor changes</button><button data-recover>Download editor recovery</button><button data-delete>Delete artifact</button><button data-preview>Design preview</button><button data-change-shell>Change Page Shell</button><button data-add-region>Add Region</button><button data-remove-node>Remove selected node</button></div>
    <div data-diagnostics></div><div class="builder-layout" style="grid-template-columns:minmax(180px,1fr) minmax(220px,2fr)"><div class="stack"><strong>Structure</strong><select data-nodes size="8" aria-label="Visual node"></select>
    <label>Insert into selected container, or artifact root<select data-insert aria-label="Insert element"></select></label><p class="note">Choose an item here, then click Insert selected item. The navigation list inspects component definitions.</p><button data-add>Insert selected item</button><button data-root>Select artifact root</button><button data-move="up">Move layout item up</button><button data-move="down">Move layout item down</button><div data-inspector></div></div>
    <div class="stack"><label>Source file<select data-file aria-label="Visual source file">${['source', 'css', 'metadata', 'fixtures', 'code'].map(name => `<option>${name}</option>`).join('')}</select></label><textarea data-source aria-label="Visual source" class="source-editor" spellcheck="false"></textarea><p class="note">Use the authoring controls for public settings, bindings, slots and events. Advanced source is preserved. Design preview does not persist data or run custom functions.</p></div></div><div data-preview-host></div></div></div>`;
  const find = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
  const status = (message: string) => { find('[data-status]').textContent = message; options.onStateChange?.(); };
  const safe = (run: () => Promise<void> | void) => async () => { if (disposed || !active) return; operations++; try { await run(); } catch (error) { status(error instanceof Error ? error.message : String(error)); } finally { operations--; options.onStateChange?.(); } };
  find('[data-create="page"]').insertAdjacentHTML('afterend', '<button data-create="shell">Create Shell</button>');
  find('[data-add-region]').insertAdjacentHTML('afterend', '<button data-place-menu>Place Application Menu</button>');
  find('[data-place-menu]').addEventListener('click', safe(async () => {
    const composition = await request<import('@ui-platform/visual-artifacts').CompositionDefinition>(`${base}/composition`);
    const menuId = await chooseNamedValue('Application Menu', composition.menus.map(menu => ({ value: menu.menuId, label: menu.name }))); if (!menuId || !active || disposed) return;
    if (!composition.menus.some(menu => menu.menuId === menuId)) throw new Error('Choose an Application Menu.');
    const wrapperId = `node_${crypto.randomUUID()}`, nodeId = `node_${crypto.randomUUID()}`, ids = [wrapperId, nodeId];
    files.source = insertNode(files.source, 'nav', undefined, selectedNode || undefined, () => ids.shift()!);
    files.source = setNodeAttribute(files.source, nodeId, 'data-uip-menu', menuId);
    files.source = setNodeAttribute(files.source, nodeId, 'aria-label', composition.menus.find(menu => menu.menuId === menuId)!.name);
    find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
  }));
  find('[data-add-region]').addEventListener('click', safe(() => {
    const shell = selectedKind === 'page' ? workspace.shells.find(shell => shell.metadata?.artifactId === workingMetadata().shellId) : undefined;
    const choices = shell ? regions(shell.files.source).map(region => region.regionId) : [...recommendedRegionIds];
    const id = prompt('Region ID (stable; custom region- IDs allowed in Shells):\n' + choices.join('\n'), choices[0]); if (!id) return;
    if (shell && !choices.includes(id)) throw new Error('Choose a Region from the Page Shell.');
    if (regions(files.source).some(region => region.regionId === id)) throw new Error('Region already exists.');
    const name = prompt('Region display name:', id); if (name === null) return;
    files.source += `\n<section class="uip-layout-item" data-uip-node="node_${crypto.randomUUID()}" data-uip-region="${esc(id)}" data-uip-region-name="${esc(name)}"></section>\n`;
    regions(files.source); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
  }));
  find('[data-remove-node]').addEventListener('click', safe(() => {
    const node = parseSource(files.source).nodes.find(node => node.id === selectedNode); if (!node) throw new Error('Select a Page-owned or Shell-owned node.');
    if (!confirm('Remove selected node and its children? Removing a Page Region restores the Shell default; keeping an empty Region suppresses it.')) return;
    files.source = files.source.slice(0, node.start) + files.source.slice(node.end); selectedNode = ''; find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
  }));
  find('[data-change-shell]').addEventListener('click', safe(async () => {
    if (dirty() || conflict) throw new Error('Save or recover changes before changing Shell.');
    const shellId = prompt('New Shell ID:\n' + workspace.shells.map(shell => `${shell.metadata?.displayName}: ${shell.metadata?.artifactId}`).join('\n')); if (!shellId) return;
    const shell = workspace.shells.find(shell => shell.metadata?.artifactId === shellId); if (!shell) throw new Error('Shell is missing.');
    const available = regions(shell.files.source).map(region => region.regionId), decisions: Record<string, string | null> = {};
    for (const region of regions(files.source)) if (!available.includes(region.regionId)) {
      const mapping = prompt(`Map ${region.regionId} to one of:\n${available.join('\n')}\nType DISCARD to explicitly discard this Region. Cancel keeps the current Shell.`); if (mapping === null) return;
      decisions[region.regionId] = mapping === 'DISCARD' ? null : mapping;
    }
    const bundle = await request<ArtifactBundle>(`${base}/page-shell`, { method: 'POST', body: JSON.stringify({ locator: selected!.locator, shellId, decisions, expectedHash: hash }) });
    workspace = await request<Workspace>(`${base}/visual-artifacts`); open(bundle, 'page');
  }));
  function renderList(): void {
    const insert = find<HTMLSelectElement>('[data-insert]');
    const insertion = insert.value;
    find('[data-create="shell"]').hidden = !workspace.shells?.length;
    const select = find<HTMLSelectElement>('[data-artifacts]');
    select.innerHTML = '<option value="">Select an artifact</option>' + [['Pages', workspace.pages], ['Shells', workspace.shells ?? []], ['Platform Components', workspace.components]].map(([label, items]) => `<optgroup label="${label}">${(items as ArtifactBundle[]).map(b => `<option value="${label === 'Pages' ? 'page' : label === 'Shells' ? 'shell' : 'component'}:${esc(b.locator)}">${esc(b.metadata?.displayName ?? b.locator)}${b.diagnostics.some(d => d.severity === 'error') ? ' (needs repair)' : ''}</option>`).join('')}</optgroup>`).join('');
    if (selected) select.value = `${selectedKind}:${selected.locator}`;
    find<HTMLSelectElement>('[data-insert]').innerHTML = '<optgroup label="HTML">' + ['section', 'div', 'article', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'img', 'ul', 'li', 'span', 'uip-slot'].map(tag => `<option value="html:${tag}">${/^h[1-6]$/.test(tag) ? headingLabels[Number(tag[1]) - 1] : tag}</option>`).join('') + '</optgroup><optgroup label="Package Components">' + workspace.packages.filter(p => !p.activationIssues?.length).map(p => `<option value="package:${esc(p.id)}">${esc(p.name ?? p.tagName)}</option>`).join('') + '</optgroup><optgroup label="Platform Components">' + workspace.components.filter(b => b.metadata && !b.diagnostics.some(d => d.severity === 'error')).map(b => `<option value="component:${esc(b.metadata!.componentId)}">${esc(b.metadata!.displayName)}</option>`).join('') + '</optgroup>';
    if (Array.from(insert.options).some(option => option.value === insertion)) insert.value = insertion;
  }
  function workingMetadata(): ArtifactMetadata { const metadata = parseMetadata(files.metadata).metadata; if (!metadata) throw new Error('Repair metadata JSON first.'); return metadata; }
  function changeMetadata(change: (metadata: ArtifactMetadata) => void): void { const metadata = workingMetadata(); change(metadata); files.metadata = JSON.stringify(metadata, null, 2) + '\n'; changed(); }
  function paintState(): void {
    const lifecycle = copy?.lifecycle;
    conflict = lifecycle?.state === 'conflict'; saving = lifecycle?.state === 'saving';
    status(lifecycle ? [editingStatus(lifecycle.state, lifecycle.dirty), lifecycle.failure, lifecycle.notice].filter(Boolean).join(' · ') : 'Select an artifact');
    find<HTMLButtonElement>('[data-save]').disabled = conflict || !lifecycle?.dirty;
    find<HTMLButtonElement>('[data-undo]').disabled = !lifecycle?.canUndo;
    find<HTMLButtonElement>('[data-redo]').disabled = !lifecycle?.canRedo;
  }
  function changed(group?: string): void {
    invalidateCard('SOURCE_CHANGED');
    if (copy && JSON.stringify(files) !== JSON.stringify(copy.lifecycle.current)) { copy.saveRequest = transport.capture(); copy.lifecycle.edit(files, group); }
    paintState(); if (role !== 'source') find<HTMLTextAreaElement>('[data-source]').value = files[role];
    try { renderStructure(); } catch { status('Invalid local source retained. Repair source before using structured controls.'); }
  }
  function renderStructure(): void {
    const parsed = parseSource(files.source);
    const selector = find<HTMLSelectElement>('[data-nodes]');
    const shell = selectedKind === 'page' ? workspace.shells?.find(shell => shell.metadata?.artifactId === workingMetadata().shellId) : undefined;
    const label = (n: typeof parsed.nodes[number]): string => {
      let depth = 0; for (let parent = n.parent; parent; parent = parent.parent) depth++;
      const heading = parsed.nodes.find(child => child.start >= n.openEnd && child.end <= n.closeStart && /^h[1-6]$/.test(child.tag));
      const text = (item: typeof n) => { const template = document.createElement('template'); template.innerHTML = files.source.slice(item.openEnd, item.closeStart); return template.content.textContent ?? ''; };
      const summary = (n.attributes['data-uip-region-name'] || n.attributes.heading || n.attributes.alt || (heading ? text(heading) : text(n))).replace(/\s+/g, ' ').trim().slice(0, 60);
      return '\u00a0\u00a0'.repeat(depth) + n.tag + (summary ? ` — ${summary}` : '') + (!n.id || n.manual ? ' (manual)' : '');
    };
    selector.innerHTML = (shell ? '<optgroup label="Shell context — locked; edit the Shell">' + parseSource(shell.files.source).nodes.filter(n => !n.attributes['data-uip-region']).map(n => `<option disabled>🔒 ${esc(n.tag + ' ' + (n.id ?? ''))}</option>`).join('') + '</optgroup>' : '') + parsed.nodes.map((n, index) => `<option value="${esc(n.id ?? `manual:${index}`)}" title="${esc(n.id ?? 'Unmanaged HTML')}">${esc(label(n))}</option>`).join('');
    selector.value = selectedNode;
    find('[data-diagnostics]').innerHTML = [...(selected?.diagnostics ?? []), ...parsed.diagnostics].map(d => `<p class="${d.severity === 'error' ? 'error' : 'note'}">${esc(d.message)}</p>`).join('');
    renderInspector();
  }
  function renderInspector(): void {
    const inspector = find('[data-inspector]'); const parsed = parseSource(files.source);
    const node = parsed.nodes.find(n => n.id === selectedNode);
    inspector.innerHTML = '';
    const definitionId = node?.attributes['data-uip-component'];
    if (definitionId && workspace.components.some(component => component.metadata?.componentId === definitionId) && options.onDefinition) {
      const edit = document.createElement('button'); edit.textContent = 'Edit Definition';
      edit.onclick = () => options.onDefinition!(definitionId); inspector.append(edit);
    }
    if (!node) {
      inspector.innerHTML = '<p class="note">Select a managed node to edit settings and bindings.</p>';
      const manualIndex = /^manual:(\d+)$/.exec(selectedNode);
      const manual = manualIndex ? parsed.nodes[Number(manualIndex[1])] : undefined;
      if (manual && !manual.id) inspector.firstElementChild!.textContent = `This ${manual.tag} is an unmanaged/manual node: its HTML has no usable data-uip-node identity. A component reference alone does not make it managed. Existing source is preserved; insert a new instance using the insertion controls.`;
      const metadata = workingMetadata();
      compositionAuthoring(inspector, { metadata, change: changeMetadata, workflows: async () => (await request<import('../../shared/automation-service-contract.js').AutomationAuthoringCatalog>(`${base}/automation-catalog`)).workflows, datasets: () => request(`${base}/datasets/discovery`), error: cause => status(String(cause)) });
      if (selectedKind === 'page' && metadata.shellId) {
        const note = document.createElement('p'); note.textContent = `Shell: ${workspace.shells.find(shell => shell.metadata?.artifactId === metadata.shellId)?.metadata?.displayName ?? metadata.shellId}. Fixed content is edited in the Shell editor.`; inspector.append(note);
        const override = document.createElement('button'); override.textContent = 'Set Page Menu Item visibility / availability';
        override.addEventListener('click', safe(() => {
          const menuId = prompt('Application Menu ID:'); if (!menuId) return;
          const itemId = prompt('Existing Menu Item ID:'); if (!itemId) return;
          const setting = prompt('Override: hidden or disabled', 'hidden'); if (!setting || !['hidden', 'disabled'].includes(setting)) return;
          const value = prompt('true or false', 'true'); if (value !== 'true' && value !== 'false') return;
          changeMetadata(metadata => { metadata.menuOverrides ??= {}; const menu = metadata.menuOverrides[menuId] ??= {}; menu.items ??= {}; menu.items[itemId] ??= {}; Object.assign(menu.items[itemId], { [setting]: value === 'true' }); });
        })); inspector.append(override);
        const local = document.createElement('button'); local.textContent = 'Add Page-local Menu Item';
        local.addEventListener('click', safe(() => {
          const menuId = prompt('Application Menu ID:'); if (!menuId) return;
          const label = prompt('Page-local item label:'); if (!label) return;
          const destination = prompt('Destination JSON:', '{"kind":"page","pageId":"' + metadata.artifactId + '"}'); if (!destination) return;
          const parentItemId = prompt('Parent Menu Item ID (empty for root):', ''); if (parentItemId === null) return;
          const item = { itemId: `local-${crypto.randomUUID()}`, label, destination: JSON.parse(destination) };
          changeMetadata(metadata => { metadata.menuOverrides ??= {}; const menu = metadata.menuOverrides[menuId] ??= {}; (menu.additions ??= []).push({ ...(parentItemId ? { parentItemId } : {}), item }); });
        })); inspector.append(local);
      }
      if (metadata.form) {
        for (const [labelText, value, change] of [
          ['Dataset target', metadata.form.datasetId, (m: ArtifactMetadata, v: string) => { m.form!.datasetId = v; }],
          ['Submit service', metadata.form.submit.service, (m: ArtifactMetadata, v: string) => { m.form!.submit.service = v; }],
          ['Read service', metadata.form.submit.readService, (m: ArtifactMetadata, v: string) => { m.form!.submit.readService = v; }],
          ['Default mode', metadata.modes!.default, (m: ArtifactMetadata, v: string) => { m.modes!.default = v; m.modes!.overrides[v] ??= {}; m.public!.properties.mode.default = v; }],
        ] as Array<[string, string, (m: ArtifactMetadata, v: string) => void]>) {
          const label = document.createElement('label'); label.textContent = labelText;
          const input = document.createElement('input'); input.value = value; input.setAttribute('aria-label', labelText);
          input.addEventListener('change', safe(() => changeMetadata(m => change(m, input.value)))); label.append(input); inspector.append(label);
        }
        const addMode = document.createElement('button'); addMode.textContent = 'Add mode';
        addMode.addEventListener('click', safe(() => { const name = prompt('Mode name:'); if (name) changeMetadata(m => { m.modes!.overrides[name] ??= {}; }); })); inspector.append(addMode);
      }
      return;
    }
    if (node.manual) { inspector.textContent = 'Manual region: edit source directly.'; return; }
    if (/^h[1-6]$/.test(node.tag) && !node.attributes['data-uip-component']) {
      const label = document.createElement('label'); label.textContent = 'Heading level';
      const select = document.createElement('select'); select.setAttribute('aria-label', 'Heading level');
      headingLabels.forEach((text, index) => select.add(new Option(text, `h${index + 1}`))); select.value = node.tag;
      select.addEventListener('change', safe(() => { files.source = setHeadingLevel(files.source, selectedNode, select.value); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); }));
      label.append(select); inspector.append(label);
    }
    for (const name of node.tag === 'a' ? ['href'] : node.tag === 'img' ? ['src', 'alt'] : []) {
      const label = document.createElement('label'); label.textContent = name === 'href' ? 'Link destination (href)' : name === 'src' ? 'Image source (src)' : 'Alternative text (alt)';
      const input = document.createElement('input'); input.value = Object.entries(node.attributes).find(([key]) => key.toLowerCase() === name)?.[1] ?? ''; input.setAttribute('aria-label', label.textContent);
      input.addEventListener('change', safe(() => { files.source = setNodeAttribute(files.source, selectedNode, name, input.value); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); }));
      label.append(input); inspector.append(label);
    }
    const classLabel = document.createElement('label'); classLabel.textContent = 'CSS classes'; const classInput = document.createElement('input'); classInput.value = node.attributes.class ?? '';
    classInput.addEventListener('change', safe(() => { files.source = setNodeAttribute(files.source, selectedNode, 'class', classInput.value); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); })); classLabel.append(classInput); inspector.append(classLabel);
    if (selectedKind === 'shell' && ['img', 'strong', 'span', 'p', 'h1', 'h2', 'h3'].includes(node.tag)) {
      const label = document.createElement('label'); label.textContent = 'Application branding'; const select = document.createElement('select');
      select.setAttribute('aria-label', 'Application branding');
      for (const key of ['', ...(node.tag === 'img' ? ['primaryLogo', 'secondaryLogo', 'favicon'] : ['applicationName', 'shortName'])]) select.add(new Option(key || 'No branding binding', key));
      select.value = node.attributes['data-uip-branding'] ?? '';
      select.onchange = safe(() => { files.source = setNodeAttribute(files.source, selectedNode, 'data-uip-branding', select.value); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); }); label.append(select); inspector.append(label);
    }
    if (node.attributes['data-uip-region']) {
      const label = document.createElement('label'); label.textContent = 'Region display name (stable ID unchanged)';
      const input = document.createElement('input'); input.value = node.attributes['data-uip-region-name'] ?? node.attributes['data-uip-region'];
      input.addEventListener('change', safe(() => { files.source = setNodeAttribute(files.source, selectedNode, 'data-uip-region-name', input.value); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); })); label.append(input); inspector.append(label);
    }
    const field = workingMetadata().form?.fields.find(f => f.node === selectedNode);
    if (field) {
      const mode = document.createElement('select'); mode.setAttribute('aria-label', 'Field override mode');
      for (const name of ['base', ...Object.keys(workingMetadata().modes!.overrides)]) { const option = document.createElement('option'); option.textContent = name; mode.append(option); }
      inspector.append(mode);
      for (const key of ['label', 'help', 'visible', 'editable', 'required'] as const) {
        const label = document.createElement('label'); label.textContent = `Field ${key}`;
        const input = document.createElement('input'); input.type = ['visible', 'editable', 'required'].includes(key) ? 'checkbox' : 'text';
        const refresh = () => { const m = workingMetadata(); const value = mode.value === 'base' ? field[key] : m.modes!.overrides[mode.value][field.node]?.[key] ?? field[key]; input.value = String(value ?? ''); input.checked = value !== false && (key !== 'required' || Boolean(value)); };
        refresh(); mode.addEventListener('change', refresh); input.setAttribute('aria-label', `Field ${key}`);
        input.addEventListener('change', safe(() => changeMetadata(m => {
          const target = mode.value === 'base' ? m.form!.fields.find(f => f.id === field.id)! : (m.modes!.overrides[mode.value][field.node] ??= {});
          Object.assign(target, { [key]: input.type === 'checkbox' ? input.checked : input.value });
        }))); label.append(input); inspector.append(label);
      }
    }
    const pkg = workspace.packages.find(p => p.id === node.attributes['data-uip-component']);
    const component = workspace.components.find(c => c.metadata?.componentId === node.attributes['data-uip-component']);
    const contracts = pkg?.definition?.builder.settings ?? (pkg ? legacyPackageSettingContracts(pkg) : component?.metadata?.public?.properties ?? {});
    let settings: Record<string, unknown>;
    try { settings = pkg ? readNodeSettings(files.source, selectedNode, pkg.definition, contracts) : JSON.parse(node.attributes['data-uip-settings'] ?? '{}'); } catch { inspector.textContent = 'Repair settings/source before editing properties.'; return; }
    const writeSetting = (key: string, value: unknown) => {
      settings[key] = value;
      if (pkg) files.source = setNodeSetting(files.source, selectedNode, key, value, pkg.definition, contracts);
      else files.source = setNodeAttribute(files.source, selectedNode, 'data-uip-settings', JSON.stringify(settings));
    };
    if (pkg && !pkg.definition) {
      inspector.append(Object.assign(document.createElement('p'), { textContent: 'Legacy package metadata: only declared attributes/properties are configurable. Typed public slots/events are unavailable unless explicitly declared.' }));
      const unavailable = Object.keys(pkg.presentation?.settings ?? {}).filter(key => !contracts[key]);
      if (unavailable.length) inspector.append(Object.assign(document.createElement('p'), { textContent: `No declared direct instance mapping: ${unavailable.join(', ')}. These presentation record fields are unavailable here; no attribute conversion is inferred.` }));
      for (const key of new Set([...(pkg.attributes ?? []), ...(pkg.properties ?? [])])) {
        if (contracts[key]) continue;
        const label = document.createElement('label'); label.textContent = key; const input = document.createElement('input'); input.setAttribute('aria-label', `Setting ${key}`); input.value = String(settings[key] ?? node.attributes[key] ?? '');
        input.onchange = safe(() => { settings[key] = input.value; files.source = setNodeAttribute(files.source, selectedNode, 'data-uip-settings', JSON.stringify(settings)); changed(); }); label.append(input); inspector.append(label);
      }
    }
    for (const [key, contract] of Object.entries(contracts)) {
      const packageSetting = pkg?.definition?.builder.settings[key];
      if (packageSetting?.binding?.kind === 'event') {
        inspector.append(Object.assign(document.createElement('p'), { textContent: `${key}: registered handler selection is unavailable in this host. Use the declared public event action controls.` })); continue;
      }
      if (packageSetting?.visibleWhen && (settings[packageSetting.visibleWhen.setting] ?? contracts[packageSetting.visibleWhen.setting]?.default) !== packageSetting.visibleWhen.equals) continue;
      if (contract.type === 'object' || contract.type === 'array') {
        valueControls(inspector, `Setting ${key}`, settings[key] ?? contract.default ?? (contract.type === 'array' ? [] : {}), value => {
          writeSetting(key, value); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
        }); continue;
      }
      const label = document.createElement('label'); label.textContent = key;
      const values = key === 'mode' && component?.metadata?.modes ? Object.keys(component.metadata.modes.overrides) : contract.enum;
      const input = values ? document.createElement('select') : packageSetting?.binding?.kind === 'slot' && packageSetting.binding.content === 'text' ? document.createElement('textarea') : document.createElement('input');
      if (input instanceof HTMLSelectElement) values!.forEach(value => { const option = document.createElement('option'); option.value = JSON.stringify(value); option.textContent = String(value); input.append(option); });
      if (input instanceof HTMLInputElement) input.type = contract.type === 'boolean' ? 'checkbox' : contract.type === 'number' ? 'number' : 'text';
      const value = settings[key] ?? contract.default;
      if (input instanceof HTMLSelectElement) input.value = JSON.stringify(value);
      else if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      input.setAttribute('aria-label', `Setting ${key}`);
      input.addEventListener('change', safe(() => {
        writeSetting(key, input instanceof HTMLSelectElement ? JSON.parse(input.value) : input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : ['object', 'array'].includes(contract.type) ? JSON.parse(input.value) : input.value);
        // Reset mode-specific settings exactly as the installed Definition requires.
        if (packageSetting?.binding?.kind === 'mode') for (const [name, item] of Object.entries(pkg?.definition?.builder.settings ?? {})) if (item.visibleWhen && (settings[item.visibleWhen.setting] ?? pkg!.definition!.builder.settings[item.visibleWhen.setting].default) !== item.visibleWhen.equals) writeSetting(name, item.default);
        find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
      }));
      label.append(input); inspector.append(label);
    }
    if (!node.attributes['data-uip-component'] && !isWrapper(node)) {
      const label = document.createElement('label'); label.textContent = 'Text content'; const input = document.createElement('input'); input.value = files.source.slice(node.openEnd, node.closeStart);
      input.addEventListener('change', safe(() => { if (node.children.length) throw new Error('Edit nested content in source or select a leaf.'); files.source = files.source.slice(0, node.openEnd) + esc(input.value) + files.source.slice(node.closeStart); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); })); label.append(input); inspector.append(label);
    }
    let slotChild = node, ancestor = node.parent;
    while (ancestor && !ancestor.attributes['data-uip-component']) { slotChild = ancestor; ancestor = ancestor.parent; }
    const parentComponent = workspace.components.find(item => item.metadata?.componentId === ancestor?.attributes['data-uip-component']);
    const parentPackage = workspace.packages.find(item => item.id === ancestor?.attributes['data-uip-component']);
    const slots = component?.metadata?.public?.slots ?? pkg?.definition?.runtime.slots.map(slot => slot.name) ?? pkg?.slots;
    const parentSlots = parentComponent?.metadata?.public?.slots ?? parentPackage?.definition?.runtime.slots.map(slot => slot.name) ?? parentPackage?.slots;
    compositionAuthoring(inspector, {
      metadata: workingMetadata(), node: selectedNode, change: changeMetadata, slots,
      draft: actionDrafts.get(selectedNode) ?? (() => { const draft = {}; actionDrafts.set(selectedNode, draft); return draft; })(), refresh: () => { if (active && !disposed) renderInspector(); },
      bindingTargets: component ? Object.keys(contracts).map(key => `property:${key}`) : pkg?.definition ? Object.keys(contracts).filter(key => contracts[key] && pkg.definition!.builder.settings[key].binding?.kind !== 'event').map(key => `setting:${key}`) : pkg ? [...new Set([...(pkg.attributes ?? []), ...Object.keys(contracts)])].map(key => `attribute:${key}`) : ['text', 'attribute:href', 'attribute:aria-label', 'property:disabled'],
      events: component ? Object.keys(component.metadata!.public?.events ?? {}) : pkg ? Object.keys(pkg.definition?.runtime.events ?? {}).concat(pkg.events ?? []) : ['click', 'change', 'input', 'submit'],
      ...(parentSlots && slotChild.id ? { slot: { value: slotChild.attributes.slot || (parentPackage ? 'default' : ''), choices: parentSlots, change: value => { files.source = setNodeAttribute(files.source, slotChild.id!, 'slot', parentPackage && value === 'default' ? '' : value); changed(); } } } : {}),
      workflows: async () => (await request<import('../../shared/automation-service-contract.js').AutomationAuthoringCatalog>(`${base}/automation-catalog`)).workflows, datasets: () => request(`${base}/datasets/discovery`), error: cause => status(String(cause)),
    });
    if (node.tag === 'uip-slot') {
      const label = document.createElement('label'); label.textContent = 'Public slot outlet'; const slot = document.createElement('select'); slot.setAttribute('aria-label', 'Public slot outlet');
      for (const name of workingMetadata().public?.slots ?? []) slot.add(new Option(name, name)); slot.value = node.attributes.name ?? '';
      slot.onchange = safe(() => { files.source = setNodeAttribute(files.source, selectedNode, 'name', slot.value); changed(); }); label.append(slot); inspector.append(label);
    }
    const wrapper = isWrapper(node) ? node : isWrapper(node.parent) ? node.parent : undefined;
    if (!wrapper?.id) { inspector.insertAdjacentHTML('beforeend', '<p class="note">Layout is manual for this node.</p>'); return; }
    inspector.insertAdjacentHTML('beforeend', '<label>Breakpoint<select data-breakpoint><option>base</option><option>tablet</option><option>mobile</option></select></label><div data-layout></div>');
    const renderLayout = () => {
      const breakpoint = inspector.querySelector<HTMLSelectElement>('[data-breakpoint]')!.value as 'base' | 'tablet' | 'mobile';
      const layout = workingMetadata().layout?.[wrapper.id!]?.[breakpoint] ?? {};
      const container = inspector.querySelector('[data-layout]')!; container.replaceChildren();
      for (const key of ['width', 'height', 'margin', 'padding', 'display', 'gridTemplateColumns', 'gridColumn', 'gap', 'alignItems', 'justifyContent', 'flexDirection']) {
        const label = document.createElement('label'); label.textContent = key; const input = document.createElement('input'); input.value = String((layout as Record<string, string>)[key] ?? ''); input.setAttribute('aria-label', `Layout ${breakpoint} ${key}`);
        input.addEventListener('change', safe(() => changeMetadata(m => { m.layout ??= {}; m.layout[wrapper.id!] ??= {}; m.layout[wrapper.id!][breakpoint] ??= {}; const values = m.layout[wrapper.id!][breakpoint] as Record<string, string>; if (input.value) values[key] = input.value; else delete values[key]; })));
        label.append(input); container.append(label);
      }
    };
    inspector.querySelector('[data-breakpoint]')!.addEventListener('change', renderLayout); renderLayout();
  }
  function open(bundle: ArtifactBundle, kind: 'page' | 'component' | 'shell', replace = false): void {
    invalidateCard('SOURCE_CHANGED');
    bundle = structuredClone(bundle);
    const key = `${kind}:${bundle.locator}`;
    let retained = copies.get(key);
    if (!retained) {
      const record = { bundle, kind, lifecycle: undefined! as EditingLifecycle<ArtifactFiles>, saveRequest: undefined as SourceRequest | undefined };
      record.lifecycle = new EditingLifecycle(bundle.files, async candidate => {
        const authorized = record.saveRequest;
        if (!authorized) throw new Error('The original authorized editing context is required.');
        const stamp = { record, epoch: cardEpoch, selection: cardSelectionGeneration, context: savedCardContextKey(readCardContext()), editing: record.lifecycle.generation };
        const saved = await authorized<ArtifactBundle>(`${base}/visual-${plural(record.kind)}?locator=${encodeURIComponent(record.bundle.locator)}`, { method: 'PUT', body: JSON.stringify({ mode: 'normal', files: candidate, expectedHash: record.bundle.hash }) });
        record.bundle = structuredClone(saved);
        if (!cardTerminal && stamp.epoch === cardEpoch && stamp.selection === cardSelectionGeneration && stamp.context === savedCardContextKey(readCardContext())) cardCompletion = stamp;
        return saved.files;
      });
      record.lifecycle.subscribe(() => {
        const completion = cardCompletion;
        const completed = copy === record && completion?.record === record && completion.epoch === cardEpoch &&
          completion.selection === cardSelectionGeneration && completion.context === savedCardContextKey(readCardContext()) &&
          completion.editing === record.lifecycle.generation && record.lifecycle.savedGeneration === record.lifecycle.generation &&
          !record.lifecycle.inFlight && !record.lifecycle.dirty && record.lifecycle.state === 'saved' && !record.lifecycle.failure;
        invalidateCard(record.lifecycle.suspended ? 'SUSPENDED' : record.lifecycle.state === 'saving' ? 'SAVE_PENDING' : record.lifecycle.failure ? 'SAVE_FAILED' : 'SOURCE_CHANGED');
        if (copy === record) {
          const changedSource = JSON.stringify(files) !== JSON.stringify(record.lifecycle.current);
          files = structuredClone(record.lifecycle.current); baseline = structuredClone(record.lifecycle.baseline); selected = record.bundle; hash = record.bundle.hash;
          if (changedSource) { find<HTMLTextAreaElement>('[data-source]').value = files[role]; try { renderStructure(); } catch { /* Invalid draft remains editable. */ } }
          paintState();
        } else options.onStateChange?.();
        if (completed) evaluateCard();
      });
      copies.set(key, record); retained = record;
    } else if (!retained.lifecycle.inFlight) {
      if (replace || bundle.hash !== retained.bundle.hash && !retained.lifecycle.dirty) { retained.bundle = bundle; retained.lifecycle.reset(bundle.files); }
      else if (bundle.hash !== retained.bundle.hash) retained.lifecycle.conflict();
    }
    copy = retained; selected = retained.bundle; selectedKind = kind; files = structuredClone(retained.lifecycle.current); baseline = structuredClone(retained.lifecycle.baseline); hash = retained.bundle.hash; conflict = retained.lifecycle.state === 'conflict'; selectedNode = ''; role = 'source';
    find('[data-work]').hidden = false; find<HTMLSelectElement>('[data-file]').value = role; find<HTMLTextAreaElement>('[data-source]').value = files.source;
    renderList(); changed();
    find('[data-change-shell]').hidden = kind !== 'page' || !bundle.metadata?.shellId;
    find('[data-add-region]').hidden = kind === 'component' || kind === 'page' && !bundle.metadata?.shellId;
    find('[data-place-menu]').hidden = kind !== 'shell';
    if (kind === 'page' && bundle.metadata?.shellId) void showPreview();
  }
  let selectionGeneration = 0;
  find('[data-artifacts]').addEventListener('change', safe(async () => {
    const generation = ++selectionGeneration;
    const [kind, ...path] = find<HTMLSelectElement>('[data-artifacts]').value.split(':');
    const locator = path.join(':'); if (!list(kind).some(bundle => bundle.locator === locator)) return;
    const bundle = await request<ArtifactBundle>(`${base}/visual-${plural(kind)}?locator=${encodeURIComponent(locator)}`);
    if (generation === selectionGeneration && active && !disposed) open(bundle, kind as 'page');
  }));
  target.querySelectorAll<HTMLButtonElement>('[data-create]').forEach(button => button.addEventListener('click', safe(async () => {
    if (dirty()) throw new Error('Save or recover editor changes before creating another artifact.');
    const name = prompt('Artifact name (lowercase-with-hyphens):'); if (!name) return;
    const isForm = button.dataset.create!.startsWith('form');
    const kind = button.dataset.create === 'page' ? 'page' : button.dataset.create === 'shell' ? 'shell' : 'component'; const route = kind === 'page' ? prompt('Page route:', `/${name}`) : undefined; if (route === null) return;
    const shellId = kind === 'page' && workspace.shells?.length ? prompt('Shell ID (leave empty for Application default):\n' + workspace.shells.map(shell => `${shell.metadata?.displayName}: ${shell.metadata?.artifactId}`).join('\n'), '') : undefined;
    if (shellId === null) return;
    let dataset;
    if (button.dataset.create === 'form-dataset') {
      const schema = prompt('Paste the published Dataset schema JSON (dataset and fields with stable IDs):'); if (!schema) return; dataset = JSON.parse(schema);
    }
    const bundle = await request<ArtifactBundle>(`${base}/visual-${plural(kind)}`, { method: 'POST', body: JSON.stringify({ name, route, shellId, ...(isForm ? { form: { dataset } } : {}) }) });
    workspace = await request<Workspace>(`${base}/visual-artifacts`); open(bundle, kind);
  })));
  find('[data-file]').addEventListener('change', () => { role = find<HTMLSelectElement>('[data-file]').value as keyof ArtifactFiles; find<HTMLTextAreaElement>('[data-source]').value = files[role]; });
  find('[data-source]').addEventListener('input', () => { files[role] = find<HTMLTextAreaElement>('[data-source]').value; changed(`source:${role}`); });
  find('[data-nodes]').addEventListener('change', () => { invalidateCard('SELECTION_CHANGED', true); selectedNode = find<HTMLSelectElement>('[data-nodes]').value; renderInspector(); evaluateCard(); });
  find('[data-root]').addEventListener('click', () => { invalidateCard('SELECTION_CHANGED', true); selectedNode = ''; renderStructure(); evaluateCard(); });
  target.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => button.addEventListener('click', safe(() => { files.source = moveNode(files.source, selectedNode, button.dataset.move as 'up' | 'down'); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); })));
  find('[data-add]').addEventListener('click', safe(() => {
    if (selectedKind === 'page' && workingMetadata().shellId) {
      let container = parseSource(files.source).nodes.find(node => node.id === selectedNode);
      while (container && !container.attributes['data-uip-region']) container = container.parent;
      if (!container) throw new Error('Add or select a Page Region before inserting content. Fixed surrounding content belongs to the Shell.');
    }
    const [kind, ...rest] = find<HTMLSelectElement>('[data-insert]').value.split(':'); const reference = rest.join(':');
    const pkg = workspace.packages.find(p => p.id === reference);
    const tag = kind === 'html' ? reference : kind === 'package' ? pkg!.tagName : 'uip-component';
    const ids = [`node_${crypto.randomUUID()}`, `node_${crypto.randomUUID()}`], childId = ids[1];
    const parent = parseSource(files.source).nodes.find(node => node.id === selectedNode), parentReference = parent?.attributes['data-uip-component'];
    const parentSlots = workspace.components.find(item => item.metadata?.componentId === parentReference)?.metadata?.public?.slots ?? workspace.packages.find(item => item.id === parentReference)?.definition?.runtime.slots.map(slot => slot.name);
    if (parentReference && !parentSlots?.length) throw new Error('This Component has no declared public insertion slots.');
    const slot = parentReference ? parentSlots![0] : undefined;
    files.source = insertNode(files.source, tag, kind === 'html' ? undefined : reference, selectedNode || undefined, () => ids.shift()!, workspace.packages.some(item => item.id === parentReference) && slot === 'default' ? '' : slot);
    if (tag === 'uip-slot') files.source = setNodeAttribute(files.source, childId, 'name', workingMetadata().public?.slots[0] ?? '');
    selectedNode = childId; find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
  }));
  find('[data-save]').addEventListener('click', safe(async () => {
    if (!copy) return; copy.saveRequest = transport.capture(); await copy.lifecycle.flush();
  }));
  for (const action of ['undo', 'redo'] as const) find(`[data-${action}]`).addEventListener('click', safe(() => { if (!copy) return; copy.saveRequest = transport.capture(); copy.lifecycle[action](); }));
  find('[data-repair]').addEventListener('click', safe(async () => {
    if (!copy || conflict || !confirm('Save this complete source candidate through Advanced Repair? Invalid source may block previews.')) return;
    const original = copy, authorized = transport.capture(); original.lifecycle.suspend(); find('[data-work]').inert = true;
    try {
      await original.lifecycle.inFlight;
      const saved = await authorized<ArtifactBundle>(url(), { method: 'PUT', body: JSON.stringify({ mode: 'repair', files: original.lifecycle.current, expectedHash: original.bundle.hash }) });
      original.bundle = saved; original.lifecycle.reset(saved.files);
    } finally { original.lifecycle.resume(); find('[data-work]').inert = false; }
  }));
  find('[data-reload]').addEventListener('click', safe(async () => {
    if (!copy || dirty() && !confirm('Discard editor changes and reload disk source?')) return;
    const original = copy, kind = selectedKind, section = role, authorized = transport.capture();
    find('[data-work]').inert = true; original.lifecycle.suspend();
    try {
      await original.lifecycle.inFlight;
      const saved = await authorized<ArtifactBundle>(`${base}/visual-${plural(kind)}?locator=${encodeURIComponent(original.bundle.locator)}`);
      if (copy === original) { open(saved, kind, true); role = section; find<HTMLSelectElement>('[data-file]').value = role; find<HTMLTextAreaElement>('[data-source]').value = files[role]; }
      else { original.bundle = saved; original.lifecycle.reset(saved.files); }
    } finally { original.lifecycle.resume(); find('[data-work]').inert = false; }
  }));
  find('[data-recover]').addEventListener('click', () => {
    const blob = URL.createObjectURL(new Blob([JSON.stringify({ locator: selected?.locator, files, originalHash: hash }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = blob; link.download = 'visual-artifact-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(blob), 1000);
  });
  find('[data-delete]').addEventListener('click', safe(async () => {
    if (dirty() || conflict) throw new Error('Save or recover changes before deletion.'); if (!confirm('Move this artifact bundle to the Recycle Bin?')) return;
    await request(url(), { method: 'DELETE', body: JSON.stringify({ expectedHash: hash }) }); if (copy) { await copy.lifecycle.dispose(); copies.delete(`${selectedKind}:${selected!.locator}`); } copy = undefined; selected = undefined; find('[data-work]').hidden = true; workspace = await request<Workspace>(`${base}/visual-artifacts`); renderList(); status('Deleted');
  }));
  async function showPreview(reveal = false): Promise<void> {
    if (!active || disposed) return;
    if (dirty() || conflict) throw new Error('Save source before previewing.');
    const host = find<HTMLElement>('[data-preview-host]');
    host.replaceChildren(); host.tabIndex = -1; host.setAttribute('aria-label', 'Saved design preview');
    const heading = document.createElement('h3'); heading.textContent = 'Saved design preview';
    const feedback = document.createElement('p'); feedback.setAttribute('role', 'status'); feedback.textContent = 'Loading saved design preview…';
    host.append(heading, feedback);
    find('[data-diagnostics]').before(host);
    preview?.remove(); preview = document.createElement('iframe'); preview.title = 'Nonpersisting Visual Artifact design preview'; preview.src = '/visual-preview.html'; preview.style.cssText = 'width:100%;min-height:500px;border:1px solid #ccc';
    if (!active || disposed || !preview) return;
    const frame = preview, previewApplicationKey = options.applicationKey?.() ?? appKey;
    const request = { type: 'uip-preview', design: true, locator: selected!.locator, kind: selectedKind, hash, appKey: previewApplicationKey };
    frame.addEventListener('load', () => { if (active && !disposed && frame === preview) frame.contentWindow!.postMessage(request, location.origin); });
    frame.addEventListener('error', () => { if (frame === preview) feedback.textContent = 'Design preview could not load. Check the development server, then retry Design preview.'; });
    host.append(preview);
    if (reveal) { host.scrollIntoView({ block: 'start' }); host.focus({ preventScroll: true }); }
  }
  const previewFeedback = (event: MessageEvent) => {
    if (disposed || !active || !preview || event.origin !== location.origin || event.source !== preview.contentWindow || event.data?.type !== 'uip-design-preview-state') return;
    const feedback = find('[data-preview-host] [role="status"]');
    feedback.textContent = event.data.error ? `Design preview blocked: ${String(event.data.error)} Reload saved source and retry; if access is denied, check your Application permissions.` : 'Saved design preview ready.';
  };
  window.addEventListener('message', previewFeedback);
  find('[data-preview]').addEventListener('click', safe(() => showPreview(true)));
  async function refresh(event?: Event): Promise<void> {
    if (event) invalidateCard('SOURCE_CHANGED');
    if (disposed || options.initial && !active) return;
    if (!target.isConnected) return;
    if (polling || saving || operations > 0) return; polling = true;
    try {
      const next = await request<Workspace>(`${base}/visual-artifacts`);
      if (disposed || options.initial && !active) return;
      const dependenciesChanged = JSON.stringify([workspace.shells, workspace.components].flat().map(bundle => bundle?.hash)) !== JSON.stringify([next.shells, next.components].flat().map(bundle => bundle?.hash));
      if (dependenciesChanged || JSON.stringify(workspace.packages) !== JSON.stringify(next.packages) || list(selectedKind).find(bundle => bundle.locator === selected?.locator)?.hash !== (selectedKind === 'page' ? next.pages : selectedKind === 'shell' ? next.shells : next.components).find(bundle => bundle.locator === selected?.locator)?.hash) invalidateCard('SOURCE_CHANGED');
      workspace = structuredClone(next); renderList();
      if (selected) {
        const disk = list(selectedKind).find(b => b.locator === selected!.locator);
        if (!disk || disk.hash !== hash) {
          if (dirty()) { copy?.lifecycle.conflict(); changed(); }
          else if (disk) { const node = selectedNode; open(disk, selectedKind); selectedNode = node; renderStructure(); status('Reloaded external source changes'); }
          else { conflict = true; status('Artifact was removed externally. Download recovery before changing selection.'); }
        } else if (!dirty() && !conflict && selected.metadata?.shellId && (dependenciesChanged || event)) { renderStructure(); await showPreview(); }
      }
    } catch (error) { status(String(error)); } finally { polling = false; }
  }
  workspace = structuredClone(options.workspace ?? await request<Workspace>(`${base}/visual-artifacts`)); renderList(); status('Select or create a Visual Artifact');
  if (options.initial) { find('[data-artifacts]').parentElement!.hidden = true; const bundle = list(options.initial.kind).find(b => b.locator === options.initial!.locator); if (!bundle) throw new Error('Artifact unavailable.'); open(bundle, options.initial.kind); }
  const unprotect = protectEditingDraft(() => [...copies.values()].some(item => item.lifecycle.dirty || item.lifecycle.state === 'conflict'));
  // Workspace navigation supplies freshly authorized source; save events refresh it.
  // Standalone editors retain their source watcher.
  const timer = options.initial ? undefined : setInterval(() => { void refresh(); }, 3000);
  const resumeRefresh = () => { if (document.visibilityState !== 'hidden') void refresh(); };
  window.addEventListener('focus', resumeRefresh);
  document.addEventListener('ui-platform-workspace-change', refresh);
  const unsubscribeCardContext = options.savedCardContext?.subscribe(() => invalidateCard('CONTEXT_CHANGED')) ?? (() => {});
  document.addEventListener('visibilitychange', cardVisibility);
  return {
    savedCardTarget,
    state: () => ({ dirty: [...copies.values()].some(item => item.lifecycle.dirty), pending: saving || operations > 0, conflict }),
    deactivate() { invalidateCard('NOT_ACTIVE'); active = false; preview?.remove(); preview = undefined; },
    suspend() { invalidateCard('SUSPENDED'); actionDrafts.clear(); for (const item of copies.values()) item.lifecycle.suspend(); target.hidden = true; },
    focus(next: Workspace, navigation: { node?: string; section?: string } = {}) {
      if (disposed) return;
      invalidateCard('SELECTION_CHANGED', true);
      workspace = structuredClone(next);
      const disk = list(selectedKind).find(b => b.locator === selected?.locator);
      if (!disk) throw new Error('Artifact unavailable.');
      if (disk.hash !== hash && !copy?.lifecycle.inFlight) {
        if (dirty()) { copy?.lifecycle.conflict(); changed(); }
        else { const node = selectedNode, section = role; open(disk, selectedKind); selectedNode = node; role = section; }
      }
      active = true;
      target.hidden = false; copy?.lifecycle.resume();
      if (navigation.node !== undefined) selectedNode = navigation.node;
      if (navigation.section && ['source', 'css', 'metadata', 'fixtures', 'code'].includes(navigation.section)) role = navigation.section as keyof ArtifactFiles;
      find<HTMLSelectElement>('[data-file]').value = role;
      find<HTMLTextAreaElement>('[data-source]').value = files[role];
      try { renderStructure(); } catch { status('Invalid local source retained. Repair source before using structured controls.'); }
      if (navigation.node !== undefined) evaluateCard();
    },
    async dispose() { disposed = true; active = false; if (!cardTerminal) { cardTerminal = true; cardEpoch++; cardSourceGeneration++; cardPending = false; cardCompletion = undefined; publishCard({ state: 'unavailable', reason: 'DISPOSED', generation: cardGenerations(), target: null }); } unsubscribeCardContext(); window.removeEventListener('message', previewFeedback); document.removeEventListener('visibilitychange', cardVisibility); cardListeners.clear(); clearInterval(timer); window.removeEventListener('focus', resumeRefresh); document.removeEventListener('ui-platform-workspace-change', refresh); unprotect(); transport.dispose(); await Promise.all([...copies.values()].map(item => item.lifecycle.dispose())); preview?.remove(); target.replaceChildren(); },
  };
}
