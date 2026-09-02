import type { ComponentCatalogEntry, PageSourcePayload, PageTreePayload } from '../shared/types';
import './components/tree';

interface BuilderApp { key: string; name: string; }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`);
  return payload as T;
}

function esc(value: unknown): string { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

export async function mountBuilder(target: HTMLElement, app: BuilderApp): Promise<void> {
  target.innerHTML = `<section class="panel stack builder-panel">
    <div class="builder-heading"><div><uib-heading text="Page Builder" level="2" size="compact"></uib-heading><p class="note">Pages are discovered from <code>src/pages</code>. Changes are written back to the selected source file.</p></div><span id="builderStatus" class="save-status" aria-live="polite">Loading builder...</span></div>
    <div class="builder-layout">
      <aside class="builder-sidebar"><div class="pane-heading"><strong>Site Tree</strong><span id="pageCount" class="note"></span></div><div id="siteTree" class="tree-host"></div></aside>
      <section class="builder-center"><div id="pageEditor" class="page-editor"><p class="note">Select a page to inspect its structure and source.</p></div></section>
      <aside class="builder-sidebar component-sidebar"><div class="pane-heading"><strong>Components</strong><span id="componentCount" class="note"></span></div><input id="componentSearch" type="search" placeholder="Search components" aria-label="Search components"><div id="componentCatalog" class="component-catalog"></div></aside>
    </div>
  </section>`;

  const status = target.querySelector<HTMLElement>('#builderStatus')!;
  const pageEditor = target.querySelector<HTMLElement>('#pageEditor')!;
  const siteTree = target.querySelector<HTMLElement>('#siteTree')!;
  const componentCatalog = target.querySelector<HTMLElement>('#componentCatalog')!;
  const componentSearch = target.querySelector<HTMLInputElement>('#componentSearch')!;
  const pageCount = target.querySelector<HTMLElement>('#pageCount')!;
  const componentCount = target.querySelector<HTMLElement>('#componentCount')!;
  let pagePayload: PageTreePayload;
  let components: ComponentCatalogEntry[];
  let siteTreeComponent: (HTMLElement & { nodes: PageTreePayload['tree'] }) | null = null;
  let selectedSource: string | null = null;

  try {
    [pagePayload, components] = await Promise.all([
      api<PageTreePayload>(`/api/apps/${encodeURIComponent(app.key)}/pages`),
      api<ComponentCatalogEntry[]>(`/api/apps/${encodeURIComponent(app.key)}/components`),
    ]);
    pageCount.textContent = `${pagePayload.pages.length} page${pagePayload.pages.length === 1 ? '' : 's'}`;
    componentCount.textContent = `${components.length}`;
    siteTreeComponent = document.createElement('ui-platform-tree') as HTMLElement & { nodes: PageTreePayload['tree'] };
    siteTreeComponent.nodes = pagePayload.tree;
    siteTree.append(siteTreeComponent);
    renderCatalog();
    siteTreeComponent.addEventListener('ui-tree-select', (event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail.source;
      if (source) void loadPage(source);
    });
    componentSearch.addEventListener('input', renderCatalog);
    if (pagePayload.pages[0]) await loadPage(pagePayload.pages[0].source);
    else pageEditor.innerHTML = '<p class="note">No pages were found under src/pages.</p>';
    document.addEventListener('ui-platform-workspace-change', syncWorkspace);
  } catch (error) {
    status.textContent = 'Builder unavailable';
    pageEditor.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
  }

  async function syncWorkspace(): Promise<void> {
    if (!target.isConnected) {
      document.removeEventListener('ui-platform-workspace-change', syncWorkspace);
      return;
    }
    try {
      pagePayload = await api<PageTreePayload>(`/api/apps/${encodeURIComponent(app.key)}/pages`);
      pageCount.textContent = `${pagePayload.pages.length} page${pagePayload.pages.length === 1 ? '' : 's'}`;
      if (siteTreeComponent) siteTreeComponent.nodes = pagePayload.tree;
      if (selectedSource && !pagePayload.pages.some((page) => page.source === selectedSource)) {
        const next = pagePayload.pages[0];
        if (next) await loadPage(next.source);
        else pageEditor.innerHTML = '<p class="note">No pages were found under src/pages.</p>';
      }
    } catch {
      status.textContent = 'Could not refresh pages';
    }
  }

  function renderCatalog(): void {
    const query = componentSearch.value.trim().toLowerCase();
    const filtered = components.filter((item) => [item.name, item.tagName, item.packageName, item.category, item.description].some((value) => String(value ?? '').toLowerCase().includes(query)));
    const packages = new Map<string, ComponentCatalogEntry[]>();
    filtered.forEach((item) => packages.set(item.packageName, [...(packages.get(item.packageName) ?? []), item]));
    componentCatalog.innerHTML = [...packages.entries()].map(([packageName, entries]) => `<details class="component-group"><summary><span>${esc(packageName)}</span><span class="note">${entries.length}</span></summary><div class="component-items">${entries.map((item) => `<button type="button" class="component-item" title="${esc(item.description ?? item.tagName)}"><strong>${esc(item.name)}</strong><code>${esc(item.tagName)}</code></button>`).join('')}</div></details>`).join('') || '<p class="note">No matching components.</p>';
  }

  async function loadPage(source: string): Promise<void> {
    selectedSource = source;
    status.textContent = 'Loading page...';
    try {
      const payload = await api<PageSourcePayload>(`/api/apps/${encodeURIComponent(app.key)}/page?source=${encodeURIComponent(source)}`);
      renderPageEditor(payload);
      const tree = siteTree.querySelector('ui-platform-tree') as HTMLElement & { selected: string } | null;
      if (tree) tree.selected = payload.page.id;
      status.textContent = `${payload.page.label} loaded`;
    } catch (error) {
      status.textContent = 'Page unavailable';
      pageEditor.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : error)}</div>`;
    }
  }

  function renderPageEditor(payload: PageSourcePayload): void {
    let source = payload.source;
    let hash = payload.page.hash;
    let dirty = false;
    let saving = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const editable = payload.page.support !== 'code-managed';
    pageEditor.innerHTML = `<div class="page-editor-heading"><div><strong>${esc(payload.page.label)}</strong><span class="badge">${esc(payload.page.route)}</span><span class="badge">${esc(payload.page.format)}</span><span class="badge">${esc(payload.page.support)}</span></div><div class="page-actions"><button type="button" data-page-move>Move / Rename</button><button type="button" class="danger" data-page-delete>Delete Page</button></div></div><div class="structure-block"><div class="pane-heading"><strong>Page Structure</strong><span class="note">${editable ? 'Source-backed inspection' : 'Code managed'}</span></div><div id="structureTree" class="structure-tree"></div></div><label class="source-label" for="pageSource">Source</label><textarea id="pageSource" class="source-editor" spellcheck="false" ${editable ? '' : 'readonly'}>${esc(source)}</textarea><div class="editor-actions"><button type="button" class="primary" data-page-save disabled>Save</button><span id="editorStatus" class="save-status" aria-live="polite">${editable ? 'No changes' : 'Read-only source'}</span></div>`;
    const structure = pageEditor.querySelector('#structureTree')!;
    const structureTree = document.createElement('ui-platform-tree') as HTMLElement & { nodes: PageSourcePayload['structure'] };
    structureTree.nodes = payload.structure;
    structure.append(structureTree);
    const textarea = pageEditor.querySelector<HTMLTextAreaElement>('#pageSource')!;
    const saveButton = pageEditor.querySelector<HTMLButtonElement>('[data-page-save]')!;
    const editorStatus = pageEditor.querySelector<HTMLElement>('#editorStatus')!;

    const updateState = (message: string) => {
      saveButton.disabled = !dirty || saving;
      editorStatus.textContent = message;
      status.textContent = message;
    };
    const save = async () => {
      if (!dirty || saving) return;
      saving = true;
      updateState('Saving...');
      try {
        const saved = await api<PageSourcePayload>(`/api/apps/${encodeURIComponent(app.key)}/page?source=${encodeURIComponent(payload.page.source)}`, { method: 'PUT', body: JSON.stringify({ source, expectedHash: hash }) });
        hash = saved.page.hash;
        source = saved.source;
        dirty = false;
        saving = false;
        updateState('Saved');
        const structureTreeNext = pageEditor.querySelector('ui-platform-tree') as HTMLElement & { nodes: PageSourcePayload['structure'] } | null;
        if (structureTreeNext) structureTreeNext.nodes = saved.structure;
      } catch (error) {
        saving = false;
        updateState(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    textarea.addEventListener('input', () => {
      source = textarea.value;
      dirty = source !== payload.source;
      updateState(dirty ? 'Unsaved changes' : 'No changes');
      if (timer) clearTimeout(timer);
      if (dirty) timer = setTimeout(() => void save(), 3000);
    });
    saveButton.addEventListener('click', () => void save());
    pageEditor.querySelector('[data-page-delete]')?.addEventListener('click', async () => {
      if (!confirm(`Move ${payload.page.source} to the operating system Trash/Recycle Bin?`)) return;
      try {
        await api(`/api/apps/${encodeURIComponent(app.key)}/page?source=${encodeURIComponent(payload.page.source)}`, { method: 'DELETE' });
        await mountBuilder(target, app);
      } catch (error) { updateState(`Delete failed: ${error instanceof Error ? error.message : String(error)}`); }
    });
    pageEditor.querySelector('[data-page-move]')?.addEventListener('click', async () => {
      const destination = prompt('New page source path inside src/pages:', payload.page.source);
      if (!destination || destination === payload.page.source) return;
      try {
        await api(`/api/apps/${encodeURIComponent(app.key)}/pages`, { method: 'POST', body: JSON.stringify({ source: payload.page.source, destination }) });
        pagePayload = await api<PageTreePayload>(`/api/apps/${encodeURIComponent(app.key)}/pages`);
        if (siteTreeComponent) siteTreeComponent.nodes = pagePayload.tree;
        selectedSource = destination.replaceAll('\\', '/').replace(/^\/+/, '');
        await loadPage(selectedSource);
      } catch (error) { updateState(`Move failed: ${error instanceof Error ? error.message : String(error)}`); }
    });
  }
}
