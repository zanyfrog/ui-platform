import type { DiscoveredApp } from '../../shared/types.js';
import { EditingLifecycle, editingStatus, protectEditingDraft } from './editing-lifecycle.js';
import { specializedTransport, type SourceRequest } from './specialized-transport.js';

const sessions = new Map<string, { lifecycle: EditingLifecycle<Record<string, unknown>>; hash: string; saveRequest?: SourceRequest; transport: Awaited<ReturnType<typeof specializedTransport>>; views: Set<HTMLElement> }>();
let protectedWindow = false;
export async function settingsSession(app: DiscoveredApp, form: HTMLFormElement, read: () => Record<string, unknown>, apply: (value: Record<string, unknown>) => void) {
  let subject = 'local';
  if (import.meta.env.DEV) subject = (await import('./session.js')).editorSessionSnapshot()?.principal?.subjectId ?? 'local';
  const identity = `${subject}:${app.appId}:settings`;
  let record = sessions.get(identity);
  const transport = record && !record.lifecycle.suspended ? record.transport : await specializedTransport({ applicationId: app.appId }, () => { record?.lifecycle.suspend(); for (const view of record?.views ?? []) view.hidden = true; });
  if (record && record.transport !== transport) { record.transport.dispose(); record.transport = transport; }
  if (!record) {
    record = { lifecycle: undefined! as EditingLifecycle<Record<string, unknown>>, hash: app.settingsRevision!, transport, views: new Set() }; const original = record;
    original.lifecycle = new EditingLifecycle(app.settings, async settings => {
      if (!original.saveRequest) throw new Error('Original settings editing authority is required.');
      const saved = await original.saveRequest<DiscoveredApp>(`/api/apps/${encodeURIComponent(app.key)}/settings`, { method: 'PUT', body: JSON.stringify({ mode: 'normal', settings, expectedHash: original.hash }) });
      original.hash = saved.settingsRevision!; return saved.settings;
    }); sessions.set(identity, original);
  } else if (record.hash !== app.settingsRevision) {
    if (record.lifecycle.dirty) record.lifecycle.conflict(); else { record.hash = app.settingsRevision!; record.lifecycle.reset(app.settings); }
  }
  const original = record;
  original.views.add(form); form.hidden = false;
  if (!protectedWindow) { protectedWindow = true; protectEditingDraft(() => [...sessions.values()].some(item => item.lifecycle.dirty || item.lifecycle.state === 'conflict')); }
  const bar = document.createElement('div'); bar.className = 'editor-actions'; const status = document.createElement('span'); status.setAttribute('role', 'status');
  const buttons = (['undo', 'redo', 'save'] as const).map(action => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = action === 'save' ? 'Save Now' : action === 'undo' ? 'Undo' : 'Redo';
    button.onclick = () => { original.saveRequest = transport.capture(); if (action === 'save') { original.lifecycle.resume(); void original.lifecycle.flush(); } else original.lifecycle[action](); }; bar.append(button); return button;
  });
  const reload = document.createElement('button'); reload.type = 'button'; reload.textContent = 'Reload source';
  reload.onclick = async () => {
    if (original.lifecycle.inFlight || original.lifecycle.dirty && !confirm('Discard local settings changes and reload authoritative source?')) return;
    try {
    const saved = await transport.request<DiscoveredApp>(`/api/apps/${encodeURIComponent(app.key)}`);
    if (saved.appId !== app.appId) throw new Error('Original settings owner is required.');
    original.hash = saved.settingsRevision!; original.lifecycle.reset(saved.settings); original.lifecycle.resume();
    } catch (error) { status.textContent = `Reload failed: ${error instanceof Error ? error.message : String(error)}`; }
  };
  const recovery = document.createElement('button'); recovery.type = 'button'; recovery.textContent = 'Download recovery'; recovery.onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(original.lifecycle.current, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'settings-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  bar.append(reload, recovery, status); form.prepend(bar);
  const show = () => { if (!form.isConnected) return; apply(original.lifecycle.current); const state = original.lifecycle; status.textContent = [editingStatus(state.state, state.dirty), state.failure, state.notice].filter(Boolean).join(' · '); buttons[0].disabled = !state.canUndo; buttons[1].disabled = !state.canRedo; buttons[2].disabled = state.state === 'conflict'; };
  const detach = original.lifecycle.subscribe(show); show();
  const change = (event: Event) => { if (original.lifecycle.suspended) return; original.saveRequest = transport.capture(); original.lifecycle.edit(read(), (event.target as HTMLElement).closest<HTMLElement>('[data-setting]')?.dataset.setting); };
  form.addEventListener('input', change); form.addEventListener('change', change);
  const observer = new MutationObserver(() => { if (!form.isConnected) { detach(); observer.disconnect(); original.views.delete(form); } }); observer.observe(document.body, { childList: true, subtree: true });
  return { lifecycle: original.lifecycle, async flush() { original.saveRequest = transport.capture(); await original.lifecycle.flush(); return !original.lifecycle.dirty && original.lifecycle.state !== 'conflict' && original.lifecycle.state !== 'error'; } };
}
