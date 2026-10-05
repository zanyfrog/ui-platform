import { editorSessionSnapshot, refreshEditorSession, selectEditorIdentity, subscribeEditorSession } from './session.js';

/** Dev-only chrome. Uses no independent artifact state, timer or save mechanism. */
export async function mountDevelopmentIdentity(container: HTMLElement) {
  const v1 = await fetch('/api/development-identity/session').then(async response => response.ok ? await response.json() as {
    csrfToken: string; user: { userId: string; email: string; displayName: string } | null;
    identities: Array<{ email: string; displayName: string }>;
  } : null).catch(() => null);
  if (v1) {
    const label = document.createElement('label');
    label.textContent = 'Development identity ';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Development identity');
    select.add(new Option('Sign out', ''));
    for (const user of v1.identities) select.add(new Option(`${user.displayName} (${user.email})`, user.email));
    select.value = v1.user?.email ?? '';
    label.append(select); container.append(label);
    select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        const email = select.value;
        const response = await fetch('/api/development-identity/session', { method: email ? 'POST' : 'DELETE',
          headers: { 'content-type': 'application/json', 'x-v1-csrf': v1.csrfToken },
          body: JSON.stringify(email ? { email } : {}) });
        if (!response.ok) throw new Error('Development sign-in was denied.');
        location.reload();
      } catch (error) {
        select.disabled = false; select.value = v1.user?.email ?? '';
        const status = document.createElement('span'); status.setAttribute('role', 'alert');
        status.textContent = error instanceof Error ? error.message : String(error); label.append(status);
      }
    });
    await refreshEditorSession().catch(() => {});
    return () => label.remove();
  }
  try { await refreshEditorSession(); } catch { return () => {}; }
  const label = document.createElement('label');
  label.textContent = 'Development identity ';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Development identity');
  const status = document.createElement('span'); status.setAttribute('role', 'status');
  label.append(select); container.append(label, status);
  const render = () => {
    const session = editorSessionSnapshot();
    select.replaceChildren(new Option('Select identity', ''));
    for (const fixture of session?.fixtures ?? []) select.add(new Option(fixture.label, fixture.id));
    select.value = session?.principal?.subjectId ?? '';
    select.disabled = !session;
    status.textContent = session?.principal ? ` ${session.principal.roleIds.join(', ')} · Identity changes suspend open copies; use recovery or discard.` : ' Editor access locked.';
  };
  const unsubscribe = subscribeEditorSession(render); render();
  select.addEventListener('change', async () => {
    const selected = select.value;
    try { await selectEditorIdentity(selected || null); }
    catch (error) { await refreshEditorSession().catch(() => {}); status.textContent = error instanceof Error ? error.message : String(error); }
  });
  return () => { unsubscribe(); label.remove(); status.remove(); };
}

/** Later artifact panels supply the authorized DTO's capabilities.edit value.
 * Revocation hides the panel without changing or discarding the Phase 1 copy.
 * The server and session-bound transport remain the actual security boundary. */
export function guardEditorControls(container: HTMLElement, canEdit: boolean) {
  const revision = editorSessionSnapshot()?.revision;
  const refresh = () => {
    const session = editorSessionSnapshot();
    const authorizedSession = !!session?.principal && session.revision === revision;
    const editable = canEdit && authorizedSession;
    // Retain the Phase 1 copy in memory but do not display the previous identity's
    // source after switching. A fresh authorized load is required to show it again.
    container.hidden = !authorizedSession;
    container.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement>('[data-editor-mutation]').forEach(control => { control.disabled = !editable; });
    container.querySelectorAll<HTMLElement>('[data-editor-edit-only]').forEach(control => { control.hidden = !editable; });
    container.toggleAttribute('data-editor-access-revoked', !authorizedSession);
  };
  const unsubscribe = subscribeEditorSession(refresh); refresh(); return unsubscribe;
}
