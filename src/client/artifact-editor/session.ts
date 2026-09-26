import { EditorTransportError } from '../../shared/artifact-editor.js';
import type { EditorSessionDto } from '../../shared/editor-security.js';

let current: EditorSessionDto | undefined;
let generation = 0;
let loading: Promise<EditorSessionDto> | undefined;
const listeners = new Set<() => void>();
function notify() { for (const listener of listeners) listener(); }

export function editorSessionSnapshot() { return current ? structuredClone(current) : undefined; }
export function subscribeEditorSession(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function invalidateEditorSession() { generation++; current = undefined; loading = undefined; notify(); }

async function decode(response: Response): Promise<EditorSessionDto> {
  const value = await response.json();
  if (!response.ok) throw new EditorTransportError(response.status, value.error, value.code);
  return value;
}
export async function refreshEditorSession(): Promise<EditorSessionDto> {
  if (loading) return loading;
  const started = generation;
  const request = (async () => {
    const value = await decode(await fetch('/api/editor/session', { cache: 'no-store', credentials: 'same-origin' }));
    if (started !== generation) throw new EditorTransportError(403, 'Editor identity changed.', 'editor.session-changed');
    if (current?.revision !== value.revision) generation++;
    current = value; notify(); return structuredClone(value);
  })();
  loading = request;
  try { return await request; } finally { if (loading === request) loading = undefined; }
}
export async function selectEditorIdentity(fixtureId: string | null) {
  const session = current ?? await refreshEditorSession();
  // Lock existing transports before sending the switch, including during slow saves.
  invalidateEditorSession();
  broadcastIdentityChange();
  const value = await decode(await fetch('/api/editor/session', { method: fixtureId === null ? 'DELETE' : 'POST',
    credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-editor-csrf': session.csrfToken, 'x-editor-revision': session.revision },
    body: JSON.stringify({ fixtureId }),
  }));
  current = value; notify(); broadcastIdentityChange(); return structuredClone(value);
}
function broadcastIdentityChange() {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem('uib-editor-identity-change', `${Date.now()}:${Math.random()}`); } catch { /* Server revision remains authoritative. */ }
  }
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === 'uib-editor-identity-change') { invalidateEditorSession(); void refreshEditorSession().catch(() => {}); }
});

/** A transport never adopts a new identity for an existing working copy. */
export function createEditorSessionBinding() {
  let revision: string | undefined;
  let boundGeneration: number | undefined;
  let revoked = false;
  function assert() {
    if (revoked || (boundGeneration !== undefined && boundGeneration !== generation)) throw new EditorTransportError(403, 'Access changed. Local edits are retained; reopen under the current identity.', 'editor.session-changed');
  }
  return {
    async headers() {
      assert();
      const session = current ?? await refreshEditorSession();
      assert();
      if (!session.principal) throw new EditorTransportError(401, 'Select a development identity.', 'editor.unauthorized');
      revision ??= session.revision; boundGeneration ??= generation;
      if (revision !== session.revision) { revoked = true; assert(); }
      return { 'x-editor-revision': revision, 'x-editor-csrf': session.csrfToken };
    },
    assert,
    revoke() { revoked = true; },
  };
}
