import { insertNode, isWrapper, moveNode, parseMetadata, parseSource, readPackageSettings, setNodeAttribute } from '@ui-platform/visual-artifacts';
import type { ArtifactBundle, ArtifactFiles, ArtifactMetadata, PackageComponent } from '@ui-platform/visual-artifacts';
import type { ComponentCatalogEntry } from '../../shared/types.js';

interface Workspace { pages: ArtifactBundle[]; components: ArtifactBundle[]; packages: ComponentCatalogEntry[] }
const esc = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Visual Artifact request failed.'); return data;
}
export async function mountVisualEditor(target: HTMLElement, appKey: string): Promise<void> {
  const base = `/api/apps/${encodeURIComponent(appKey)}`;
  let workspace: Workspace, selected: ArtifactBundle | undefined, selectedKind: 'page' | 'component' = 'page';
  let files: ArtifactFiles, baseline: ArtifactFiles, hash = '', role: keyof ArtifactFiles = 'source', selectedNode = '', conflict = false, saving = false;
  let preview: HTMLIFrameElement | undefined, polling = false;
  const dirty = () => files && JSON.stringify(files) !== JSON.stringify(baseline);
  const url = () => `${base}/visual-${selectedKind === 'page' ? 'pages' : 'components'}?locator=${encodeURIComponent(selected!.locator)}`;
  target.innerHTML = `<div class="stack"><div class="pane-heading"><strong>Visual Artifacts</strong><span data-status aria-live="polite"></span></div>
    <div class="editor-actions"><button data-create="page">Create Page</button><button data-create="component">Create Platform Component</button><button data-create="form-dataset">Create Form from Dataset</button><button data-create="form">Create blank Form</button><select aria-label="Visual Artifact" data-artifacts><option value="">Select an artifact</option></select></div>
    <div data-work hidden><div class="editor-actions"><button data-save>Save changed files</button><button data-reload>Reload / discard editor changes</button><button data-recover>Download editor recovery</button><button data-delete>Delete artifact</button><button data-preview>Preview</button></div>
    <div data-diagnostics></div><div class="builder-layout" style="grid-template-columns:minmax(180px,1fr) minmax(220px,2fr)"><div class="stack"><strong>Structure</strong><select data-nodes size="8" aria-label="Visual node"></select>
    <label>Insert into selected HTML container, or artifact root<select data-insert aria-label="Insert element"></select></label><button data-add>Insert with layout wrapper</button><button data-root>Select artifact root</button><button data-move="up">Move layout item up</button><button data-move="down">Move layout item down</button><div data-inspector></div></div>
    <div class="stack"><label>Source file<select data-file aria-label="Visual source file">${['source', 'css', 'metadata', 'fixtures', 'code'].map(name => `<option>${name}</option>`).join('')}</select></label><textarea data-source aria-label="Visual source" class="source-editor" spellcheck="false"></textarea><p class="note">Manual source is preserved. Conditions, repeaters, events, slots and data sources can be edited in metadata. Optional named functions belong in code.</p></div></div><div data-preview-host></div></div></div>`;
  const find = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
  const status = (message: string) => { find('[data-status]').textContent = message; };
  const safe = (run: () => Promise<void> | void) => async () => { try { await run(); } catch (error) { status(error instanceof Error ? error.message : String(error)); } };
  function renderList(): void {
    const select = find<HTMLSelectElement>('[data-artifacts]');
    select.innerHTML = '<option value="">Select an artifact</option>' + [['Pages', workspace.pages], ['Platform Components', workspace.components]].map(([label, items]) => `<optgroup label="${label}">${(items as ArtifactBundle[]).map(b => `<option value="${label === 'Pages' ? 'page' : 'component'}:${esc(b.locator)}">${esc(b.metadata?.displayName ?? b.locator)}${b.diagnostics.some(d => d.severity === 'error') ? ' (needs repair)' : ''}</option>`).join('')}</optgroup>`).join('');
    if (selected) select.value = `${selectedKind}:${selected.locator}`;
    find<HTMLSelectElement>('[data-insert]').innerHTML = '<optgroup label="HTML">' + ['section', 'div', 'article', 'p', 'h2', 'a', 'img', 'ul', 'li', 'span'].map(tag => `<option value="html:${tag}">${tag}</option>`).join('') + '</optgroup><optgroup label="Package Components">' + workspace.packages.filter(p => !p.activationIssues?.length).map(p => `<option value="package:${esc(p.id)}">${esc(p.name ?? p.tagName)}</option>`).join('') + '</optgroup><optgroup label="Platform Components">' + workspace.components.filter(b => b.metadata && !b.diagnostics.some(d => d.severity === 'error')).map(b => `<option value="component:${esc(b.metadata!.componentId)}">${esc(b.metadata!.displayName)}</option>`).join('') + '</optgroup>';
  }
  function workingMetadata(): ArtifactMetadata { const metadata = parseMetadata(files.metadata).metadata; if (!metadata) throw new Error('Repair metadata JSON first.'); return metadata; }
  function changeMetadata(change: (metadata: ArtifactMetadata) => void): void { const metadata = workingMetadata(); change(metadata); files.metadata = JSON.stringify(metadata, null, 2) + '\n'; changed(); }
  function changed(): void { status(conflict ? 'External changes conflict with editor work. Recover or reload before saving.' : dirty() ? 'Unsaved changes' : 'No changes'); find<HTMLButtonElement>('[data-save]').disabled = conflict || !dirty(); if (role !== 'source') find<HTMLTextAreaElement>('[data-source]').value = files[role]; renderStructure(); }
  function renderStructure(): void {
    const parsed = parseSource(files.source);
    const selector = find<HTMLSelectElement>('[data-nodes]');
    selector.innerHTML = parsed.nodes.map((n, index) => `<option value="${esc(n.id ?? `manual:${index}`)}">${esc(`${n.tag} ${n.id ?? '(manual)'}`)}</option>`).join('');
    selector.value = selectedNode;
    find('[data-diagnostics]').innerHTML = [...(selected?.diagnostics ?? []), ...parsed.diagnostics].map(d => `<p class="${d.severity === 'error' ? 'error' : 'note'}">${esc(d.message)}</p>`).join('');
    renderInspector();
  }
  function renderInspector(): void {
    const inspector = find('[data-inspector]'); const parsed = parseSource(files.source);
    const node = parsed.nodes.find(n => n.id === selectedNode);
    inspector.innerHTML = '';
    if (!node) {
      inspector.innerHTML = '<p class="note">Select a managed node to edit settings and bindings.</p>';
      const metadata = workingMetadata();
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
      if (selectedKind === 'component') {
        inspector.insertAdjacentHTML('beforeend', '<button data-public>Add public property</button>');
        inspector.querySelector('[data-public]')!.addEventListener('click', safe(() => {
          const name = prompt('Public property name:'); if (!name) return;
          const type = prompt('Type: string, number, boolean, object, array', 'string'); if (!type || !['string', 'number', 'boolean', 'object', 'array'].includes(type)) throw new Error('Choose one of the five supported types.');
          const defaultText = prompt('Default value as JSON (leave blank for no default):', type === 'string' ? '""' : ''); if (defaultText === null) return;
          const required = confirm('Require this property?');
          changeMetadata(m => { m.public!.properties[name] = { type: type as 'string', required, ...(defaultText ? { default: JSON.parse(defaultText) } : {}) }; });
        }));
      }
      return;
    }
    if (node.manual) { inspector.textContent = 'Manual region: edit source directly.'; return; }
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
  function open(bundle: ArtifactBundle, kind: 'page' | 'component'): void {
    selected = bundle; selectedKind = kind; files = structuredClone(bundle.files); baseline = structuredClone(files); hash = bundle.hash; conflict = false; selectedNode = ''; role = 'source';
    find('[data-work]').hidden = false; find<HTMLSelectElement>('[data-file]').value = role; find<HTMLTextAreaElement>('[data-source]').value = files.source;
    renderList(); changed();
  }
  find('[data-artifacts]').addEventListener('change', safe(() => {
    if (dirty() && !confirm('Discard unsaved editor changes? Download recovery first if needed.')) { renderList(); return; }
    const [kind, ...path] = find<HTMLSelectElement>('[data-artifacts]').value.split(':');
    const bundle = (kind === 'page' ? workspace.pages : workspace.components).find(b => b.locator === path.join(':')); if (bundle) open(bundle, kind as 'page');
  }));
  target.querySelectorAll<HTMLButtonElement>('[data-create]').forEach(button => button.addEventListener('click', safe(async () => {
    if (dirty()) throw new Error('Save or recover editor changes before creating another artifact.');
    const name = prompt('Artifact name (lowercase-with-hyphens):'); if (!name) return;
    const isForm = button.dataset.create!.startsWith('form');
    const kind = button.dataset.create === 'page' ? 'page' : 'component'; const route = kind === 'page' ? prompt('Page route:', `/${name}`) : undefined; if (route === null) return;
    let dataset;
    if (button.dataset.create === 'form-dataset') {
      const schema = prompt('Paste the published Dataset schema JSON (dataset and fields with stable IDs):'); if (!schema) return; dataset = JSON.parse(schema);
    }
    const bundle = await api<ArtifactBundle>(`${base}/visual-${kind === 'page' ? 'pages' : 'components'}`, { method: 'POST', body: JSON.stringify({ name, route, ...(isForm ? { form: { dataset } } : {}) }) });
    workspace = await api<Workspace>(`${base}/visual-artifacts`); open(bundle, kind);
  })));
  find('[data-file]').addEventListener('change', () => { role = find<HTMLSelectElement>('[data-file]').value as keyof ArtifactFiles; find<HTMLTextAreaElement>('[data-source]').value = files[role]; });
  find('[data-source]').addEventListener('input', () => { files[role] = find<HTMLTextAreaElement>('[data-source]').value; changed(); });
  find('[data-nodes]').addEventListener('change', () => { selectedNode = find<HTMLSelectElement>('[data-nodes]').value; renderInspector(); });
  find('[data-root]').addEventListener('click', () => { selectedNode = ''; renderStructure(); });
  target.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => button.addEventListener('click', safe(() => { files.source = moveNode(files.source, selectedNode, button.dataset.move as 'up' | 'down'); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed(); })));
  find('[data-add]').addEventListener('click', safe(() => {
    const [kind, ...rest] = find<HTMLSelectElement>('[data-insert]').value.split(':'); const reference = rest.join(':');
    const pkg = workspace.packages.find(p => p.id === reference);
    const tag = kind === 'html' ? reference : kind === 'package' ? pkg!.tagName : 'uip-component';
    files.source = insertNode(files.source, tag, kind === 'html' ? undefined : reference, selectedNode || undefined); find<HTMLTextAreaElement>('[data-source]').value = files[role]; changed();
  }));
  find('[data-save]').addEventListener('click', safe(async () => {
    if (conflict || saving) throw new Error('Resolve external changes before saving.'); saving = true; find('[data-work]').inert = true;
    try {
      for (const name of Object.keys(files) as Array<keyof ArtifactFiles>) if (files[name] !== baseline[name]) {
        const saved = await api<ArtifactBundle>(url(), { method: 'PUT', body: JSON.stringify({ role: name, content: files[name], expectedHash: hash }) });
        hash = saved.hash; baseline[name] = files[name]; selected = saved;
      }
      workspace = await api<Workspace>(`${base}/visual-artifacts`); selected = (selectedKind === 'page' ? workspace.pages : workspace.components).find(b => b.locator === selected!.locator) ?? selected;
      renderList(); changed(); status('Saved and validated');
    } finally { saving = false; find('[data-work]').inert = false; }
  }));
  find('[data-reload]').addEventListener('click', safe(async () => { if (dirty() && !confirm('Discard editor changes and reload disk source?')) return; open(await api<ArtifactBundle>(url()), selectedKind); }));
  find('[data-recover]').addEventListener('click', () => {
    const blob = URL.createObjectURL(new Blob([JSON.stringify({ locator: selected?.locator, files, originalHash: hash }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = blob; link.download = 'visual-artifact-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(blob), 1000);
  });
  find('[data-delete]').addEventListener('click', safe(async () => {
    if (dirty() || conflict) throw new Error('Save or recover changes before deletion.'); if (!confirm('Move this artifact bundle to the Recycle Bin?')) return;
    await api(url(), { method: 'DELETE', body: JSON.stringify({ expectedHash: hash }) }); selected = undefined; find('[data-work]').hidden = true; workspace = await api<Workspace>(`${base}/visual-artifacts`); renderList(); status('Deleted');
  }));
  find('[data-preview]').addEventListener('click', safe(() => {
    if (dirty() || conflict) throw new Error('Save source before previewing.');
    preview?.remove(); preview = document.createElement('iframe'); preview.title = 'Visual Artifact runtime preview'; preview.src = '/visual-preview.html'; preview.style.cssText = 'width:100%;min-height:500px;border:1px solid #ccc';
    preview.addEventListener('load', () => preview!.contentWindow!.postMessage({ type: 'uip-preview', bundle: selected, components: workspace.components, packages: workspace.packages as PackageComponent[], appKey }, location.origin));
    find('[data-preview-host]').append(preview);
  }));
  async function refresh(): Promise<void> {
    if (!target.isConnected) { clearInterval(timer); document.removeEventListener('ui-platform-workspace-change', refresh); return; }
    if (polling || saving) return; polling = true;
    try {
      const next = await api<Workspace>(`${base}/visual-artifacts`); workspace = next; renderList();
      if (selected) {
        const disk = (selectedKind === 'page' ? next.pages : next.components).find(b => b.locator === selected!.locator);
        if (!disk || disk.hash !== hash) {
          if (dirty()) { conflict = true; changed(); }
          else if (disk) { const node = selectedNode; open(disk, selectedKind); selectedNode = node; renderStructure(); status('Reloaded external source changes'); }
          else { conflict = true; status('Artifact was removed externally. Download recovery before changing selection.'); }
        }
      }
    } catch (error) { status(String(error)); } finally { polling = false; }
  }
  workspace = await api<Workspace>(`${base}/visual-artifacts`); renderList(); status('Select or create a Visual Artifact');
  const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  const timer = setInterval(() => { if (!target.isConnected) window.removeEventListener('beforeunload', beforeUnload); void refresh(); }, 3000);
  document.addEventListener('ui-platform-workspace-change', refresh);
}
