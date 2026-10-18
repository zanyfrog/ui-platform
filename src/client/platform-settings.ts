import { autosaveMilliseconds, defaultPlatformSettings, validatePlatformSettings, type PlatformSettingsSnapshot } from '../shared/platform-settings.js';
import { configureAutosave } from './artifact-editor/autosave-configuration.js';
import { createEditorSessionBinding, editorSessionSnapshot, subscribeEditorSession } from './artifact-editor/session.js';

let snapshot: PlatformSettingsSnapshot | undefined;
let controller: AbortController | undefined;
let generation = 0;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
function unavailable(message: string) {
  const settings = defaultPlatformSettings(); settings.editor.autosave.enabled = false;
  snapshot = { settings, revision: '', source: 'fallback', problem: message };
  configureAutosave(settings.editor.autosave); notify();
}
function accept(value: PlatformSettingsSnapshot) {
  validatePlatformSettings(value.settings);
  if (!value.revision || !['default', 'stored', 'fallback'].includes(value.source)) throw new Error('Invalid settings response.');
  snapshot = value; configureAutosave(value.settings.editor.autosave); notify();
}
async function connect() {
  const started = ++generation; controller?.abort(); const abort = new AbortController(); controller = abort;
  unavailable('Platform settings are unavailable. Automatic saves are disabled; drafts and Save Now remain available.');
  try {
    const binding = createEditorSessionBinding(), headers = await binding.headers();
    const response = await fetch('/api/platform/settings', { headers, cache: 'no-store', signal: abort.signal });
    if (!response.ok) throw new Error('Settings access unavailable.');
    const value = await response.json(); binding.assert(); if (started !== generation) return; accept(value);
    void stream(binding, headers, started, abort);
  } catch {
    if (started === generation) {
      unavailable('Platform settings could not be read. Automatic saves are disabled; drafts and Save Now remain available.');
      setTimeout(() => { if (started === generation) void connect(); }, 1000);
    }
  }
}
async function stream(binding: ReturnType<typeof createEditorSessionBinding>, headers: Record<string, string>, started: number, abort: AbortController) {
  try {
    const response = await fetch('/api/platform/settings/events', { headers, cache: 'no-store', signal: abort.signal });
    if (!response.ok || !response.body) throw new Error('Settings propagation unavailable.');
    const reader = response.body.getReader(), decoder = new TextDecoder(); let pending = '';
    while (started === generation) {
      const next = await reader.read(); if (next.done) throw new Error('Settings stream ended.');
      pending += decoder.decode(next.value, { stream: true });
      let end: number;
      while ((end = pending.indexOf('\n\n')) >= 0) {
        const event = pending.slice(0, end); pending = pending.slice(end + 2); binding.assert();
        if (event.startsWith('event: revoked')) throw new Error('Settings access revoked.');
        const data = event.split('\n').find(line => line.startsWith('data: '));
        if (data && started === generation) accept(JSON.parse(data.slice(6)));
      }
    }
  } catch {
    if (started !== generation) return;
    unavailable('Platform settings connection was lost. Automatic saves are disabled; drafts and Save Now remain available.');
    setTimeout(() => { if (started === generation) void connect(); }, 1000);
  }
}
export async function startPlatformSettings() {
  let revision = editorSessionSnapshot()?.revision;
  subscribeEditorSession(() => {
    const next = editorSessionSnapshot()?.revision;
    if (revision !== next) { revision = next; void connect(); }
  });
  await connect();
  const banner = document.createElement('p'); banner.setAttribute('role', 'status'); banner.dataset.platformSettingsProblem = '';
  const show = () => { banner.textContent = snapshot?.problem ?? ''; banner.hidden = !snapshot?.problem; }; listeners.add(show); show(); document.body.prepend(banner);
}
export function mountPlatformSettings(target: HTMLElement) {
  target.innerHTML = '<section class="panel stack"><h2>Settings → Editor → Autosave</h2><p>Delay is the inactivity period before a save is attempted.</p><form><label><input type="checkbox" name="enabled"> Enable autosave</label><label>Delay in seconds <input name="delay" type="text" inputmode="decimal" aria-label="Autosave delay in seconds"></label><p>0.10–60.00 seconds, in increments of 0.01 seconds.</p><button type="submit">Save settings</button><button type="button" data-reload>Reload settings</button><p role="status"></p></form></section>';
  const form = target.querySelector('form')!, enabled = form.elements.namedItem('enabled') as HTMLInputElement, delay = form.elements.namedItem('delay') as HTMLInputElement, status = form.querySelector('[role=status]')!;
  let base: PlatformSettingsSnapshot | undefined, dirty = false;
  const show = () => {
    if (!target.isConnected) { listeners.delete(show); return; }
    if (!dirty) { base = snapshot; enabled.checked = snapshot?.settings.editor.autosave.enabled ?? false; delay.value = ((snapshot?.settings.editor.autosave.delayMs ?? 2000) / 1000).toFixed(2); }
    const blocked = !snapshot?.canModify || snapshot.source === 'fallback';
    enabled.disabled = delay.disabled = blocked; form.querySelector<HTMLButtonElement>('[type=submit]')!.disabled = blocked;
    status.textContent = snapshot?.problem ?? (dirty && base?.revision !== snapshot?.revision ? 'Settings changed elsewhere. Reload before saving; your input is retained.' : snapshot?.canModify ? 'Platform-wide settings. Save Now is available in editors when autosave is disabled.' : 'Only Platform administrators may modify settings.');
  };
  form.oninput = () => { dirty = true; };
  form.querySelector<HTMLButtonElement>('[data-reload]')!.onclick = () => { dirty = false; show(); };
  form.onsubmit = async event => {
    event.preventDefault();
    try {
      const delayMs = autosaveMilliseconds(delay.value);
      if (!base || base.revision !== snapshot?.revision) throw new Error('Settings changed. Reload before saving.');
      const settings = structuredClone(base.settings); settings.editor.autosave = { enabled: enabled.checked, delayMs };
      const binding = createEditorSessionBinding(), headers = await binding.headers();
      const response = await fetch('/api/platform/settings', { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ settings, expectedRevision: base.revision }) });
      const value = await response.json(); binding.assert(); if (!response.ok) throw new Error(value.error ?? 'Settings save failed.');
      dirty = false; accept(value); status.textContent = 'Platform settings saved.';
    } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
  };
  listeners.add(show); show();
}
