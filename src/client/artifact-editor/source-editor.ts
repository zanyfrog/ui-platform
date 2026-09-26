import type { ValidationDiagnostic } from '@ui-platform/artifacts';
import type { EditorRuntimeContext } from './context.js';

export interface SourceLocation { file: string; line?: number; column?: number; }
export interface SourceEditorState { selected?: SourceLocation; }

interface SourceDocument { key: string; label: string; source: string; set(source: string): void; }

function documents(context: EditorRuntimeContext): SourceDocument[] {
  const artifact = context.snapshot?.artifact;
  if (!artifact) return [];
  return [
    { key: 'artifact.json', label: 'artifact.json (manifest)', source: artifact.manifestContent, set: source => context.setManifest(source) },
    ...artifact.files.map(file => ({ key: file.path, label: `${file.path} (${file.role})`, source: file.content, set: (source: string) => context.setFile(file.path, source, file.role, file.language) })),
  ];
}

function position(source: string, line = 1, column = 1) {
  const lines = source.split('\n');
  const safeLine = Math.max(1, Math.min(line, lines.length));
  const start = lines.slice(0, safeLine - 1).reduce((total, value) => total + value.length + 1, 0);
  return Math.min(source.length, start + Math.max(0, Math.min(column - 1, lines[safeLine - 1].length)));
}

function sourceWarning(document: SourceDocument) {
  if (!/\.json$/i.test(document.key)) return undefined;
  try {
    const value = JSON.parse(document.source);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'This JSON root is not an object, so visual property controls cannot safely represent it. Raw source is preserved.';
    return undefined;
  } catch {
    return 'Malformed JSON is preserved verbatim. Visual property controls are paused for this source until it is repaired here.';
  }
}

/** Raw source UI only: all writes use the existing shared working copy and autosave path. */
export function renderSourceEditor(container: HTMLElement, context: EditorRuntimeContext, state: SourceEditorState) {
  const artifact = context.snapshot?.artifact;
  if (!artifact) return;
  container.replaceChildren();
  const docs = documents(context);
  if (!docs.length) return;
  let current = docs.find(document => document.key === state.selected?.file) ?? docs[0];
  const label = document.createElement('label'); label.textContent = 'Source file';
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Source file');
  for (const document of docs) select.append(new Option(document.label, document.key));
  select.value = current.key;
  select.disabled = !context.canEdit;
  select.addEventListener('change', () => { state.selected = { file: select.value }; renderSourceEditor(container, context, state); });
  label.append(select); container.append(label);
  const capability = document.createElement('p');
  capability.textContent = artifact.capabilities.format
    ? 'Raw edits share the Properties and plugin working copy. Save now uses Foundation’s existing transactional formatter and validation.'
    : 'Raw source is read-only for this authorization.';
  container.append(capability);
  const warning = sourceWarning(current);
  if (warning) { const note = document.createElement('p'); note.className = 'editor-compatibility'; note.textContent = warning; container.append(note); }
  const editor = document.createElement('textarea');
  editor.className = 'artifact-source-editor'; editor.spellcheck = false; editor.value = current.source;
  editor.disabled = !context.canEdit; editor.setAttribute('aria-label', `Source for ${current.key}`); editor.dataset.editorFocus = `source/${current.key}`;
  const target = state.selected?.file === current.key && state.selected.line ? position(current.source, state.selected.line, state.selected.column) : undefined;
  editor.addEventListener('input', () => current.set(editor.value));
  container.append(editor);
  if (target !== undefined) {
    // The shell preserves focus during ordinary edits; diagnostic navigation deliberately moves it.
    requestAnimationFrame(() => { if (editor.isConnected) { editor.focus({ preventScroll: true }); editor.setSelectionRange(target, target); } });
  }
}

/** Saved diagnostics remain authoritative; this only translates their existing location metadata into a source selection. */
export function diagnosticLocation(diagnostic: ValidationDiagnostic): SourceLocation | undefined {
  if (!diagnostic.file) return undefined;
  return { file: diagnostic.file, line: diagnostic.line, column: diagnostic.column };
}
