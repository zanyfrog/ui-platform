import type { AuthorizedWorkspaceArtifact, WorkspaceTarget } from '../../shared/builder-workspace.js';
import type { WorkspaceEditorAdapter, WorkspaceEditorState } from './coordinator.js';
import { createEditorSessionBinding, editorSessionSnapshot, subscribeEditorSession } from '../artifact-editor/session.js';
import type { SavedCardTargetReader, SavedCardContext } from '../visual-artifacts/saved-card-target.js';
import { EditorRuntimeContext } from '../artifact-editor/context.js';
import { mountEditorShell } from '../artifact-editor/shell.js';
import { mountVisualEditor } from '../visual-artifacts/editor.js';
import { mountCompositionManager } from '../visual-artifacts/composition-manager.js';
import { mountAutomationEditor } from '../automation/editor.js';
import { authorizeWorkspace } from './requests.js';
import { createVisualFormTransport } from '../artifact-editor/visual-form-transport.js';
import { bindFormEditor } from '../artifact-editor/form-editor.js';
import { sourceSaved } from '../artifact-editor/saved-source.js';

/** Drafts remain inside their authoritative editors. This adapter holds only lifecycle and authority. */
export async function mountWorkspaceEditor(initial: AuthorizedWorkspaceArtifact, changed: () => void,
  related: (componentId: string) => void, close: () => void, createDataset?: (context: EditorRuntimeContext) => Promise<void>): Promise<WorkspaceEditorAdapter> {
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
      if (control.matches('[data-nodes], [data-file], [data-preview], [data-recover], [data-reload], [data-root]') || control.textContent === 'Edit Definition') continue;
      disabledControls.set(control, control.disabled); control.disabled = true;
    }
  }
  let state = (): WorkspaceEditorState => ({ dirty: false, pending: false });
  let savedCardTarget: SavedCardTargetReader | undefined;
  let deactivate = () => {}, suspend = () => {}, dispose = async () => {};
  let focus = async (_next: AuthorizedWorkspaceArtifact, _target: WorkspaceTarget) => {};
  const assert = () => {
    binding.assert();
    if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error('Original authorized identity required.');
  };
  function captureRequest() {
    assert();
    if (!active) throw new Error('Focus and authorize this artifact before editing.');
    const original = artifact, session = binding;
    return async <T>(url: string, init?: RequestInit): Promise<T> => {
      session.assert();
      if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error('Original authorized identity required.');
      url = url.replace(`/api/apps/${encodeURIComponent(originalApp)}/`, `/api/apps/${encodeURIComponent(original.applicationKey)}/`);
      const endpoint = new URL(url, location.origin);
      const method = init?.method ?? 'GET';
      if (!['GET', 'PUT'].includes(method) || method === 'PUT' && !original.editable || (endpoint.searchParams.get('locator') ?? endpoint.searchParams.get('path')) !== original.locator) throw new Error('Queued operation belongs to another artifact or lacks editing authority.');
      const headers = await session.headers(); session.assert();
      const response = await fetch(url, { ...init, headers: { ...headers, 'content-type': 'application/json', 'x-editor-application-id': original.applicationId } });
      const value = await response.json(); session.assert();
      if (!response.ok) throw Object.assign(new Error(value.error ?? value.code ?? 'Editor request denied.'), { status: response.status, code: value.code });
      if (method === 'PUT') sourceSaved(url);
      return value as T;
    };
  }
  // Asset operations retain this tab's Application and session. The server
  // independently requires presentation view/edit; Page edit grants neither.
  function captureAssetRequest() {
    assert();
    if (!active) throw new Error('Focus and authorize this artifact before choosing an image.');
    const original = artifact, session = binding;
    return async <T>(url: string, init?: RequestInit): Promise<T> => {
      const check = () => { session.assert(); assert(); if (!active || artifact.applicationKey !== original.applicationKey || artifact.applicationId !== original.applicationId) throw new Error('Application or editor context changed.'); };
      check();
      url = url.replace(`/api/apps/${encodeURIComponent(originalApp)}/`, `/api/apps/${encodeURIComponent(original.applicationKey)}/`);
      const endpoint = new URL(url, location.origin), method = init?.method ?? 'GET';
      if (endpoint.origin !== location.origin || endpoint.pathname !== `/api/apps/${encodeURIComponent(original.applicationKey)}/composition-asset` ||
          !['GET', 'POST'].includes(method) || method === 'POST' && (!(init?.body instanceof FormData) || !original.editable)) throw new Error('Unsupported Application asset operation.');
      const headers = await session.headers(); check();
      const response = await fetch(url, { ...init, cache: 'no-store', headers: { ...headers, 'x-editor-application-id': original.applicationId } });
      const value = await response.json(); check();
      if (!response.ok) throw Object.assign(new Error(value.error ?? value.code ?? 'Application asset request denied.'), { status: response.status, code: value.code });
      return value as T;
    };
  }
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
      const supplied = url.endsWith('/visual-artifacts') ? next.visual : next.composition;
      if (supplied !== undefined) return supplied as T;
      // A focused Visual tab does not embed composition source. Use the existing
      // protected composition read; it independently requires presentation view.
    }
    if (!mutation && /^\/api\/automation\/[^?]+$/.test(url)) return [artifact.automation] as T;
    const headers = await binding.headers();
    const response = await fetch(url, { ...init, headers: { ...headers, 'content-type': 'application/json', ...init?.headers } });
    const value = await response.json(); assertResponse();
    if (!response.ok) throw Object.assign(new Error(value.error ?? value.code ?? 'Editor request denied.'), { status: response.status, code: value.code });
    if (init?.method === 'PUT') sourceSaved(url);
    return value;
  }
  try {
    if (initial.visual?.components.find(b => b.locator === initial.locator && b.metadata?.form)) {
      const context = new EditorRuntimeContext(originalApp, () => createVisualFormTransport(() => artifact), window, () => artifact.applicationKey);
      const previewHost = document.createElement('section'); previewHost.setAttribute('aria-label', 'Form preview surface'); previewHost.hidden = true;
      bindFormEditor(context, { applicationKey: () => artifact.applicationKey, previewHost, createDataset: async () => { if (!createDataset) throw new Error('Dataset creation coordinator unavailable.'); await createDataset(context); } });
      const view = mountEditorShell(element, context, {}, undefined, { close, previewHost }); element.append(previewHost); const unsubscribe = context.subscribe(changed);
      await context.open(initial.locator);
      state = () => ({ dirty: !!context.snapshot?.dirty, pending: context.pending || context.snapshot?.saveState === 'saving', conflict: context.snapshot?.saveState === 'conflict', error: context.snapshot?.error });
      suspend = () => context.suspend();
      dispose = async () => { unsubscribe(); view.destroy(); await context.discard(); await context.dispose(); };
      focus = async (next, target) => { if (!context.hasCopy) await context.open(next.locator); if (!next.editable && context.snapshot?.artifact.capabilities.edit) context.suspend(); view.navigate(target.section, target.source); context.refreshPresentation(); };
    } else if (initial.visual) {
      const editor = await mountVisualEditor(element, originalApp, { request, captureRequest, captureAssetRequest, applicationId: initial.applicationId, workspace: initial.visual,
        savedCardContext: { get: () => {
          binding.assert(); const session = editorSessionSnapshot();
          if (disposed || !session?.principal || session.principal.subjectId !== originalSubject || artifact.applicationId !== initial.applicationId ||
              artifact.identity.owner.kind !== 'application' || artifact.identity.format !== 'visual' || !artifact.identity.id || artifact.identity.repairLocator) return;
          return { applicationId: initial.applicationId, page: artifact.identity as SavedCardContext['page'], subjectId: originalSubject!, sessionRevision: session.revision };
        }, subscribe: subscribeEditorSession },
        initial: { kind: initial.kind as 'page' | 'component' | 'shell', locator: initial.locator }, onDefinition: related, onStateChange: changed, applicationKey: () => artifact.applicationKey });
      state = editor.state; deactivate = editor.deactivate; suspend = editor.suspend; dispose = async () => editor.dispose();
      savedCardTarget = editor.savedCardTarget;
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
        view.navigate(target.section, target.source);
      };
    } else if (initial.composition && initial.source) {
      const editor = await mountCompositionManager(element, originalApp, { request, captureRequest, applicationId: initial.applicationId, definition: initial.composition, source: initial.source, onStateChange: changed });
      if (!editor) throw new Error('Composition unavailable.'); state = editor.state; deactivate = editor.deactivate; suspend = editor.suspend; dispose = async () => editor.dispose();
      focus = async (next) => editor.focus(next.source!);
    } else if (initial.automation) {
      const editor = await mountAutomationEditor(element, { request, captureRequest, kind: initial.kind as 'trigger' | 'workflow', initial: initial.automation, onStateChange: changed });
      state = editor.state; deactivate = editor.deactivate; suspend = editor.suspend; dispose = async () => editor();
      focus = async (next, target) => editor.focus(next.automation!, target.step);
    } else {
      const source = document.createElement('pre'); source.textContent = initial.source?.content ?? initial.legacy?.source ?? JSON.stringify(initial.package?.definition ?? initial.package, null, 2);
      const label = document.createElement('p'); label.textContent = 'Read-only source inspection'; element.append(label, source);
      focus = async next => { source.textContent = next.source?.content ?? next.legacy?.source ?? JSON.stringify(next.package?.definition ?? next.package, null, 2); };
    }
  } catch (error) { await dispose(); element.remove(); throw error; }
  return {
    get savedCardTarget() { return savedCardTarget; },
    element, state,
    async focus(next, target) {
      if (disposed || editorSessionSnapshot()?.principal?.subjectId !== originalSubject) throw new Error('Original authorized identity required.');
      if (next.locator !== initial.locator) throw new Error('Artifact moved. The retained tab is suspended to protect its original draft. Recover or close it, then reopen the current artifact.');
      artifact = next;
      try { binding.assert(); } catch { binding = createEditorSessionBinding(); }
      await binding.headers();
      controls(true); await focus(next, target); assert(); active = true; controls(next.editable);
      element.querySelector('[data-workspace-navigation-note]')?.remove();
      const nodeMissing = target.node && ![...element.querySelectorAll<HTMLOptionElement>('[data-nodes] option')].some(option => option.value === target.node);
      if (target.field || target.step && !next.automation || nodeMissing || target.source && !next.generic?.files.some(file => file.path === target.source!.file) && target.source.file !== 'artifact.json') {
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
