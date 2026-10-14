import type { AuthorizedWorkspaceArtifact, WorkspaceTarget } from '../../shared/builder-workspace.js';
import type { WorkspaceEditorAdapter, WorkspaceEditorState } from './coordinator.js';
import { createEditorSessionBinding, editorSessionSnapshot } from '../artifact-editor/session.js';
import { EditorRuntimeContext } from '../artifact-editor/context.js';
import { mountEditorShell } from '../artifact-editor/shell.js';
import { mountVisualEditor } from '../visual-artifacts/editor.js';
import { mountCompositionManager } from '../visual-artifacts/composition-manager.js';
import { mountAutomationEditor } from '../automation/editor.js';
import { authorizeWorkspace } from './requests.js';

/** Drafts remain inside their authoritative editors. This adapter holds only lifecycle and authority. */
export async function mountWorkspaceEditor(initial: AuthorizedWorkspaceArtifact, changed: () => void,
  related: (componentId: string) => void, close: () => void): Promise<WorkspaceEditorAdapter> {
  const element = document.createElement('article'); element.className = 'workspace-editor';
  element.setAttribute('aria-label', `${initial.kind} editor`);
  const originalSubject = editorSessionSnapshot()?.principal?.subjectId;
  const originalApp = initial.applicationKey;
  let artifact = initial, active = false, disposed = false, binding = createEditorSessionBinding();
  const disabledControls = new Map<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement, boolean>();
  function controls(editable: boolean) {
    for (const [control, disabled] of disabledControls) control.disabled = disabled;
    disabledControls.clear();
    if (editable || artifact.generic) return;
    for (const control of element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input, select, textarea, button')) {
      if (control.matches('[data-nodes], [data-file], [data-preview], [data-recover], [data-root]') || control.textContent === 'Edit Definition') continue;
      disabledControls.set(control, control.disabled); control.disabled = true;
    }
  }
  let state = (): WorkspaceEditorState => ({ dirty: false, pending: false });
  let deactivate = () => {}, suspend = () => {}, dispose = async () => {};
  let focus = async (_next: AuthorizedWorkspaceArtifact, _target: WorkspaceTarget) => {};
  const assert = () => {
    binding.assert();
    if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error('Original authorized identity required.');
  };
  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    assert();
    const requestBinding = binding, applicationKey = artifact.applicationKey;
    const assertResponse = () => { requestBinding.assert(); assert(); if (applicationKey !== artifact.applicationKey) throw new Error('Application context changed during the request.'); };
    const mutation = !!init?.method && init.method !== 'GET';
    if (mutation && (!active || !artifact.editable)) throw new Error('Focus and authorize this artifact before editing.');
    // Rebind a shared definition to its freshly authorized requesting Application.
    url = url.replace(`/api/apps/${encodeURIComponent(originalApp)}/`, `/api/apps/${encodeURIComponent(artifact.applicationKey)}/`);
    if (mutation) {
      const endpoint = new URL(url, location.origin);
      const locator = endpoint.searchParams.get('locator') ?? endpoint.searchParams.get('path');
      if (locator !== null && locator !== artifact.locator) throw new Error('Mutation belongs to another artifact.');
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body ?? '{}'));
        if (!endpoint.pathname.endsWith('/page-shell') || body.locator !== artifact.locator) throw new Error('Create and link operations are outside this focused tab.');
      }
    }
    if (!mutation && (url.endsWith('/visual-artifacts') || url.endsWith('/composition'))) {
      const next = await authorizeWorkspace(artifact.applicationKey, { identity: artifact.identity }); assertResponse();
      artifact = next;
      return (url.endsWith('/visual-artifacts') ? next.visual : next.composition) as T;
    }
    if (!mutation && /^\/api\/automation\/[^?]+$/.test(url)) return [artifact.automation] as T;
    const headers = await binding.headers();
    const response = await fetch(url, { ...init, headers: { ...headers, 'content-type': 'application/json', ...init?.headers } });
    const value = await response.json(); assertResponse();
    if (!response.ok) throw new Error(value.error ?? 'Editor request denied.');
    return value;
  }
  try {
    if (initial.visual) {
      const editor = await mountVisualEditor(element, originalApp, { request, workspace: initial.visual,
        initial: { kind: initial.kind as 'page' | 'component' | 'shell', locator: initial.locator }, onDefinition: related, onStateChange: changed, applicationKey: () => artifact.applicationKey });
      state = editor.state; deactivate = editor.deactivate; dispose = async () => editor.dispose();
      focus = async (next, target) => editor.focus(next.visual!, target);
    } else if (initial.generic) {
      const context = new EditorRuntimeContext(originalApp);
      const view = mountEditorShell(element, context, {}, undefined, { close }); const unsubscribe = context.subscribe(changed);
      dispose = async () => { unsubscribe(); view.destroy(); await context.discard(); await context.dispose(); };
      // The existing generic working copy retains its own save timer and bound transport.
      await context.open(initial.locator);
      let retainedDirty = false;
      state = () => { const snapshot = context.snapshot; retainedDirty = snapshot?.dirty ?? retainedDirty; return { dirty: retainedDirty,
        pending: context.pending || snapshot?.saveState === 'saving', conflict: snapshot?.saveState === 'conflict', error: snapshot?.error }; };
      suspend = () => { state(); context.suspend(); };
      focus = async (next, target) => {
        if (!context.hasCopy) await context.open(next.locator);
        if (!next.generic?.capabilities.edit && context.snapshot?.artifact.capabilities.edit) suspend();
        view.navigate(target.section);
      };
    } else if (initial.composition && initial.source) {
      const editor = await mountCompositionManager(element, originalApp, { request, definition: initial.composition, source: initial.source, onStateChange: changed });
      if (!editor) throw new Error('Composition unavailable.'); state = editor.state; dispose = async () => editor.dispose();
    } else if (initial.automation) {
      const editor = await mountAutomationEditor(element, { request, kind: initial.kind as 'trigger' | 'workflow', initial: initial.automation, onStateChange: changed });
      state = editor.state; deactivate = editor.deactivate; dispose = async () => editor();
      focus = async (next, target) => editor.focus(next.automation!, target.step);
    } else {
      const source = document.createElement('pre'); source.textContent = initial.legacy?.source ?? JSON.stringify(initial.package?.definition ?? initial.package, null, 2);
      const label = document.createElement('p'); label.textContent = 'Read-only source inspection'; element.append(label, source);
    }
  } catch (error) { await dispose(); element.remove(); throw error; }
  return {
    element, state,
    async focus(next, target) {
      if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error('Original authorized identity required.');
      artifact = next; binding.revoke(); binding = createEditorSessionBinding(); await binding.headers();
      controls(true); await focus(next, target); assert(); active = true; controls(next.editable);
      element.querySelector('[data-workspace-navigation-note]')?.remove();
      if (target.field || target.step && !next.automation) {
        const note = document.createElement('p'); note.dataset.workspaceNavigationNote = ''; note.textContent = 'Artifact opened. This editor does not yet support a precise location for that navigation target.'; element.prepend(note);
      }
    },
    deactivate() { active = false; deactivate(); element.remove(); },
    suspend() { active = false; binding.revoke(); deactivate(); suspend(); element.remove(); },
    async guardClose() {
      const current = state();
      if (current.pending) return false;
      return !current.dirty && !current.conflict || confirm('Discard unsaved or invalid local changes and close this artifact? Cancel keeps the tab and its recovery copy.');
    },
    async dispose() { disposed = true; active = false; binding.revoke(); try { await dispose(); } finally { element.remove(); } },
  };
}
