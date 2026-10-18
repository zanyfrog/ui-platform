import type { ApplicationMenu, CompositionDefinition, MenuItem } from '@ui-platform/visual-artifacts';
import type { TemplateComparison } from '../../server/template-updates.js';
import { EditingLifecycle, editingStatus, protectEditingDraft } from '../artifact-editor/editing-lifecycle.js';
import { specializedTransport, type SourceRequest, type SourceTransportOptions } from '../artifact-editor/specialized-transport.js';
import { chooseMenuItem } from './menu-controls.js';

const esc = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
async function api<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json' } }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Request failed.'); return data; }
interface Source { path: string; content: string; hash: string }

export async function mountCompositionManager(target: HTMLElement, appKey: string, options: SourceTransportOptions & { definition?: CompositionDefinition; source?: Source; onStateChange?: () => void } = {}) {
  const copies = new Map<string, { source: Source; lifecycle: EditingLifecycle<string>; saveRequest?: SourceRequest }>();
  let copy: ReturnType<typeof copies.get>, active = !options.source, disposed = false;
  const transport = await specializedTransport(options, () => { for (const record of copies.values()) record.lifecycle.suspend(); target.hidden = true; });
  const request = transport.request;
  let busy = false;
  const base = `/api/apps/${encodeURIComponent(appKey)}`;
  let definition = options.definition ?? await request<CompositionDefinition | null>(`${base}/composition`);
  if (!definition) { transport.dispose(); target.remove(); return; }
  let source: Source | undefined, update: TemplateComparison | undefined;
  let choices = await request<{ assets: string[]; styles: string[] }>(`${base}/composition-asset?list=1`);
  target.innerHTML = `<div class="stack"><strong>Application Composition</strong><p data-status aria-live="polite"></p>
    <label>Application source<select data-files><option value="app.settings.json">Branding, theme and default Shell</option>${definition.menus.map(menu => `<option value="${esc(menu.sourcePath)}">${esc(menu.name)}</option>`).join('')}${definition.settings.siteStyles.map(file => `<option>${esc(file)}</option>`).join('')}</select></label>
    <div data-settings></div><div data-menu></div><details><summary>Advanced native source</summary><label>Source<textarea data-source class="source-editor" spellcheck="false"></textarea></label></details>
    <div class="editor-actions"><button data-undo>Undo</button><button data-redo>Redo</button><button data-save>Save Now</button><button data-reload>Reload source</button><button data-recover>Download recovery</button><button data-new-menu>Create Menu</button><button data-template>Update from Application Template</button></div>
    <label>Application asset<input type="file" data-asset></label><label>Asset source path<input data-asset-path value="assets/images/image.png"></label><button data-upload-asset>Upload Application asset</button><p data-asset-status></p>
    <p class="note">Saved source appears in development preview. Use the existing Presentation Publish action to update published presentation.</p><div data-update></div></div>`;
  const find = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
  const status = (message: string) => { find('[data-status]').textContent = message; options.onStateChange?.(); };
  const safe = (run: () => void | Promise<void>) => async () => { if (busy || !active || disposed) return; busy = true; target.inert = true;
    const fields = [...target.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea')].map(field => ({ field, disabled: field.disabled }));
    for (const { field } of fields) field.disabled = true;
    try { await run(); } catch (error) { status(String(error)); } finally { busy = false; target.inert = false; for (const { field, disabled } of fields) field.disabled = disabled; options.onStateChange?.(); } };
  const text = () => find<HTMLTextAreaElement>('[data-source]').value;
  const dirty = () => !!copy?.lifecycle.dirty;
  function paintState() {
    const lifecycle = copy?.lifecycle;
    status(lifecycle ? [editingStatus(lifecycle.state, lifecycle.dirty), lifecycle.failure, lifecycle.notice].filter(Boolean).join(' · ') : 'Select source');
    find<HTMLButtonElement>('[data-undo]').disabled = !lifecycle?.canUndo; find<HTMLButtonElement>('[data-redo]').disabled = !lifecycle?.canRedo;
    find<HTMLButtonElement>('[data-save]').disabled = lifecycle?.state === 'conflict';
  }
  function changed(group?: string) { if (copy && text() !== copy.lifecycle.current) { copy.saveRequest = transport.capture(); copy.lifecycle.edit(text(), group); } paintState(); }
  function openSource(next: Source, replace = false) {
    let record = copies.get(next.path);
    if (!record) {
      record = { source: next, lifecycle: undefined! as EditingLifecycle<string> }; const original = record;
      original.lifecycle = new EditingLifecycle(next.content, async content => {
        if (!original.saveRequest) throw new Error('Original editing authority is required.');
        const saved = await original.saveRequest<Source>(`${base}/composition-source?path=${encodeURIComponent(original.source.path)}`, { method: 'PUT', body: JSON.stringify({ mode: 'normal', content, expectedHash: original.source.hash }) });
        original.source = saved; return saved.content;
      });
      original.lifecycle.subscribe(() => {
        if (copy !== original) { options.onStateChange?.(); return; }
        source = original.source;
        if (text() !== original.lifecycle.current) { find<HTMLTextAreaElement>('[data-source]').value = original.lifecycle.current; try { renderFields(); } catch { /* Retain invalid source. */ } }
        paintState();
      }); copies.set(next.path, record);
    } else if (!record.lifecycle.inFlight) {
      if (replace || next.hash !== record.source.hash && !record.lifecycle.dirty) { record.source = next; record.lifecycle.reset(next.content); }
      else if (next.hash !== record.source.hash) record.lifecycle.conflict();
    }
    copy = record; source = record.source; find<HTMLTextAreaElement>('[data-source]').value = record.lifecycle.current;
    find<HTMLSelectElement>('[data-files]').value = source.path;
    try { renderFields(); } catch { /* Retain invalid source. */ } paintState();
  }
  find('[data-asset]').addEventListener('change', () => { const file = find<HTMLInputElement>('[data-asset]').files?.[0]; if (file) find<HTMLInputElement>('[data-asset-path]').value = 'assets/images/' + file.name.toLowerCase().replace(/[^a-z0-9.\-]/g, '-'); });
  find('[data-upload-asset]').addEventListener('click', safe(async () => {
    const asset = find<HTMLInputElement>('[data-asset]').files?.[0]; if (!asset) throw new Error('Choose an asset file.');
    const path = find<HTMLInputElement>('[data-asset-path]').value;
    const info = await request<{ hash: string | null }>(`${base}/composition-asset?info=1&path=${encodeURIComponent(path)}`);
    if (info.hash && !confirm(`Replace the existing Application asset at ${path}?`)) return;
    const data = new FormData(); data.set('asset', asset); data.set('path', path); data.set('expectedHash', info.hash ?? '');
    await request(`${base}/composition-asset`, { method: 'POST', body: data });
    find('[data-asset-status]').textContent = `Saved ${path}. Use this source path in branding or component settings.`; document.dispatchEvent(new Event('ui-platform-workspace-change'));
  }));
  function menu(): ApplicationMenu { return JSON.parse(text()); }
  async function chooseItem(existing?: MenuItem): Promise<MenuItem | undefined> {
    const latest = await request<CompositionDefinition | null>(`${base}/composition`);
    if (!active || disposed) return;
    if (!latest) throw new Error('Application composition is unavailable. Refresh and repair its source before selecting a destination.');
    definition = latest; return chooseMenuItem(latest, existing);
  }
  function modifyMenu(work: (menu: ApplicationMenu) => void) { const value = menu(); work(value); find<HTMLTextAreaElement>('[data-source]').value = JSON.stringify(value, null, 2) + '\n'; renderFields(); changed(); }
  function renderFields(): void {
    find('[data-settings]').replaceChildren(); find('[data-menu]').replaceChildren();
    if (source?.path === 'app.settings.json') {
      const config = JSON.parse(text());
      const field = (name: string, value: string, change: (value: string) => void) => {
        const label = document.createElement('label'); label.textContent = name; const input = document.createElement('input'); input.value = value; input.setAttribute('aria-label', name);
        input.addEventListener('input', safe(() => { change(input.value); find<HTMLTextAreaElement>('[data-source]').value = JSON.stringify(config, null, 2) + '\n'; changed(`setting:${name}`); })); label.append(input); find('[data-settings]').append(label);
      };
      const label = document.createElement('label'); label.textContent = 'Default Shell for new Pages'; const select = document.createElement('select');
      select.innerHTML = definition!.shells.map(shell => `<option value="${esc(shell.metadata.artifactId)}">${esc(shell.metadata.displayName)}</option>`).join(''); select.value = config.presentation.defaultShellId;
      select.addEventListener('change', safe(() => { config.presentation.defaultShellId = select.value; find<HTMLTextAreaElement>('[data-source]').value = JSON.stringify(config, null, 2) + '\n'; changed(); })); label.append(select); find('[data-settings]').append(label);
      for (const key of ['applicationName', 'shortName', 'primaryLogo', 'secondaryLogo', 'favicon']) field(key, config.presentation.branding[key] ?? '', value => { config.presentation.branding[key] = value; });
      for (const key of ['primaryLogo', 'secondaryLogo', 'favicon']) {
        const input = [...find('[data-settings]').querySelectorAll('label')].find(label => label.firstChild?.textContent === key)!.querySelector('input')!;
        const select = document.createElement('select'); select.setAttribute('aria-label', `Select ${key} asset`); select.add(new Option('No asset', ''));
        const images = choices.assets.filter(path => /\.(svg|png|jpg|jpeg|webp|ico)$/.test(path));
        for (const path of new Set([...images, ...(input.value ? [input.value] : [])])) select.add(new Option(path + (images.includes(path) ? '' : ' (missing or unsupported image)'), path));
        select.value = input.value; select.onchange = () => { input.value = select.value; input.dispatchEvent(new Event('input')); }; input.parentElement!.append(select);
      }
      const refresh = document.createElement('button'); refresh.textContent = 'Refresh asset and theme choices'; refresh.onclick = safe(async () => { choices = await request(`${base}/composition-asset?list=1`); renderFields(); }); find('[data-settings]').append(refresh);
      const styleLabel = document.createElement('label'); styleLabel.append('Theme stylesheets'); const styles = document.createElement('select'); styles.multiple = true; styles.setAttribute('aria-label', 'Theme stylesheets');
      for (const path of new Set([...choices.styles, ...config.presentation.siteStyles])) { const option = new Option(path, path); option.selected = config.presentation.siteStyles.includes(path); styles.add(option); }
      styles.onchange = safe(() => { config.presentation.siteStyles = [...styles.selectedOptions].map(option => option.value); find<HTMLTextAreaElement>('[data-source]').value = JSON.stringify(config, null, 2) + '\n'; changed('theme-styles'); }); styleLabel.append(styles); find('[data-settings]').append(styleLabel);
      for (const [key, value] of Object.entries(config.presentation.theme)) field(key, String(value), value => { config.presentation.theme[key] = value; });
    } else if (source?.path.startsWith('menus/')) {
      const value = menu();
      const list = document.createElement('div');
      const draw = (items: MenuItem[], parent: HTMLElement) => {
        const ul = document.createElement('ul'); parent.append(ul);
        for (const item of items) {
          const li = document.createElement('li'); li.append(document.createTextNode(`${item.label} (${item.destination.kind}) `)); ul.append(li);
          const button = (label: string, click: () => void) => { const button = document.createElement('button'); button.textContent = label; button.addEventListener('click', safe(click)); li.append(button); };
          const locate = (menu: ApplicationMenu): MenuItem => { let found: MenuItem | undefined; const walk = (items: MenuItem[]) => { for (const entry of items) { if (entry.itemId === item.itemId) found = entry; walk(entry.children ?? []); } }; walk(menu.items); return found!; };
          button('Edit', async () => { const original = text(), edited = await chooseItem(item); if (edited && active && !disposed) { if (text() !== original) throw new Error('Menu source changed while editing. Reopen the item.'); modifyMenu(menu => { Object.assign(locate(menu), edited); }); } });
          button(item.hidden ? 'Show' : 'Hide', () => modifyMenu(menu => { locate(menu).hidden = !item.hidden; }));
          button(item.disabled ? 'Enable' : 'Disable', () => modifyMenu(menu => { locate(menu).disabled = !item.disabled; }));
          button('Add child', () => addItem(item.itemId));
          const move = (direction: number) => modifyMenu(menu => { const walk = (items: MenuItem[]) => { const index = items.findIndex(entry => entry.itemId === item.itemId); if (index >= 0) { const target = index + direction; if (target >= 0 && target < items.length) [items[index], items[target]] = [items[target], items[index]]; } else items.forEach(entry => walk(entry.children ?? [])); }; walk(menu.items); });
          button('Move up', () => move(-1)); button('Move down', () => move(1));
          button('Remove', () => { if (!confirm('Remove this Menu Item and its children?')) return; modifyMenu(menu => { const remove = (items: MenuItem[]) => { const index = items.findIndex(entry => entry.itemId === item.itemId); if (index >= 0) items.splice(index, 1); else items.forEach(entry => remove(entry.children ?? [])); }; remove(menu.items); }); });
          if (item.children?.length) draw(item.children, li);
        }
      };
      draw(value.items, list); const add = document.createElement('button'); add.textContent = 'Add root item'; add.addEventListener('click', safe(() => addItem())); list.append(add); find('[data-menu]').append(list);
    }
  }
  async function addItem(parentId?: string): Promise<void> {
    const original = text(), item = await chooseItem(); if (!item || !active || disposed) return;
    if (text() !== original) throw new Error('Menu source changed while editing. Reopen the item.');
    modifyMenu(menu => { if (!parentId) menu.items.push(item); else { const walk = (items: MenuItem[]) => { for (const entry of items) { if (entry.itemId === parentId) (entry.children ??= []).push(item); else walk(entry.children ?? []); } }; walk(menu.items); } });
  }
  async function load(replace = false): Promise<void> {
    const file = find<HTMLSelectElement>('[data-files]').value;
    const next = await request<Source>(`${base}/composition-source?path=${encodeURIComponent(file)}`); openSource(next, replace);
  }
  find('[data-files]').addEventListener('change', safe(async () => { await load(); }));
  find('[data-reload]').addEventListener('click', safe(async () => { if (copy?.lifecycle.inFlight) return; if (!dirty() || confirm('Discard editor changes and reload source?')) await load(true); }));
  find('[data-source]').addEventListener('input', () => changed('source'));
  find('[data-save]').addEventListener('click', safe(async () => { if (!copy) return; copy.saveRequest = transport.capture(); await copy.lifecycle.flush(); }));
  for (const action of ['undo', 'redo'] as const) find(`[data-${action}]`).addEventListener('click', safe(() => { if (!copy) return; copy.saveRequest = transport.capture(); copy.lifecycle[action](); try { renderFields(); } catch { /* Retain invalid source. */ } }));
  find('[data-recover]').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([text()], { type: 'text/plain' })); const link = document.createElement('a'); link.href = url; link.download = 'composition-source-recovery.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  find('[data-new-menu]').addEventListener('click', safe(async () => {
    if (dirty()) throw new Error('Save or recover source before creating a Menu.');
    const name = prompt('Menu name:'); if (!name) return; const id = prompt('Stable lowercase Menu ID:', 'menu-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')); if (!id) return;
    const file = `menus/${id.replace(/^menu-/, '')}.json`;
    await request(`${base}/composition-source?path=${encodeURIComponent(file)}`, { method: 'PUT', body: JSON.stringify({ content: JSON.stringify({ schemaVersion: 1, menuId: id, name, items: [] }, null, 2), expectedHash: null }) });
    const option = document.createElement('option'); option.value = file; option.textContent = name; find('[data-files]').append(option); find<HTMLSelectElement>('[data-files]').value = file; await load();
  }));
  find('[data-template]').addEventListener('click', safe(async () => {
    if (dirty()) throw new Error('Save or recover source before updating the Application.');
    update = await request<TemplateComparison>(`${base}/template-update`);
    find('[data-update]').innerHTML = `<p>Template ${esc(update.templateId)} version ${esc(update.version)}. Omitted files and Application-only files are preserved.</p><table><thead><tr><th>File</th><th>Status</th><th>Decision</th></tr></thead><tbody>${update.items.map((item, index) => `<tr><td>${esc(item.path)}</td><td>${esc(item.category)}</td><td>${['new', 'different'].includes(item.category) ? `<select data-decision="${index}" aria-label="Decision for ${esc(item.path)}"><option value="keep">Keep Application Version${item.category === 'new' ? ' / Skip' : ''}</option>${['app.manifest.json', 'ui.app.json'].includes(item.path) ? '' : `<option value="${item.category === 'new' ? 'add' : 'replace'}">${item.category === 'new' ? 'Add / Copy' : 'Replace with Template Version'}</option>`}</select>` : 'Preserve'}</td></tr>`).join('')}</tbody></table><button data-apply>Apply selected decisions</button>`;
    find('[data-apply]').addEventListener('click', safe(async () => {
      const decisions: Record<string, string> = {}; target.querySelectorAll<HTMLSelectElement>('[data-decision]').forEach(select => { decisions[update!.items[Number(select.dataset.decision)].path] = select.value; });
      await request(`${base}/template-update`, { method: 'POST', body: JSON.stringify({ expectedHash: update!.expectedHash, decisions }) }); find('[data-update]').replaceChildren(); await load(); status('Template version processed; selected files updated.');
    }));
  }));
  if (options.source) {
    openSource(options.source);
    find('[data-files]').parentElement!.hidden = true;
    for (const selector of ['[data-new-menu]', '[data-template]', '[data-upload-asset]']) find(selector).hidden = true;
    find('[data-asset]').parentElement!.hidden = true; find('[data-asset-path]').parentElement!.hidden = true;
  } else await load();
  const unprotect = protectEditingDraft(() => [...copies.values()].some(record => record.lifecycle.dirty || record.lifecycle.state === 'conflict'));
  let polling = false;
  const timer = setInterval(() => {
    if (disposed || !active || !target.isConnected || !copy || polling || copy.lifecycle.inFlight) return;
    const observed = copy; polling = true;
    void request<Source>(`${base}/composition-source?path=${encodeURIComponent(observed.source.path)}`).then(remote => { if (copy === observed && active) openSource(remote); }).catch(error => status(String(error))).finally(() => { polling = false; });
  }, 1500);
  return {
    state: () => ({ dirty: [...copies.values()].some(record => record.lifecycle.dirty), pending: busy || !!copy?.lifecycle.inFlight, conflict: copy?.lifecycle.state === 'conflict', error: copy?.lifecycle.failure }),
    deactivate() { active = false; },
    suspend() { for (const record of copies.values()) record.lifecycle.suspend(); target.hidden = true; },
    focus(remote: Source) { openSource(remote); active = true; target.hidden = false; copy?.lifecycle.resume(); },
    async dispose() { disposed = true; active = false; clearInterval(timer); unprotect(); transport.dispose(); await Promise.all([...copies.values()].map(record => record.lifecycle.dispose())); target.replaceChildren(); },
  };
}
