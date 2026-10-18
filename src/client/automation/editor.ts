import { automationActionControls } from './authoring-controls.js';
import type { AutomationAuthoringCatalog } from '../../shared/automation-service-contract.js';
import { automationDiagnostics, triggerPhases, type AutomationBundle, type AutomationDefinition } from '../../shared/automation';
import { EditingLifecycle, editingStatus, protectEditingDraft } from '../artifact-editor/editing-lifecycle.js';
import { specializedTransport, type SourceRequest, type SourceTransportOptions } from '../artifact-editor/specialized-transport.js';
const esc = (v: unknown) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
export async function mountAutomationEditor(target: HTMLElement, options: SourceTransportOptions & { kind?: 'trigger' | 'workflow'; initial?: AutomationBundle; onStateChange?: () => void } = {}) {
  let kind: 'trigger' | 'workflow' = options.kind ?? 'trigger', selected: AutomationBundle | undefined, source = '', conflict = false, busy = false, polling = false, invalidActions = false, active = !options.initial;
  let catalog: AutomationAuthoringCatalog | undefined; let applications: Array<{ key: string; name: string; appId: string }> = [];
  type Draft = { source: string; invalidActions?: string };
  const copies = new Map<string, { bundle: AutomationBundle; lifecycle: EditingLifecycle<Draft>; saveRequest?: SourceRequest }>();
  let copy: ReturnType<typeof copies.get>;
  const transport = await specializedTransport(options, () => { for (const record of copies.values()) record.lifecycle.suspend(); target.hidden = true; });
  const request = transport.request;
  target.innerHTML = `<section class="stack" aria-label="Trigger and Workflow management"><h2>Triggers and Workflows</h2>
    <p>Platform definitions. Actions run in the order shown.</p><div><select aria-label="Automation type"><option value="trigger">Triggers</option><option value="workflow">Workflows</option></select>
    <label>Creation Application<select data-create-app aria-label="Creation Application"></select></label><button data-catalog>Load protected authoring catalog</button><label>Creation Dataset<select data-create-dataset aria-label="Creation Dataset"></select></label><button data-create>Create</button><button data-list>Refresh list</button><select data-listing aria-label="Automation artifact"></select></div>
    <p data-status role="status"></p><div data-work hidden><div><button data-undo>Undo</button><button data-redo>Redo</button><button data-save>Save Now</button><button data-reload>Reload / discard local edits</button><button data-recover>Download local copy</button><button data-delete>Delete</button></div>
    <div data-properties></div><h3>Ordered actions</h3><div data-action-list></div><details><summary>Advanced source repair</summary><label>Action configuration (source)<textarea data-actions aria-label="Ordered automation actions" rows="10"></textarea></label>
    <label>Authoritative JSON source<textarea data-source aria-label="Automation source" rows="20" spellcheck="false"></textarea></label></details><p data-validation></p></div></section>`;
  const find = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
  const status = (text: string) => { find('[data-status]').textContent = text; options.onStateChange?.(); };
  const endpoint = () => `/api/automation/${kind}s`;
  const url = () => endpoint() + `?locator=${encodeURIComponent(selected!.locator)}`;
  const run = (action: () => Promise<void>) => {
    if (busy || options.initial && !active) return;
    const controls = ['[aria-label="Automation type"]', '[data-create]', '[data-listing]', '[data-save]'].map(s => find<HTMLButtonElement | HTMLSelectElement>(s));
    busy = true; controls.forEach(c => { c.disabled = true; });
    void action().catch(e => status(String(e.message ?? e))).finally(() => { busy = false; controls.forEach(c => { c.disabled = false; }); find<HTMLButtonElement>('[data-save]').disabled = conflict; options.onStateChange?.(); });
  };
  function changed(group?: string) {
    const draft = { source, ...(invalidActions ? { invalidActions: find<HTMLTextAreaElement>('[data-actions]').value } : {}) };
    if (copy && JSON.stringify(draft) !== JSON.stringify(copy.lifecycle.current)) { copy.saveRequest = transport.capture(); copy.lifecycle.edit(draft, group); }
    try { find('[data-validation]').textContent = automationDiagnostics(JSON.parse(source)).join(' '); } catch { find('[data-validation]').textContent = 'Invalid JSON. Repair the source before editing properties.'; }
    const lifecycle = copy?.lifecycle; conflict = lifecycle?.state === 'conflict';
    status(lifecycle ? [editingStatus(lifecycle.state, lifecycle.dirty), lifecycle.failure, lifecycle.notice].filter(Boolean).join(' · ') : 'Select an artifact');
    find<HTMLButtonElement>('[data-save]').disabled = busy || conflict;
    find<HTMLButtonElement>('[data-undo]').disabled = !lifecycle?.canUndo; find<HTMLButtonElement>('[data-redo]').disabled = !lifecycle?.canRedo;
  }
  function mutate(change: (definition: AutomationDefinition) => void, group?: string) {
    const definition = JSON.parse(source); change(definition); source = JSON.stringify(definition, null, 2) + '\n';
    invalidActions = false; find<HTMLTextAreaElement>('[data-source]').value = source; find<HTMLTextAreaElement>('[data-actions]').value = JSON.stringify(definition.actions, null, 2); renderActions(definition); changed(group);
  }
  function renderActions(definition: AutomationDefinition) {
    automationActionControls(find('[data-action-list]'), definition, catalog?.appId === definition.appId ? catalog : undefined, mutate);
  }
  async function loadCatalog(appId: string) {
    const app = applications.find(a => a.appId === appId); if (!app) throw new Error('Select a registered Application.');
    const captured = appId;
    const loaded = await request<AutomationAuthoringCatalog>(`/api/apps/${encodeURIComponent(app.key)}/automation-catalog`);
    if (loaded.appId !== captured) throw new Error('Authoring catalog owner changed.');
    catalog = loaded;
    find<HTMLSelectElement>('[data-create-dataset]').innerHTML = loaded.datasets.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');
    if (selected) { const d = JSON.parse(source); if (d.appId === captured) renderActions(d); }
  }

  function open(bundle: AutomationBundle, replace = false) {
    const key = `${kind}:${bundle.locator}`; let record = copies.get(key);
    if (!record) {
      const capturedKind = kind;
      record = { bundle, lifecycle: undefined! as EditingLifecycle<Draft> };
      const original = record;
      original.lifecycle = new EditingLifecycle<Draft>({ source: bundle.source }, async candidate => {
        if (candidate.invalidActions !== undefined) throw Object.assign(new Error('Repair actions JSON before saving.'), { status: 422 });
        let errors: string[]; try { errors = automationDiagnostics(JSON.parse(candidate.source)); } catch { errors = ['Invalid JSON.']; }
        if (errors.length) throw Object.assign(new Error(errors.join(' ')), { status: 422 });
        if (!original.saveRequest) throw new Error('Original editing authority is required.');
        const saved = await original.saveRequest<AutomationBundle>(`/api/automation/${capturedKind}s?locator=${encodeURIComponent(original.bundle.locator)}`, { method: 'PUT', body: JSON.stringify({ mode: 'normal', source: candidate.source, expectedHash: original.bundle.hash }) });
        original.bundle = saved; return { source: saved.source };
      });
      original.lifecycle.subscribe(() => {
        if (copy !== original) { options.onStateChange?.(); return; }
        source = original.lifecycle.current.source; selected = original.bundle; invalidActions = original.lifecycle.current.invalidActions !== undefined;
        find<HTMLTextAreaElement>('[data-source]').value = source;
        if (invalidActions) find<HTMLTextAreaElement>('[data-actions]').value = original.lifecycle.current.invalidActions!;
        changed();
      });
      copies.set(key, original);
    } else if (!record.lifecycle.inFlight) {
      if (replace || record.bundle.hash !== bundle.hash && !record.lifecycle.dirty) { record.bundle = bundle; record.lifecycle.reset({ source: bundle.source }); }
      else if (record.bundle.hash !== bundle.hash) record.lifecycle.conflict();
    }
    copy = record; selected = record.bundle; source = record.lifecycle.current.source; conflict = record.lifecycle.state === 'conflict'; invalidActions = record.lifecycle.current.invalidActions !== undefined; find('[data-work]').hidden = false;
    find<HTMLTextAreaElement>('[data-source]').value = source;
    let d: AutomationDefinition | undefined; try { d = JSON.parse(source); } catch { /* Retained raw invalid source. */ }
    find('[data-properties]').innerHTML = d ? `<p>Permanent ID: ${esc(d.id)} · Application: ${esc(d.appId)} · Dataset: ${esc(d.datasetId)} · Applied primary key: ${esc(d.primaryKey)}</p><button data-load-selected>Load protected action targets</button>${['name', 'displayName'].map(key => `<label>${esc(key)}<input data-property="${key}" value="${esc(d[key as keyof AutomationDefinition])}"></label>`).join('')}
      <label><input type="checkbox" data-enabled ${d.enabled ? 'checked' : ''}> Enabled</label>${kind === 'trigger' ? `<label>Phase<select data-phase>${triggerPhases.map(p => `<option ${p === d.phase ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label>Priority<input type="number" data-priority value="${d.priority ?? 0}"></label>` : ''}` : '';
    find<HTMLTextAreaElement>('[data-actions]').value = JSON.stringify(d?.actions ?? [], null, 2);
    if (invalidActions) find<HTMLTextAreaElement>('[data-actions]').value = record.lifecycle.current.invalidActions!;
    if (d && Array.isArray(d.actions)) renderActions(d); else find('[data-action-list]').replaceChildren();
    target.querySelectorAll<HTMLInputElement>('[data-property]').forEach(input => input.oninput = () => { try { mutate(d => { (d as unknown as Record<string, unknown>)[input.dataset.property!] = input.value; }, `property:${input.dataset.property}`); } catch (e) { status(String(e)); } });
    find('[data-load-selected]')?.addEventListener('click', () => run(async () => { await loadCatalog(JSON.parse(source).appId); }));
    find<HTMLInputElement>('[data-enabled]')?.addEventListener('change', e => mutate(d => { d.enabled = (e.target as HTMLInputElement).checked; }));
    find<HTMLSelectElement>('[data-phase]')?.addEventListener('change', e => mutate(d => { d.phase = (e.target as HTMLSelectElement).value as AutomationDefinition['phase']; }));
    find<HTMLInputElement>('[data-priority]')?.addEventListener('input', e => mutate(d => { d.priority = Number((e.target as HTMLInputElement).value); })); changed();
  }
  async function list() {
    const bundles = await request<AutomationBundle[]>(endpoint());
    find<HTMLSelectElement>('[data-listing]').innerHTML = '<option value="">Select artifact</option>' + bundles.map(b => `<option value="${esc(b.locator)}">${esc(b.definition?.displayName ?? b.locator)}${b.definition?.enabled === false ? ' (disabled)' : ''}${b.diagnostics.length ? ' (invalid)' : ''}</option>`).join('');
    find<HTMLSelectElement>('[data-listing]').value = selected?.locator ?? '';
  }
  find<HTMLSelectElement>('[aria-label="Automation type"]').onchange = e => run(async () => {
    kind = (e.target as HTMLSelectElement).value as typeof kind; copy = undefined; selected = undefined; find('[data-work]').hidden = true; await list();
  });
  find('[data-create]').onclick = () => run(async () => {
    if (selected && source !== selected.source) throw new Error('Save or reload the current artifact first.');
    const name = prompt(`New ${kind} name (lowercase letters and hyphens)`); if (!name) return;
    const appId = find<HTMLSelectElement>('[data-create-app]').value;
    if (!catalog || catalog.appId !== appId) throw new Error('Load the protected authoring catalog first.');
    const target = catalog.datasets.find(d => d.id === find<HTMLSelectElement>('[data-create-dataset]').value);
    if (!target) throw new Error('An applied connected Dataset is required.');
    const datasetId = target.id, dataset = target.physical;
    open(await request<AutomationBundle>(endpoint(), { method: 'POST', body: JSON.stringify({ name, definition: { displayName: name, appId, datasetId, primaryKey: target.primaryKey, enabled: false, actions: [], ...(kind === 'trigger' ? { dataset, phase: 'beforeInsert', priority: 0 } : {}) } }) })); await list();
  });
  find('[data-list]').onclick = () => run(list);
  find('[data-catalog]').onclick = () => run(async () => { await loadCatalog(find<HTMLSelectElement>('[data-create-app]').value); });
  find<HTMLSelectElement>('[data-listing]').onchange = e => run(async () => {
    const locator = (e.target as HTMLSelectElement).value; if (!locator) return;
    open(await request<AutomationBundle>(endpoint() + `?locator=${encodeURIComponent(locator)}`));
  });
  find<HTMLTextAreaElement>('[data-source]').oninput = e => { source = (e.target as HTMLTextAreaElement).value; changed('source'); };
  find<HTMLTextAreaElement>('[data-actions]').oninput = e => { try { const actions = JSON.parse((e.target as HTMLTextAreaElement).value); invalidActions = false; mutate(d => { d.actions = actions; }, 'actions'); } catch { invalidActions = true; changed('actions'); } };
  find('[data-save]').onclick = () => run(async () => { if (!copy) return; copy.saveRequest = transport.capture(); await copy.lifecycle.flush(); });
  for (const action of ['undo', 'redo'] as const) find(`[data-${action}]`).onclick = () => { if (!copy || !active) return; copy.saveRequest = transport.capture(); copy.lifecycle[action](); open(copy.bundle); };
  find('[data-reload]').onclick = () => run(async () => { if (copy?.lifecycle.inFlight) return; if (selected && (!copy?.lifecycle.dirty || confirm('Discard local edits and reload disk source?'))) open(await request<AutomationBundle>(url()), true); });
  find('[data-delete]').onclick = () => run(async () => {
    if (!selected || !copy || copy.lifecycle.inFlight || !confirm('Delete this source artifact and discard its local history?')) return;
    const original = copy, identity = `${kind}:${selected.locator}`;
    original.lifecycle.suspend();
    try { await request(url(), { method: 'DELETE', body: JSON.stringify({ expectedHash: selected.hash }) }); }
    catch (error) { original.lifecycle.resume(); throw error; }
    await original.lifecycle.dispose(); copies.delete(identity); copy = undefined; selected = undefined; find('[data-work]').hidden = true; await list();
  });
  find('[data-recover]').onclick = () => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([invalidActions ? JSON.stringify(copy?.lifecycle.current) : source], { type: 'application/json' })); link.download = `${kind}-recovery.json`; link.click(); URL.revokeObjectURL(link.href); };
  const timer = setInterval(() => {
    if (options.initial && !active) return;
    if (!target.isConnected) return;
    if (!selected || busy || polling || copy?.lifecycle.inFlight) return;
    const observed = selected; polling = true;
    void request<AutomationBundle>(url()).then(remote => {
      if (busy || selected !== observed || options.initial && !active) return;
      if (remote.hash !== observed.hash) { if (!copy?.lifecycle.dirty) open(remote); else { copy.lifecycle.conflict(); changed(); } }
    }).catch(error => status(String(error.message ?? error))).finally(() => { polling = false; });
  }, 1500);
  const unprotect = protectEditingDraft(() => [...copies.values()].some(record => record.lifecycle.dirty || record.lifecycle.state === 'conflict'));
  try {
    try { applications = await request('/api/apps'); } catch { /* Source editing remains available when an Application catalog is unavailable. */ }
    find<HTMLSelectElement>('[data-create-app]').innerHTML = applications.map(a => `<option value="${esc(a.appId)}">${esc(a.name)}</option>`).join('');
    if (options.initial) { open(options.initial); find('[data-listing]').parentElement!.hidden = true; }
    else await list();
  } catch (error) { clearInterval(timer); unprotect(); transport.dispose(); throw error; }
  return Object.assign(async () => { active = false; clearInterval(timer); unprotect(); transport.dispose(); await Promise.all([...copies.values()].map(record => record.lifecycle.dispose())); target.replaceChildren(); }, {
    state: () => ({ dirty: [...copies.values()].some(record => record.lifecycle.dirty), pending: busy || !!copy?.lifecycle.inFlight, conflict }),
    deactivate() { active = false; },
    suspend() { for (const record of copies.values()) record.lifecycle.suspend(); target.hidden = true; },
    focus(remote: AutomationBundle, step?: string) {
      if (remote.hash !== selected?.hash && !copy?.lifecycle.inFlight) { if (copy?.lifecycle.dirty) { copy.lifecycle.conflict(); changed(); } else open(remote); }
      active = true; target.hidden = false; copy?.lifecycle.resume();
      if (step) [...target.querySelectorAll<HTMLElement>('[data-action-index]')].find(row => row.textContent?.includes(step))?.scrollIntoView();
    },
  });
}
