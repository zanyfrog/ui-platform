import type { EditorRuntimeContext } from './context.js';
import type { EditorPluginScope } from './plugins.js';
import { formSource, formApplicationKey, formPreviewHost } from './form-editor.js';
import { createEditorSessionBinding, editorSessionSnapshot } from './session.js';
type PreviewState = { frame?: HTMLIFrameElement; mode?: string; operation?: string; recordId?: string; testId?: string; message?: string; applicationKey: string; revision?: string };
const states = new WeakMap<EditorRuntimeContext, PreviewState>();
export function renderFormPreview(container: HTMLElement, context: EditorRuntimeContext, _scope: EditorPluginScope) {
  let state = states.get(context); const applicationKey = formApplicationKey(context), revision = editorSessionSnapshot()?.revision;
  if (!state || state.applicationKey !== applicationKey || state.revision !== revision) { state?.frame?.remove(); state = { applicationKey, revision }; states.set(context, state); } const current = state;
  const { metadata } = formSource(context);
  const note = document.createElement('p'); note.textContent = current.message ?? 'Design preview uses fixtures and cannot persist. Submission Test uses a separate isolated development store. Normal running Applications use their connected protected Dataset.'; container.append(note);
  const mode = document.createElement('select'); mode.setAttribute('aria-label', 'Preview mode');
  for (const name of Object.keys(metadata.modes?.overrides ?? {})) mode.append(new Option(name, name)); mode.value = current.mode ?? metadata.modes!.default; mode.onchange = () => { current.mode = mode.value; }; container.append(mode);
  const operation = document.createElement('select'); operation.setAttribute('aria-label', 'Preview operation'); operation.append(new Option('Create', 'create'), new Option('Edit', 'edit')); operation.value = current.operation ?? 'create'; operation.onchange = () => { current.operation = operation.value; }; container.append(operation);
  const record = document.createElement('input'); record.setAttribute('aria-label', 'Preview record ID'); record.value = current.recordId ?? ''; record.oninput = () => { current.recordId = record.value; }; container.append(record);
  const request = async (action: string, input: unknown) => { const binding = createEditorSessionBinding(), key = formApplicationKey(context); const response = await fetch(`/api/apps/${encodeURIComponent(key)}/form-tests/${action}`, { method: 'POST', headers: { ...await binding.headers(), 'content-type': 'application/json' }, body: JSON.stringify(input) }); const result = await response.json(); binding.assert(); if (!response.ok || context.suspended || key !== formApplicationKey(context)) throw new Error(result.error ?? 'Submission test denied.'); return result; };
  const show = async (test: boolean, reuse = false) => {
    if (context.snapshot?.dirty) await context.flush();
    if (context.snapshot?.dirty) throw new Error('Correct and save the Form before preview.');
    if (test) { if (!reuse || !current.testId) { const result = await context.perform(() => request('start', { formId: metadata.componentId, datasetId: metadata.form!.datasetId })); current.testId = result.testId; } current.message = 'ISOLATED DEVELOPMENT SUBMISSION TEST — protected storage is separate from the connected Application store.'; }
    else current.message = 'DESIGN PREVIEW — nonpersisting fixtures; submission is unavailable.';
    const frame = document.createElement('iframe'); frame.title = test ? 'Isolated Form submission test' : 'Form design preview'; frame.src = '/visual-preview.html'; frame.style.cssText = 'width:100%;min-height:600px;border:1px solid #ccc';
    const artifact = context.snapshot!.artifact, key = formApplicationKey(context);
    frame.onload = () => { if (context.suspended) return; frame.contentWindow!.postMessage({ type: 'uip-preview', locator: artifact.locator, kind: 'component', hash: artifact.checksum, appKey: key, design: !test,
      testId: test ? current.testId : undefined, publicInputs: { mode: current.mode ?? metadata.modes!.default, operation: current.operation ?? 'create', ...(current.recordId ? { recordId: current.recordId } : {}) } }, location.origin); };
    const host = formPreviewHost(context); if (!host) throw new Error('Open this Form in its Application workspace to preview it.');
    current.frame?.remove(); current.frame = frame; host.replaceChildren(frame); context.refreshPresentation();
  };
  const button = (label: string, action: () => Promise<void>) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.disabled = context.pending || !context.snapshot; b.onclick = () => { void action().catch(error => { current.message = error.message; context.refreshPresentation(); }); }; container.append(b); };
  button('Open nonpersisting design preview', () => show(false));
  button('Start isolated submission test', () => show(true));
  if (current.testId) button('Refresh isolated test view', () => show(true, true));
  if (current.testId) button('End isolated submission test', async () => { await request('end', { testId: current.testId }); current.testId = undefined; current.frame?.remove(); current.frame = undefined; current.message = 'Isolated test ended. Normal Application data was untouched.'; context.refreshPresentation(); });
  // The workspace owns a persistent preview host outside the rerendered panel controls.
}
