import type { ApplicationPresentation, ApplicationPresentationStatus } from '../../shared/presentation.js';
import { EditingLifecycle, editingStatus, protectEditingDraft } from './editing-lifecycle.js';
import { specializedTransport, type SourceRequest } from './specialized-transport.js';

type Fields = Record<string, string | boolean>;
type Draft = { value: ApplicationPresentation; views: Record<string, Fields>; invalid?: { section: string; message: string } };
const sessions = new Map<string, { lifecycle: EditingLifecycle<Draft>; revision: string; saveRequest?: SourceRequest; views: Set<HTMLElement>; transport: Awaited<ReturnType<typeof specializedTransport>> }>();
let protectedWindow = false;
export async function presentationSession(key: string, applicationId: string, remote: ApplicationPresentationStatus) {
  let subject = 'local';
  if (import.meta.env.DEV) subject = (await import('./session.js')).editorSessionSnapshot()?.principal?.subjectId ?? 'local';
  const identity = `${subject}:${applicationId}:presentation`;
  let record = sessions.get(identity);
  const transport = record && !record.lifecycle.suspended ? record.transport : await specializedTransport({ applicationId }, () => { record?.lifecycle.suspend(); for (const view of record?.views ?? []) view.hidden = true; });
  if (record && record.transport !== transport) { record.transport.dispose(); record.transport = transport; }
  if (!record) {
    record = { lifecycle: undefined! as EditingLifecycle<Draft>, revision: remote.sourceRevision!, views: new Set(), transport };
    const original = record;
    original.lifecycle = new EditingLifecycle<Draft>({ value: remote.draft!, views: {} }, async candidate => {
      if (candidate.invalid) throw Object.assign(new Error(candidate.invalid.message), { status: 422 });
      if (!original.saveRequest) throw new Error('Original presentation editing authority is required.');
      const saved = await original.saveRequest<ApplicationPresentationStatus>(`/api/apps/${encodeURIComponent(key)}/presentation`, { method: 'PUT', body: JSON.stringify({ mode: 'normal', value: candidate.value, expectedRevision: original.revision }) });
      original.revision = saved.sourceRevision!; return { ...candidate, value: saved.draft! };
    }); sessions.set(identity, original);
  } else if (record.revision !== remote.sourceRevision) {
    if (record.lifecycle.dirty) record.lifecycle.conflict();
    else { record.revision = remote.sourceRevision!; record.lifecycle.reset({ value: remote.draft!, views: {} }); }
  }
  if (!protectedWindow) { protectedWindow = true; protectEditingDraft(() => [...sessions.values()].some(item => item.lifecycle.dirty || item.lifecycle.state === 'conflict')); }
  const original = record;
  const edit = (value: Draft, group?: string) => { original.saveRequest = transport.capture(); original.lifecycle.edit(value, group); };
  function controls(host: HTMLElement, apply: () => void) {
    original.views.add(host);
    const bar = document.createElement('div'); bar.className = 'editor-actions';
    const label = document.createElement('span'); label.setAttribute('role', 'status');
    const buttons = (['undo', 'redo', 'save'] as const).map(action => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = action === 'save' ? 'Save Now' : action === 'undo' ? 'Undo' : 'Redo';
      button.addEventListener('click', () => { original.saveRequest = transport.capture(); if (action === 'save') { original.lifecycle.resume(); void original.lifecycle.flush(); } else original.lifecycle[action](); }); bar.append(button); return button;
    });
    const reload = document.createElement('button'); reload.type = 'button'; reload.textContent = 'Reload source';
    reload.onclick = async () => {
      if (original.lifecycle.inFlight || original.lifecycle.dirty && !confirm('Discard this local presentation draft and reload authoritative source?')) return;
      try {
      const current = await transport.request<ApplicationPresentationStatus>(`/api/apps/${encodeURIComponent(key)}/presentation`);
      if (current.manifest?.applicationId !== applicationId || !current.draft) throw new Error('Original presentation owner is required.');
      original.revision = current.sourceRevision!; original.lifecycle.reset({ value: current.draft, views: {} }); original.lifecycle.resume();
      } catch (error) { label.textContent = `Reload failed: ${error instanceof Error ? error.message : String(error)}`; }
    };
    const recovery = document.createElement('button'); recovery.type = 'button'; recovery.textContent = 'Download recovery'; recovery.onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(original.lifecycle.current, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'presentation-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    bar.append(reload, recovery, label); host.append(bar); host.hidden = false;
    const show = () => {
      if (!host.isConnected) return;
      const state = original.lifecycle; label.textContent = [editingStatus(state.state, state.dirty), state.failure, state.notice].filter(Boolean).join(' · ');
      buttons[0].disabled = !state.canUndo; buttons[1].disabled = !state.canRedo; buttons[2].disabled = state.state === 'conflict'; buttons[2].textContent = state.suspended ? 'Resume editing' : 'Save Now'; apply();
    };
    const detach = original.lifecycle.subscribe(show); show();
    const observer = new MutationObserver(() => { if (!host.isConnected) { detach(); observer.disconnect(); original.views.delete(host); } });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  return {
    get draft() { return structuredClone(original.lifecycle.current.value); },
    lifecycle: original.lifecycle,
    edit(value: ApplicationPresentation, group?: string) { edit({ ...original.lifecycle.current, value, invalid: undefined }, group); },
    async flush() { original.saveRequest = transport.capture(); await original.lifecycle.flush(); return !original.lifecycle.dirty && original.lifecycle.state !== 'conflict' && original.lifecycle.state !== 'error'; },
    controls,
    bind(form: HTMLFormElement, section: string, parse: () => ApplicationPresentation, project: (value: ApplicationPresentation) => Fields) {
      for (const button of form.querySelectorAll<HTMLElement>('button[type="submit"], uib-action-button[type="submit"]')) button.hidden = true;
      const fields = () => Object.fromEntries([...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name], select[name], textarea[name]')].map(input => [input.name, input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.value]));
      const apply = () => {
        const values = original.lifecycle.current.views[section] ?? project(original.lifecycle.current.value);
        for (const input of form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name], select[name], textarea[name]')) if (Object.hasOwn(values, input.name)) {
          if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = Boolean(values[input.name]); else input.value = String(values[input.name]);
        }
      };
      apply(); controls(form, apply);
      const change = (event: Event) => {
        if (original.lifecycle.suspended) return;
        const next = structuredClone(original.lifecycle.current); next.views[section] = fields();
        try { next.value = parse(); next.invalid = undefined; } catch (error) { next.invalid = { section, message: error instanceof Error ? error.message : String(error) }; }
        edit(next, `${section}:${(event.target as HTMLInputElement).name}`);
      };
      form.addEventListener('input', change); form.addEventListener('change', change);
    },
  };
}
