import { EditorTransportError, type ArtifactEditorTransport, type EditorArtifactSummary, type EditorSaveDto, type EditorWatchEvent } from '../../shared/artifact-editor.js';
import { createEditorSessionBinding, invalidateEditorSession, refreshEditorSession, subscribeEditorSession } from './session.js';

export async function discoverEditorArtifacts(appKey: string): Promise<EditorArtifactSummary[]> {
  const binding = createEditorSessionBinding();
  try {
    const response = await fetch(`/api/apps/${encodeURIComponent(appKey)}/artifacts`, { headers: await binding.headers(), credentials: 'same-origin' });
    const value = await response.json();
    binding.assert();
    if (!response.ok) throw new EditorTransportError(response.status, value.error, value.code, value.validation);
    return value;
  } finally { binding.revoke(); }
}

export function createArtifactEditorTransport(appKey: string): ArtifactEditorTransport {
  const base = `/api/apps/${encodeURIComponent(appKey)}/artifacts`;
  const binding = createEditorSessionBinding();
  async function request(locator: string, suffix = '', changes?: EditorSaveDto) {
    const headers = await binding.headers();
    const response = await fetch(`${base}/${encodeURIComponent(locator)}${suffix}`, {
      credentials: 'same-origin', headers: { ...headers, ...(changes ? { 'content-type': 'application/json' } : {}) },
      ...(changes ? { method: 'PUT', body: JSON.stringify(changes) } : {}),
    });
    const value = await response.json();
    binding.assert();
    if (response.status === 401 || response.status === 403) { binding.revoke(); invalidateEditorSession(); }
    if (!response.ok) throw new EditorTransportError(response.status, value.error, value.code, value.validation);
    return value;
  }
  return {
    load: locator => request(locator),
    save: (locator, changes) => request(locator, '', changes),
    validateSaved: locator => request(locator, '/validation'),
    getReferences: locator => request(locator, '/references'),
    subscribe(locator, listener) {
      const events = new EventSource(`/api/events?appKey=${encodeURIComponent(appKey)}`);
      const removeSessionListener = subscribeEditorSession(() => {
        try { binding.assert(); } catch { events.close(); removeSessionListener(); }
      });
      events.addEventListener('artifact-change', event => {
        try { binding.assert(); } catch { return; }
        const value = JSON.parse((event as MessageEvent).data) as EditorWatchEvent;
        if (value.appKey === appKey && value.locator === locator) listener(value);
      });
      // Reconcile after reconnect, including changes missed while disconnected.
      events.addEventListener('open', () => {
        try { binding.assert(); listener({ appKey, locator, kind: 'changed' }); } catch { events.close(); removeSessionListener(); }
      });
      events.addEventListener('error', () => { void refreshEditorSession().catch(() => { binding.revoke(); invalidateEditorSession(); events.close(); removeSessionListener(); }); });
      return () => { removeSessionListener(); events.close(); };
    },
  };
}
