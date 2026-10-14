import { automationDiagnostics, triggerPhases, type AutomationBundle, type AutomationDefinition } from '../../shared/automation';
import { createEditorSessionBinding, subscribeEditorSession } from '../artifact-editor/session';
const esc = (v: unknown) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
export async function mountAutomationEditor(target: HTMLElement, options: { kind?: 'trigger' | 'workflow'; initial?: AutomationBundle; request?: <T>(url: string, init?: RequestInit) => Promise<T>; onStateChange?: () => void } = {}) {
  let kind: 'trigger' | 'workflow' = options.kind ?? 'trigger', selected: AutomationBundle | undefined, source = '', conflict = false, busy = false, polling = false, invalidActions = false, active = !options.initial;
  const binding = createEditorSessionBinding();
  target.innerHTML = `<section class="stack" aria-label="Trigger and Workflow management"><h2>Triggers and Workflows</h2>
    <p>Platform definitions. Actions run in the order shown.</p><div><select aria-label="Automation type"><option value="trigger">Triggers</option><option value="workflow">Workflows</option></select>
    <button data-create>Create</button><button data-list>Refresh list</button><select data-listing aria-label="Automation artifact"></select></div>
    <p data-status role="status"></p><div data-work hidden><div><button data-save>Save</button><button data-reload>Reload / discard local edits</button><button data-recover>Download local copy</button><button data-delete>Delete</button></div>
    <div data-properties></div><h3>Ordered actions</h3><div data-action-list></div><button data-add-action>Add service action</button><label>Action configuration (source)<textarea data-actions aria-label="Ordered automation actions" rows="10"></textarea></label>
    <label>Authoritative JSON source<textarea data-source aria-label="Automation source" rows="20" spellcheck="false"></textarea></label><p data-validation></p></div></section>`;
  const find = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
  const status = (text: string) => { find('[data-status]').textContent = text; options.onStateChange?.(); };
  const endpoint = () => `/api/automation/${kind}s`;
  const url = () => endpoint() + `?locator=${encodeURIComponent(selected!.locator)}`;
  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    if (options.request) return options.request<T>(url, init);
    const headers = await binding.headers(); binding.assert();
    const response = await fetch(url, { ...init, headers: { ...headers, 'content-type': 'application/json' } });
    const result = await response.json(); binding.assert();
    if (!response.ok) { if (response.status === 401 || response.status === 403) find('[data-work]').hidden = true; throw new Error(result.error ?? result.code ?? 'Request failed.'); } return result;
  }
  const run = (action: () => Promise<void>) => { if (busy || options.initial && !active) return; busy = true; void action().catch(e => status(String(e.message ?? e))).finally(() => { busy = false; options.onStateChange?.(); }); };
  function changed() {
    try { find('[data-validation]').textContent = automationDiagnostics(JSON.parse(source)).join(' '); } catch { find('[data-validation]').textContent = 'Invalid JSON. Repair the source before editing properties.'; }
    status(conflict ? 'Source changed on disk. Local edits preserved; download or reload before saving.' : source !== selected?.source ? 'Unsaved changes' : 'Saved source');
    find<HTMLButtonElement>('[data-save]').disabled = conflict;
  }
  function mutate(change: (definition: AutomationDefinition) => void) {
    const definition = JSON.parse(source); change(definition); source = JSON.stringify(definition, null, 2) + '\n';
    find<HTMLTextAreaElement>('[data-source]').value = source; find<HTMLTextAreaElement>('[data-actions]').value = JSON.stringify(definition.actions, null, 2); renderActions(definition); changed();
  }
  function renderActions(definition: AutomationDefinition) {
    find('[data-action-list]').innerHTML = definition.actions.map((action, index) => `<div data-action-index="${index}"><strong>${index + 1}. ${esc(action.id)} · ${esc(action.type)}</strong>${kind === 'trigger' ? `<label>Scope<select data-scope><option value="each" ${action.scope !== 'batch' ? 'selected' : ''}>Each record</option><option value="batch" ${action.scope === 'batch' ? 'selected' : ''}>Entire batch</option></select></label>` : ''}<button data-up ${index === 0 ? 'disabled' : ''}>Move up</button><button data-down ${index === definition.actions.length - 1 ? 'disabled' : ''}>Move down</button><button data-remove>Remove action</button></div>`).join('');
    target.querySelectorAll<HTMLElement>('[data-action-index]').forEach(row => {
      const index = Number(row.dataset.actionIndex);
      row.querySelector<HTMLSelectElement>('[data-scope]')?.addEventListener('change', e => mutate(d => { d.actions[index].scope = (e.target as HTMLSelectElement).value as 'each' | 'batch'; }));
      row.querySelector<HTMLButtonElement>('[data-up]')!.onclick = () => mutate(d => { [d.actions[index - 1], d.actions[index]] = [d.actions[index], d.actions[index - 1]]; });
      row.querySelector<HTMLButtonElement>('[data-down]')!.onclick = () => mutate(d => { [d.actions[index + 1], d.actions[index]] = [d.actions[index], d.actions[index + 1]]; });
      row.querySelector<HTMLButtonElement>('[data-remove]')!.onclick = () => mutate(d => { d.actions.splice(index, 1); });
    });
  }
  function open(bundle: AutomationBundle) {
    selected = bundle; source = bundle.source; conflict = false; invalidActions = false; find('[data-work]').hidden = false;
    find<HTMLTextAreaElement>('[data-source]').value = source;
    const d = bundle.definition;
    find('[data-properties]').innerHTML = d ? `<p>Permanent ID: ${esc(d.id)}</p>${['name', 'displayName', 'appId', 'datasetId', 'primaryKey', ...(kind === 'trigger' ? ['dataset'] : [])].map(key => `<label>${esc(key)}<input data-property="${key}" value="${esc(d[key as keyof AutomationDefinition])}"></label>`).join('')}
      <label><input type="checkbox" data-enabled ${d.enabled ? 'checked' : ''}> Enabled</label>${kind === 'trigger' ? `<label>Phase<select data-phase>${triggerPhases.map(p => `<option ${p === d.phase ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label>Priority<input type="number" data-priority value="${d.priority ?? 0}"></label>` : ''}` : '';
    find<HTMLTextAreaElement>('[data-actions]').value = JSON.stringify(d?.actions ?? [], null, 2);
    if (d && Array.isArray(d.actions)) renderActions(d); else find('[data-action-list]').replaceChildren();
    target.querySelectorAll<HTMLInputElement>('[data-property]').forEach(input => input.oninput = () => { try { mutate(d => { (d as unknown as Record<string, unknown>)[input.dataset.property!] = input.value; }); } catch (e) { status(String(e)); } });
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
    if (selected && source !== selected.source && !confirm('Discard local edits?')) { (e.target as HTMLSelectElement).value = kind; return; }
    kind = (e.target as HTMLSelectElement).value as typeof kind; selected = undefined; find('[data-work]').hidden = true; await list();
  });
  find('[data-create]').onclick = () => run(async () => {
    if (selected && source !== selected.source) throw new Error('Save or reload the current artifact first.');
    const name = prompt(`New ${kind} name (lowercase letters and hyphens)`); if (!name) return;
    const appId = prompt('Application identity'), datasetId = prompt('Permanent Dataset identity'); if (!appId || !datasetId) return;
    const dataset = kind === 'trigger' ? prompt('Dataset physical key') : undefined; if (kind === 'trigger' && !dataset) return;
    open(await request<AutomationBundle>(endpoint(), { method: 'POST', body: JSON.stringify({ name, definition: { displayName: name, appId, datasetId, primaryKey: 'id', enabled: false, actions: [], ...(kind === 'trigger' ? { dataset, phase: 'beforeInsert', priority: 0 } : {}) } }) })); await list();
  });
  find('[data-list]').onclick = () => run(list);
  find('[data-add-action]').onclick = () => { try { mutate(d => { d.actions.push({ id: `action-${crypto.randomUUID()}`, type: 'service', service: 'reference.notification', input: { literal: null }, ...(kind === 'trigger' ? { scope: 'each' as const } : {}) }); }); } catch (error) { status(String(error)); } };
  find<HTMLSelectElement>('[data-listing]').onchange = e => run(async () => {
    const locator = (e.target as HTMLSelectElement).value; if (!locator) return;
    if (selected && source !== selected.source && !confirm('Discard local edits?')) { (e.target as HTMLSelectElement).value = selected.locator; return; }
    open(await request<AutomationBundle>(endpoint() + `?locator=${encodeURIComponent(locator)}`));
  });
  find<HTMLTextAreaElement>('[data-source]').oninput = e => { source = (e.target as HTMLTextAreaElement).value; changed(); };
  find<HTMLTextAreaElement>('[data-actions]').oninput = e => { try { const actions = JSON.parse((e.target as HTMLTextAreaElement).value); invalidActions = false; mutate(d => { d.actions = actions; }); } catch { invalidActions = true; status('Repair actions JSON before saving.'); } };
  find('[data-save]').onclick = () => run(async () => { if (!selected || conflict || invalidActions) return; open(await request<AutomationBundle>(url(), { method: 'PUT', body: JSON.stringify({ source, expectedHash: selected.hash }) })); await list(); });
  find('[data-reload]').onclick = () => run(async () => { if (selected && (source === selected.source || confirm('Discard local edits and reload disk source?'))) open(await request<AutomationBundle>(url())); });
  find('[data-delete]').onclick = () => run(async () => { if (!selected || !confirm('Delete this source artifact?')) return; await request(url(), { method: 'DELETE', body: JSON.stringify({ expectedHash: selected.hash }) }); selected = undefined; find('[data-work]').hidden = true; await list(); });
  find('[data-recover]').onclick = () => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([source], { type: 'application/json' })); link.download = `${kind}-recovery.json`; link.click(); URL.revokeObjectURL(link.href); };
  const timer = setInterval(() => {
    if (options.initial && !active) return;
    if (!options.initial && !target.isConnected) { clearInterval(timer); return; }
    if (!selected || busy || polling) return;
    const observed = selected; polling = true;
    void request<AutomationBundle>(url()).then(remote => {
      if (busy || selected !== observed || options.initial && !active) return;
      if (remote.hash !== observed.hash) { if (source === observed.source && !invalidActions) open(remote); else { conflict = true; changed(); } }
    }).catch(error => status(String(error.message ?? error))).finally(() => { polling = false; });
  }, 1500);
  const unsubscribe = options.request ? () => {} : subscribeEditorSession(() => { binding.revoke(); find('[data-work]').hidden = true; status('Identity changed. Local copy retained for recovery; reopen this editor under the current identity.'); });
  try {
    if (options.initial) { open(options.initial); find('[data-listing]').parentElement!.hidden = true; }
    else await list();
  } catch (error) { clearInterval(timer); unsubscribe(); throw error; }
  return Object.assign(() => { active = false; clearInterval(timer); unsubscribe(); target.replaceChildren(); }, {
    state: () => ({ dirty: invalidActions || source !== selected?.source, pending: busy, conflict }),
    deactivate() { active = false; },
    focus(remote: AutomationBundle, step?: string) {
      if (remote.hash !== selected?.hash) { if (source !== selected?.source || invalidActions) { conflict = true; changed(); } else open(remote); }
      active = true;
      if (step) [...target.querySelectorAll<HTMLElement>('[data-action-index]')].find(row => row.textContent?.includes(step))?.scrollIntoView();
    },
  });
}
