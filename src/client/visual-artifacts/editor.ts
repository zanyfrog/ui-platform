import { insertNode, isWrapper, moveNode, parseMetadata, parseSource, readPackageSettings, setNodeAttribute, regions, recommendedRegionIds } from '@ui-platform/visual-artifacts';
import type { ArtifactBundle, ArtifactFiles, ArtifactMetadata, PackageComponent } from '@ui-platform/visual-artifacts';
import type { ComponentCatalogEntry } from '../../shared/types.js';

export interface Workspace { pages: ArtifactBundle[]; components: ArtifactBundle[]; shells: ArtifactBundle[]; packages: ComponentCatalogEntry[] }
export interface VisualWorkspaceOptions {
  request?: typeof api; workspace?: Workspace; initial?: { kind: 'page' | 'component' | 'shell'; locator: string };
  onDefinition?: (componentId: string) => void; onStateChange?: () => void;
  applicationKey?: () => string;
}
const esc = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Visual Artifact request failed.'); return data;
}
export async function mountVisualEditor(target: HTMLElement, appKey: string, options: VisualWorkspaceOptions = {}) {
  const request = options.request ?? api;
  let active = !options.initial, disposed = false, operations = 0;
  const base = `/api/apps/${encodeURIComponent(appKey)}`;
  let workspace: Workspace, selected: ArtifactBundle | undefined, selectedKind: 'page' | 'component' | 'shell' = 'page';
  let files: ArtifactFiles, baseline: ArtifactFiles, hash = '', role: keyof ArtifactFiles = 'source', selectedNode = '', conflict = false, saving = false;
  let preview: HTMLIFrameElement | undefined, polling = false;
  const dirty = () => files && JSON.stringify(files) !== JSON.stringify(baseline);
  const list = (kind: string) => kind === 'page' ? workspace.pages : kind === 'shell' ? workspace.shells : workspace.components;
  const plural = (kind: string) => kind === 'page' ? 'pages' : kind === 'shell' ? 'shells' : 'components';
  const url = () => `${base}/visual-${plural(selectedKind)}?locator=${encodeURIComponent(selected!.locator)}`;
  target.innerHTML = `<div class="stack"><div class="pane-heading"><strong>Visual Artifacts</strong><span data-status aria-live="polite"></span></div>
    <div class="editor-actions"><button data-create="page">Create Page</button><button data-create="component">Create Platform Component</button><button data-create="form-dataset">Create Form from Dataset</button><button data-create="form">Create blank Form</button><select aria-label="Visual Artifact" data-artifacts><option value="">Select an artifact</option></select></div>
    <div data-work hidden><div class="editor-actions"><button data-save>Save changed files</button><button data-reload>Reload / discard editor changes</button><button data-recover>Download editor recovery</button><button data-delete>Delete artifact</button><button data-preview>Preview</button><button data-change-shell>Change Page Shell</button><button data-add-region>Add Region</button><button data-remove-node>Remove selected node</button></div>
    <div data-diagnostics></div><div class="builder-layout" style="grid-template-columns:minmax(180px,1fr) minmax(220px,2fr)"><div class="stack"><strong>Structure</strong><select data-nodes size="8" aria-label="Visual node"></select>
    <label>Insert into selected HTML container, or artifact root<select data-insert aria-label="Insert element"></select></label><button data-add>Insert with layout wrapper</button><button data-root>Select artifact root</button><button data-move="up">Move layout item up</button><button data-move="down">Move layout item down</button><div data-inspector></div></div>
    <div class="stack"><label>Source file<select data-file aria-label="Visual source file">${['source', 'css', 'metadata', 'fixtures', 'code'].map(name => `<option>${name}</option>`).join('')}</select></label><textarea data-source aria-label="Visual source" class="source-editor" spellcheck="false"></textarea><p class="note">Manual source is preserved. Conditions, repeaters, events, slots and data sources can be edited in metadata. Optional named functions belong in code.</p></div></div><div data-preview-host></div></div></div>`;
  const find = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
  const status = (message: string) => { find('[data-status]').textContent = message; options.onStateChange?.(); };
  const safe = (run: () => Promise<void> | void) => async () => { if (disposed || !active) return; operations++; try { await run(); } catch (error) { status(error instanceof Error ? error.message : String(error)); } finally { operations--; options.onStateChange?.(); } };
  find('[data-create="page"]').insertAdjacentHTML('afterend', '<button data-create="shell">Create Shell</button>');
  find('[data-add-region]').insertAdjacentHTML('afterend', '<button data-place-menu>Place Application Menu</button>');
  find('[data-place-menu]').addEventListener('click', safe(async () => {
    const composition = await request<import('@ui-platform/visual-artifacts').CompositionDefinition>(`${base}/composition`);
    const menuId = prompt('Application Menu ID:\n' + composition.menus.map(menu => `${menu.name}: ${menu.menuId}`).join('\n')); if (!menuId) return;
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
    find('[data-create="shell"]').hidden = !workspace.shells?.length;
    const select = find<HTMLSelectElement>('[data-artifacts]');
    select.innerHTML = '<option value="">Select an artifact</option>' + [['Pages', workspace.pages], ['Shells', workspace.shells ?? []], ['Platform Components', workspace.components]].map(([label, items]) => `<optgroup label="${label}">${(items as ArtifactBundle[]).map(b => `<option value="${label === 'Pages' ? 'page' : label === 'Shells' ? 'shell' : 'component'}:${esc(b.locator)}">${esc(b.metadata?.displayName ?? b.locator)}${b.diagnostics.some(d => d.severity === 'error') ? ' (needs repair)' : ''}</option>`).join('')}</optgroup>`).join('');
    if (selected) select.value = `${selectedKind}:${selected.locator}`;
    find<HTMLSelectElement>('[data-insert]').innerHTML = '<optgroup label="HTML">' + ['section', 'div', 'article', 'p', 'h2', 'a', 'img', 'ul', 'li', 'span'].map(tag => `<option value="html:${tag}">${tag}</option>`).join('') + '</optgroup><optgroup label="Package Components">' + workspace.packages.filter(p => !p.activationIssues?.length).map(p => `<option value="package:${esc(p.id)}">${esc(p.name ?? p.tagName)}</option>`).join('') + '</optgroup><optgroup label="Platform Components">' + workspace.components.filter(b => b.metadata && !b.diagnostics.some(d => d.severity === 'error')).map(b => `<option value="component:${esc(b.metadata!.componentId)}">${esc(b.metadata!.displayName)}</option>`).join('') + '</optgroup>';
  }
  function workingMetadata(): ArtifactMetadata { const metadata = parseMetadata(files.metadata).metadata; if (!metadata) throw new Error('Repair metadata JSON first.'); return metadata; }
  function changeMetadata(change: (metadata: ArtifactMetadata) => void): void { const metadata = workingMetadata(); change(metadata); files.metadata = JSON.stringify(metadata, null, 2) + '\n'; changed(); }
  function changed(): void { status(conflict ? 'External changes conflict with editor work. Recover or reload before saving.' : dirty() ? 'Unsaved changes' : 'No changes'); find<HTMLButtonElement>('[data-save]').disabled = conflict || !dirty(); if (role !== 'source') find<HTMLTextAreaElement>('[data-source]').value = files[role]; try { renderStructure(); } catch { status('Invalid local source retained. Repair source before using structured controls.'); } }
  function renderStructure(): void {
    const parsed = parseSource(files.source);
    const selector = find<HTMLSelectElement>('[data-nodes]');
    const shell = selectedKind === 'page' ? workspace.shells?.find(shell => shell.metadata?.artifactId === workingMetadata().shellId) : undefined;
    selector.innerHTML = (shell ? '<optgroup label="Shell context — locked; edit the Shell">' + parseSource(shell.files.source).nodes.filter(n => !n.attributes['data-uip-region']).map(n => `<option disabled>🔒 ${esc(n.tag + ' ' + (n.id ?? ''))}</option>`).join('') + '</optgroup>' : '') + parsed.nodes.map((n, index) => `<option value="${esc(n.id ?? `manual:${index}`)}">${esc(`${n.attributes['data-uip-region'] ?? n.tag} ${n.attributes['data-uip-region-name'] ?? n.id ?? '(manual)'}`)}</option>`).join('');
    selector.value = selectedNode;
    find('[data-diagnostics]').innerHTML = [...(selected?.diagnostics ?? []), ...parsed.diagnostics].map(d => `<p class="${d.severity === 'error' ? 'error' : 'note'}">${esc(d.message)}</p>`).join('');
    renderInspector();
  }
  function renderInspector(): void {
    const inspector = find('[data-inspector]'); const parsed = parseSource(files.source);
    const node = parsed.nodes.find(n => n.id === selectedNode);
    inspector.innerHTML = '';
    const definitionId = node?.attributes['data-uip-component'];
    if (definitionId && options.onDefinition) {
      const edit = document.createElement('button'); edit.textContent = 'Edit Definition';
      edit.onclick = () => options.onDefinition!(definitionId); inspector.append(edit);
    }
    if (!node) {
      inspector.innerHTML = '<p class="note">Select a managed node to edit settings and bindings.</p>';
      const metadata = workingMetadata();
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
      if (selectedKind === 'component' || selectedKind === 'shell') {
        inspector.insertAdjacentHTML('beforeend', '<button data-public>Add public property</button>');
        inspector.querySelector('[data-public]')!.addEventListener('click', safe(() => {
          const name = prompt('Public property name:'); if (!name) return;
          const type = prompt('Type: string, number, boolean, object, array', 'string'); if (!type || !['string', 'number', 'boolean', 'object', 'array'].includes(type)) throw new Error('Choose one of the five supported types.');
          const defaultText = prompt('Default value as JSON (leave blank for no default):', type === 'string' ? '""' : ''); if (defaultText === null) return;
          const required = confirm('Require this property?');
          changeMetadata(m => { m.public ??= { properties: {}, events: {}, slots: [] }; m.public.properties[name] = { type: type as 'string', required, ...(defaultText ? { default: JSON.parse(defaultText) } : {}) }; });
        }));
      }
      return;
    }
    if (node.manual) { inspector.textContent = 'Manual region: edit source directly.'; return; }
    const classLabel = document.createElement('label'); classLabel.textContent = 'CSS classes'; const classInput = document.createElement('input'); classInput.value = node.attributes.class ?? '';
    classInput.addEventListener('change', safe(() => { files.source = setNodeAttribute(files.source, selectedNode, 'class', classInput.value); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); })); classLabel.append(classInput); inspector.append(classLabel);
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
    const contracts = pkg?.definition?.builder.settings ?? component?.metadata?.public?.properties ?? {};
    let settings: Record<string, unknown>;
    try { settings = JSON.parse(node.attributes['data-uip-settings'] ?? '{}'); } catch { inspector.textContent = 'Repair settings JSON in source first.'; return; }
    if (pkg?.definition) settings = readPackageSettings(pkg.definition, node.attributes, settings);
    for (const [key, contract] of Object.entries(contracts)) {
      const label = document.createElement('label'); label.textContent = key;
      const input = contract.enum ? document.createElement('select') : document.createElement('input');
      if (input instanceof HTMLSelectElement) contract.enum!.forEach(value => { const option = document.createElement('option'); option.value = JSON.stringify(value); option.textContent = String(value); input.append(option); });
      if (input instanceof HTMLInputElement) input.type = contract.type === 'boolean' ? 'checkbox' : contract.type === 'number' ? 'number' : 'text';
      const value = settings[key] ?? contract.default;
      if (input instanceof HTMLSelectElement) input.value = JSON.stringify(value);
      else if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      input.setAttribute('aria-label', `Setting ${key}`);
      input.addEventListener('change', safe(() => {
        settings[key] = input instanceof HTMLSelectElement ? JSON.parse(input.value) : input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : ['object', 'array'].includes(contract.type) ? JSON.parse(input.value) : input.value;
        // Reset mode-specific settings exactly as the installed Definition requires.
        for (const [name, item] of Object.entries(pkg?.definition?.builder.settings ?? {})) if (item.visibleWhen && (settings[item.visibleWhen.setting] ?? pkg!.definition!.builder.settings[item.visibleWhen.setting].default) !== item.visibleWhen.equals) settings[name] = item.default;
        files.source = setNodeAttribute(files.source, selectedNode, 'data-uip-settings', JSON.stringify(settings));
        find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
      }));
      label.append(input); inspector.append(label);
    }
    if (!node.attributes['data-uip-component'] && !isWrapper(node)) {
      const label = document.createElement('label'); label.textContent = 'Text content'; const input = document.createElement('input'); input.value = files.source.slice(node.openEnd, node.closeStart);
      input.addEventListener('change', safe(() => { if (node.children.length) throw new Error('Edit nested content in source or select a leaf.'); files.source = files.source.slice(0, node.openEnd) + esc(input.value) + files.source.slice(node.closeStart); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); })); label.append(input); inspector.append(label);
    }
    inspector.insertAdjacentHTML('beforeend', '<button data-bind>Add basic binding</button>');
    inspector.querySelector('[data-bind]')!.addEventListener('click', safe(() => {
      const targetName = prompt('Target: text, attribute:name, property:name, or setting:name', component ? 'property:' : pkg?.definition ? 'setting:heading' : 'text'); if (!targetName) return;
      const path = prompt('Named source path (for example public.person.name or local.isExpanded):'); if (!path) return;
      changeMetadata(m => { m.bindings = [...(m.bindings ?? []).filter(b => !(b.node === selectedNode && b.target === targetName)), { node: selectedNode, target: targetName, value: path }]; });
    }));
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
  function open(bundle: ArtifactBundle, kind: 'page' | 'component' | 'shell'): void {
    selected = bundle; selectedKind = kind; files = structuredClone(bundle.files); baseline = structuredClone(files); hash = bundle.hash; conflict = false; selectedNode = ''; role = 'source';
    find('[data-work]').hidden = false; find<HTMLSelectElement>('[data-file]').value = role; find<HTMLTextAreaElement>('[data-source]').value = files.source;
    renderList(); changed();
    find('[data-change-shell]').hidden = kind !== 'page' || !bundle.metadata?.shellId;
    find('[data-add-region]').hidden = kind === 'component' || kind === 'page' && !bundle.metadata?.shellId;
    find('[data-place-menu]').hidden = kind !== 'shell';
    if (kind === 'page' && bundle.metadata?.shellId) void showPreview();
  }
  find('[data-artifacts]').addEventListener('change', safe(() => {
    if (dirty() && !confirm('Discard unsaved editor changes? Download recovery first if needed.')) { renderList(); return; }
    const [kind, ...path] = find<HTMLSelectElement>('[data-artifacts]').value.split(':');
    const bundle = list(kind).find(b => b.locator === path.join(':')); if (bundle) open(bundle, kind as 'page');
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
  find('[data-source]').addEventListener('input', () => { files[role] = find<HTMLTextAreaElement>('[data-source]').value; changed(); });
  find('[data-nodes]').addEventListener('change', () => { selectedNode = find<HTMLSelectElement>('[data-nodes]').value; renderInspector(); });
  find('[data-root]').addEventListener('click', () => { selectedNode = ''; renderStructure(); });
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
    files.source = insertNode(files.source, tag, kind === 'html' ? undefined : reference, selectedNode || undefined); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
  }));
  find('[data-save]').addEventListener('click', safe(async () => {
    if (conflict || saving) throw new Error('Resolve external changes before saving.'); saving = true; find('[data-work]').inert = true;
    try {
      for (const name of Object.keys(files) as Array<keyof ArtifactFiles>) if (files[name] !== baseline[name]) {
        const saved = await request<ArtifactBundle>(url(), { method: 'PUT', body: JSON.stringify({ role: name, content: files[name], expectedHash: hash }) });
        hash = saved.hash; baseline[name] = files[name]; selected = saved;
      }
      workspace = await request<Workspace>(`${base}/visual-artifacts`); selected = list(selectedKind).find(b => b.locator === selected!.locator) ?? selected;
      renderList(); changed(); status('Saved and validated');
    } finally { saving = false; find('[data-work]').inert = false; options.onStateChange?.(); }
  }));
  find('[data-reload]').addEventListener('click', safe(async () => { if (dirty() && !confirm('Discard editor changes and reload disk source?')) return; open(await request<ArtifactBundle>(url()), selectedKind); }));
  find('[data-recover]').addEventListener('click', () => {
    const blob = URL.createObjectURL(new Blob([JSON.stringify({ locator: selected?.locator, files, originalHash: hash }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = blob; link.download = 'visual-artifact-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(blob), 1000);
  });
  find('[data-delete]').addEventListener('click', safe(async () => {
    if (dirty() || conflict) throw new Error('Save or recover changes before deletion.'); if (!confirm('Move this artifact bundle to the Recycle Bin?')) return;
    await request(url(), { method: 'DELETE', body: JSON.stringify({ expectedHash: hash }) }); selected = undefined; find('[data-work]').hidden = true; workspace = await request<Workspace>(`${base}/visual-artifacts`); renderList(); status('Deleted');
  }));
  async function showPreview(): Promise<void> {
    if (!active || disposed) return;
    if (dirty() || conflict) throw new Error('Save source before previewing.');
    preview?.remove(); preview = document.createElement('iframe'); preview.title = 'Visual Artifact runtime preview'; preview.src = '/visual-preview.html'; preview.style.cssText = 'width:100%;min-height:500px;border:1px solid #ccc';
    const composition = selected?.metadata?.shellId || selectedKind === 'shell' ? await request(`${base}/composition`) : null;
    if (!active || disposed || !preview) return;
    const frame = preview, previewApplicationKey = options.applicationKey?.() ?? appKey;
    frame.addEventListener('load', () => { if (active && !disposed && frame === preview) frame.contentWindow!.postMessage({ type: 'uip-preview', bundle: selected, composition, shells: workspace.shells, components: workspace.components, packages: workspace.packages as PackageComponent[], appKey: previewApplicationKey }, location.origin); });
    find('[data-preview-host]').append(preview);
  }
  find('[data-preview]').addEventListener('click', safe(showPreview));
  async function refresh(event?: Event): Promise<void> {
    if (disposed || options.initial && !active) return;
    if (!options.initial && !target.isConnected) { clearInterval(timer); document.removeEventListener('ui-platform-workspace-change', refresh); return; }
    if (polling || saving) return; polling = true;
    try {
      const next = await request<Workspace>(`${base}/visual-artifacts`);
      if (disposed || options.initial && !active) return;
      const dependenciesChanged = JSON.stringify([workspace.shells, workspace.components].flat().map(bundle => bundle?.hash)) !== JSON.stringify([next.shells, next.components].flat().map(bundle => bundle?.hash));
      workspace = next; renderList();
      if (selected) {
        const disk = list(selectedKind).find(b => b.locator === selected!.locator);
        if (!disk || disk.hash !== hash) {
          if (dirty()) { conflict = true; changed(); }
          else if (disk) { const node = selectedNode; open(disk, selectedKind); selectedNode = node; renderStructure(); status('Reloaded external source changes'); }
          else { conflict = true; status('Artifact was removed externally. Download recovery before changing selection.'); }
        } else if (!dirty() && !conflict && selected.metadata?.shellId && (dependenciesChanged || event)) { renderStructure(); await showPreview(); }
      }
    } catch (error) { status(String(error)); } finally { polling = false; }
  }
  workspace = options.workspace ?? await request<Workspace>(`${base}/visual-artifacts`); renderList(); status('Select or create a Visual Artifact');
  if (options.initial) { find('[data-artifacts]').parentElement!.hidden = true; const bundle = list(options.initial.kind).find(b => b.locator === options.initial!.locator); if (!bundle) throw new Error('Artifact unavailable.'); open(bundle, options.initial.kind); }
  const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  const timer = setInterval(() => { if (!options.initial && !target.isConnected) window.removeEventListener('beforeunload', beforeUnload); void refresh(); }, 3000);
  document.addEventListener('ui-platform-workspace-change', refresh);
  return {
    state: () => ({ dirty: !!dirty(), pending: saving || operations > 0, conflict }),
    deactivate() { active = false; preview?.remove(); preview = undefined; },
    focus(next: Workspace, navigation: { node?: string; section?: string } = {}) {
      workspace = next;
      const disk = list(selectedKind).find(b => b.locator === selected?.locator);
      if (!disk) throw new Error('Artifact unavailable.');
      if (disk.hash !== hash) {
        if (dirty()) { conflict = true; changed(); }
        else { const node = selectedNode, section = role; open(disk, selectedKind); selectedNode = node; role = section; }
      }
      active = true;
      if (navigation.node !== undefined) selectedNode = navigation.node;
      if (navigation.section && ['source', 'css', 'metadata', 'fixtures', 'code'].includes(navigation.section)) role = navigation.section as keyof ArtifactFiles;
      find<HTMLSelectElement>('[data-file]').value = role;
      find<HTMLTextAreaElement>('[data-source]').value = files[role];
      try { renderStructure(); } catch { status('Invalid local source retained. Repair source before using structured controls.'); }
    },
    dispose() { disposed = true; active = false; clearInterval(timer); document.removeEventListener('ui-platform-workspace-change', refresh); window.removeEventListener('beforeunload', beforeUnload); preview?.remove(); target.replaceChildren(); },
  };
}
