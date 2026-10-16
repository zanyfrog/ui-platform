import { generateForm, formCalculations, formExpressionFields, calculationOrder, expressionType } from '@ui-platform/visual-artifacts';
import type { ArtifactMetadata, FormField, ArtifactFiles, DatasetDefinition } from '@ui-platform/visual-artifacts';
import type { DeclarativeExpression, ExpressionNode } from '@ui-platform/dataset-operations/expression';
import type { EditorRuntimeContext } from './context.js';
import type { EditorPluginScope, EditorPluginRegistry } from './plugins.js';
import { createEditorSessionBinding, editorSessionSnapshot } from './session.js';

export interface FormEditorActions { applicationKey(): string; createDataset(): Promise<void>; previewHost: HTMLElement }
const actions = new WeakMap<EditorRuntimeContext, FormEditorActions>();
export const bindFormEditor = (context: EditorRuntimeContext, value: FormEditorActions) => actions.set(context, value);
export const formApplicationKey = (context: EditorRuntimeContext) => actions.get(context)?.applicationKey() ?? context.applicationKey;
export const formPreviewHost = (context: EditorRuntimeContext) => actions.get(context)?.previewHost;
const states = new WeakMap<EditorRuntimeContext, { datasets?: DatasetChoice[]; message?: string; applicationKey: string; revision?: string }>();
type DatasetChoice = { locator: string; name?: string; schema?: DatasetDefinition; appliedSchema?: DatasetDefinition };
const stateFor = (c: EditorRuntimeContext) => { let s = states.get(c); const applicationKey = formApplicationKey(c), revision = editorSessionSnapshot()?.revision; if (!s || s.applicationKey !== applicationKey || s.revision !== revision) { s = { applicationKey, revision }; states.set(c, s); } return s; };
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; }
function button(text: string, fn: () => void, disabled = false) { const b = el('button', text); b.type = 'button'; b.disabled = disabled; b.onclick = fn; return b; }
export function formSource(context: EditorRuntimeContext) {
  const artifact = context.snapshot?.artifact;
  if (!artifact?.visualForm) throw new Error('Form access unavailable.');
  const files = Object.fromEntries(artifact.files.map(f => [f.role, f.content])) as unknown as ArtifactFiles;
  const metadata = JSON.parse(files.metadata) as ArtifactMetadata;
  if (!metadata.form) throw new Error('Form metadata needs repair.'); return { artifact, files, metadata };
}
export function editForm(context: EditorRuntimeContext, group: string, mutate: (m: ArtifactMetadata, doc: Document) => void) {
  const { artifact, files, metadata } = formSource(context), doc = new DOMParser().parseFromString(files.source, 'text/html');
  mutate(metadata, doc);
  metadata.form!.contractVersion = 1;
  const changes: Record<string, string> = {};
  changes[artifact.files.find(f => f.role === 'metadata')!.path] = JSON.stringify(metadata, null, 2) + '\n';
  const source = doc.body.innerHTML;
  if (source !== new DOMParser().parseFromString(files.source, 'text/html').body.innerHTML) changes[artifact.files.find(f => f.role === 'source')!.path] = source;
  context.setFiles(changes, group);
}
function fieldControl(field: FormField) {
  const row = el('div'); row.className = 'uip-layout-item'; row.dataset.uipNode = `row_${field.id}`;
  const tag = field.codec === 'json' ? 'uib-forms-textarea' : field.type === 'boolean' ? 'uib-forms-checkbox' : field.type === 'number' ? 'uib-forms-number' : 'uib-forms-textbox';
  const input = document.createElement(tag); input.dataset.uipNode = field.node; input.setAttribute('name', field.key); input.setAttribute('label', field.label ?? field.key);
  const error = el('span'); error.dataset.uipFieldError = field.id; error.setAttribute('role', 'alert'); row.append(input, error); return row;
}
function addMapping(context: EditorRuntimeContext, field: DatasetDefinition['fields'][number], manual = false) {
  editForm(context, `mapping/add/${field.id}`, (m, doc) => {
    if (m.form!.fields.some(f => f.datasetFieldId === field.id || f.key === field.key)) throw new Error('This Dataset field is already mapped.');
    const id = `field_${crypto.randomUUID()}`;
    const mapped: FormField = { id, node: `control_${crypto.randomUUID()}`, datasetFieldId: field.id, key: field.key,
      type: field.type === 'number' || field.type === 'integer' ? 'number' : field.type === 'boolean' ? 'boolean' : manual ? 'object' : 'string',
      datasetRequired: field.required, required: field.required, default: field.default, label: field.key, visible: true, editable: true,
      ...(field.type === 'date' ? { codec: 'date', help: 'UTC ISO timestamp; no time-zone conversion.' } : manual ? { codec: 'json', help: 'Explicit JSON object mapping. Valid JSON objects only; no coercion.' } : {}) };
    m.form!.fields.push(mapped); const root = doc.querySelector(`[data-uip-node="${m.form!.node}"]`); if (!root) throw new Error('Form root needs repair.'); root.append(fieldControl(mapped));
  });
}
function text(label: string, value: string, key: string, disabled: boolean, change: (v: string) => void, type = 'text') {
  const row = el('label', label), input = el('input'); input.type = type; input.value = value; input.setAttribute('aria-label', label); input.dataset.editorFocus = key; input.disabled = disabled;
  input.oninput = () => { try { input.setCustomValidity(''); change(input.value); } catch (error) { input.setCustomValidity((error as Error).message); input.reportValidity(); } }; row.append(input); return row;
}
function check(label: string, checked: boolean, disabled: boolean, change: (v: boolean) => void) {
  const row = el('label', label), input = el('input'); input.type = 'checkbox'; input.checked = checked; input.setAttribute('aria-label', label); input.disabled = disabled; input.onchange = () => change(input.checked); row.append(input); return row;
}
function select(label: string, value: string, choices: Array<[string, string]>, disabled: boolean, change: (v: string) => void) {
  const row = el('label', label), input = el('select'); input.setAttribute('aria-label', label); input.dataset.editorFocus = label;
  for (const [id, name] of choices) input.append(new Option(name, id)); input.value = value; input.disabled = disabled; input.onchange = () => change(input.value); row.append(input); return row;
}
/** Structured expression controls serialize the canonical AST, never an executable formula string. */
function expressionControls(container: HTMLElement, node: ExpressionNode, fields: FormField[], disabled: boolean, change: (node: ExpressionNode) => void, path = 'expression') {
  container.append(select(`${path} kind`, node.kind, [['field', 'Field'], ['literal', 'Literal'], ['operator', 'Operator']], disabled, kind => change(kind === 'field' ? { kind, fieldId: fields[0]?.datasetFieldId ?? '' } : kind === 'literal' ? { kind, value: '' } : { kind: 'operator', operator: 'concat', args: [{ kind: 'literal', value: '' }, { kind: 'literal', value: '' }] })));
  if (node.kind === 'field') container.append(select(`${path} field`, node.fieldId, fields.filter(f => ['string', 'number', 'boolean'].includes(f.type)).map(f => [f.datasetFieldId, f.label ?? f.key]), disabled, fieldId => change({ ...node, fieldId })));
  if (node.kind === 'literal') {
    container.append(select(`${path} literal type`, typeof node.value, [['string', 'Text'], ['number', 'Number'], ['boolean', 'Boolean']], disabled, type => change({ kind: 'literal', value: type === 'number' ? 0 : type === 'boolean' ? false : '' })));
    if (typeof node.value === 'boolean') container.append(check(`${path} value`, node.value, disabled, value => change({ ...node, value })));
    else container.append(text(`${path} value`, String(node.value), path, disabled, value => change({ ...node, value: typeof node.value === 'number' ? Number(value) : value }), typeof node.value === 'number' ? 'number' : 'text'));
  }
  if (node.kind === 'operator') {
    container.append(select(`${path} operator`, node.operator, ['concat', 'add', 'subtract', 'multiply', 'divide', 'eq', 'lt', 'gt', 'and', 'or', 'not', 'if'].map(v => [v, v]), disabled, value => {
      const operator = value as typeof node.operator, count = operator === 'not' ? 1 : operator === 'if' ? 3 : 2;
      change({ ...node, operator, args: Array.from({ length: count }, (_, i) => node.args[i] ?? { kind: 'literal', value: operator === 'concat' ? '' : operator === 'and' || operator === 'or' || operator === 'not' || operator === 'if' && i === 0 ? false : 0 }) });
    }));
    node.args.forEach((arg, i) => { const group = el('fieldset'); group.append(el('legend', `Operand ${i + 1}`)); expressionControls(group, arg, fields, disabled, next => change({ ...node, args: node.args.map((a, index) => index === i ? next : a) }), `${path}.${i + 1}`); container.append(group); });
  }
}
export async function formDatasetChoices(context: EditorRuntimeContext) {
  const binding = createEditorSessionBinding(), key = formApplicationKey(context);
  const response = await fetch(`/api/apps/${encodeURIComponent(key)}/datasets/discovery`, { headers: await binding.headers(), cache: 'no-store' }); const value = await response.json(); binding.assert();
  if (!response.ok || context.suspended) throw new Error(value.error ?? 'Dataset discovery denied.'); return value as DatasetChoice[];
}
function renderMapping(container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) {
  const state = stateFor(context), { metadata } = formSource(context);
  container.append(el('p', 'Mapping uses permanent field identities from the verified applied Dataset. Source drafts cannot change runtime authority.'));
  container.append(select('Read adapter', metadata.form!.submit.readService, [['dataset.read', 'Protected Dataset read']], !context.canEdit, value => editForm(context, 'form/read-adapter', m => { m.form!.submit.readService = value; })),
    select('Write adapter', metadata.form!.submit.service, [['dataset.write', 'Protected Dataset write']], !context.canEdit, value => editForm(context, 'form/write-adapter', m => { m.form!.submit.service = value; })));
  if (state.message) container.append(el('p', state.message));
  const run = (fn: () => Promise<void>) => { void fn().catch(error => { state.message = error.message; container.append(el('p', error.message)); }); };
  container.append(button('Refresh Datasets', () => run(async () => { state.datasets = await formDatasetChoices(context); container.replaceChildren(); renderMapping(container, context, scope); })));
  container.append(button('Create Dataset from Form', () => run(async () => { const a = actions.get(context); if (!a) throw new Error('Open this Form in the Application workspace.'); await a.createDataset(); }), !context.canEdit));
  if (!state.datasets) { let live = true; scope.onCleanup(() => { live = false; }); void formDatasetChoices(context).then(data => { state.datasets = data; if (live) { container.replaceChildren(); renderMapping(container, context, scope); } }).catch(error => { if (live) container.append(el('p', error.message)); }); return; }
  container.append(select('Form Dataset', metadata.form!.datasetId, [['', 'Select Dataset'], ...state.datasets.map(d => [d.appliedSchema?.dataset.id ?? d.schema?.dataset.id ?? '', `${d.name ?? d.schema?.dataset.name ?? 'Dataset'}${d.appliedSchema ? ' (applied)' : ' (not applied)'}`] as [string, string])], !context.canEdit, value => {
    if (metadata.form!.fields.length && value !== metadata.form!.datasetId) { state.message = 'Remove existing mappings explicitly before changing Dataset. Identities are never remapped automatically.'; container.append(el('p', state.message)); return; }
    editForm(context, 'form/dataset', m => { m.form!.datasetId = value; });
  }));
  const choice = state.datasets.find(d => (d.appliedSchema?.dataset.id ?? d.schema?.dataset.id) === metadata.form!.datasetId), schema = choice?.appliedSchema;
  if (!schema) { container.append(el('p', 'Select, apply and connect a Dataset through its existing editor before executable mapping/submission.')); return; }
  for (const f of schema.fields.filter(f => f.type !== 'id')) {
    const mapped = metadata.form!.fields.find(m => m.datasetFieldId === f.id), supported = ['string', 'number', 'integer', 'boolean', 'date'].includes(f.type);
    const row = el('article'); row.append(el('p', `${f.key} · ${f.type} · ${f.required ? 'required' : 'optional'} · ${mapped ? 'mapped' : 'unmapped'} · ${f.id}`));
    if (!mapped && supported) row.append(button(`Map ${f.key}`, () => addMapping(context, f), !context.canEdit));
    if (!mapped && !supported) {
      row.append(el('p', 'No automatic control/conversion is available. This field is exposed and remains unmapped; required unmapped fields block submission.'));
      if (f.type === 'json') row.append(button(`Manually map ${f.key} as JSON object`, () => { if (confirm('Use an explicit JSON object editor? Arrays and scalar JSON values will be rejected; existing Dataset values will not be converted.')) addMapping(context, f, true); }, !context.canEdit));
    }
    if (mapped && (mapped.key !== f.key || mapped.datasetRequired !== f.required || mapped.type !== (f.type === 'boolean' ? 'boolean' : ['number', 'integer'].includes(f.type) ? 'number' : f.type === 'json' ? 'object' : 'string'))) row.append(el('p', 'Mapping differs from applied authority. Resolve explicitly; runtime remains protected.'));
    container.append(row);
  }
  container.append(button('Generate supported mappings', () => { for (const f of schema.fields.filter(f => f.type !== 'id' && ['string', 'number', 'integer', 'boolean', 'date'].includes(f.type))) if (!formSource(context).metadata.form!.fields.some(m => m.datasetFieldId === f.id)) addMapping(context, f); }, !context.canEdit));
}
function renderFields(container: HTMLElement, context: EditorRuntimeContext, rules: boolean) {
  const { metadata } = formSource(context), disabled = !context.canEdit;
  for (const field of metadata.form!.fields) {
    const row = el('fieldset'); row.dataset.formField = field.id; row.append(el('legend', field.label ?? field.key), el('p', `Form field ${field.id}; Dataset field ${field.datasetFieldId}`));
    const update = (name: string, fn: (f: FormField, m: ArtifactMetadata) => void) => editForm(context, `${field.id}/${name}`, m => fn(m.form!.fields.find(f => f.id === field.id)!, m));
    if (!rules) {
      row.append(text('Field label', field.label ?? '', `${field.id}/label`, disabled, value => update('label', f => { f.label = value; })), text('Field help', field.help ?? '', `${field.id}/help`, disabled, value => update('help', f => { f.help = value; })));
      for (const property of ['visible', 'editable', 'required'] as const) row.append(check(property, field[property] !== false && (property !== 'required' || !!field.required), disabled || property === 'required' && !!field.datasetRequired, value => update(property, f => { f[property] = value; })));
      row.append(select('Field operation', field.operations?.join(',') ?? 'create,edit', [['create,edit', 'Create and edit'], ['create', 'Create only'], ['edit', 'Edit only']], disabled, value => update('operations', f => { f.operations = value.split(',') as ('create' | 'edit')[]; })));
      row.append(text('Default value', field.default === undefined ? '' : field.codec === 'json' ? JSON.stringify(field.default) : String(field.default), `${field.id}/default`, disabled, value => { if (value === '') update('default', f => { delete f.default; }); else update('default', f => { f.default = field.codec === 'json' ? JSON.parse(value) : field.type === 'number' ? Number(value) : field.type === 'boolean' ? value === 'true' : value; }); }));
      for (const direction of ['up', 'down'] as const) row.append(button(`Move ${direction}`, () => editForm(context, `${field.id}/${direction}`, (m, doc) => { const control = doc.querySelector(`[data-uip-node="${field.node}"]`), wrapper = control?.parentElement; if (!wrapper) return; const sibling = direction === 'up' ? wrapper.previousElementSibling : wrapper.nextElementSibling; if (!sibling || !sibling.querySelector('[data-uip-field-error]')) return; if (direction === 'up') sibling.before(wrapper); else sibling.after(wrapper); const ordered = [...doc.querySelectorAll('[data-uip-field-error]')].map(e => (e as HTMLElement).dataset.uipFieldError); m.form!.fields.sort((a,b) => ordered.indexOf(a.id) - ordered.indexOf(b.id)); }), disabled));
      row.append(button('Remove mapping and control', () => editForm(context, `remove/${field.id}`, (m, doc) => { doc.querySelector(`[data-uip-node="${field.node}"]`)?.parentElement?.remove(); m.form!.fields = m.form!.fields.filter(f => f.id !== field.id); m.conditions = m.conditions?.filter(c => c.node !== field.node); for (const mode of Object.values(m.modes?.overrides ?? {})) delete mode[field.node]; }), disabled));
    } else {
      const condition = metadata.conditions?.find(c => c.node === field.node);
      row.append(check('Conditional visibility', !!condition, disabled, enabled => update('condition', (_f, m) => { m.conditions = m.conditions?.filter(c => c.node !== field.node) ?? []; if (enabled) m.conditions.push({ node: field.node, when: { version: 1, expression: { kind: 'literal', value: true } } }); })));
      if (condition && typeof condition.when !== 'string' && 'version' in condition.when) expressionControls(row, condition.when.expression, metadata.form!.fields, disabled, expression => update('condition', (_f, m) => { m.conditions!.find(c => c.node === field.node)!.when = { version: 1, expression }; }), `${field.key} condition`);
      else if (condition) row.append(el('p', 'Existing legacy condition is preserved. Advanced Source supports its existing format; disable explicitly to replace.'));
      row.append(check('Calculated field', !!field.calculation, disabled || !['string', 'number', 'boolean'].includes(field.type), enabled => update('calculation', f => { if (!enabled) delete f.calculation; else f.calculation = { persist: false, expression: { version: 1, expression: { kind: 'literal', value: f.type === 'number' ? 0 : f.type === 'boolean' ? false : '' } } }; })));
      if (field.calculation) {
        row.append(check('Persist calculated value', field.calculation.persist, disabled, value => update('calculation', f => { f.calculation!.persist = value; })));
        expressionControls(row, field.calculation.expression.expression, metadata.form!.fields, disabled, expression => update('calculation', f => { f.calculation!.expression = { version: 1, expression }; }), `${field.key} calculation`);
      }
    }
    container.append(row);
  }
  if (rules) {
    try { calculationOrder(formCalculations(metadata), formExpressionFields(metadata)); for (const c of metadata.conditions ?? []) if (typeof c.when !== 'string' && 'version' in c.when && expressionType(c.when, new Map(formExpressionFields(metadata).map(f => [f.fieldId, f.type]))) !== 'boolean') throw new Error('Conditions must produce a Boolean.'); }
    catch (error) { container.append(el('p', `Invalid draft retained: ${(error as Error).message}`)); }
    container.append(el('p', 'Calculations are deterministic typed declarations. Missing/unreadable dependencies, invalid types, cycles and non-finite results block submission. Persisted results are validated by protected DOE.'));
  } else container.append(el('p', 'Use Dataset Mapping to add fields. Dataset-required rules remain mandatory even when presentation hides a control.'));
}
function renderModes(container: HTMLElement, context: EditorRuntimeContext) {
  const { metadata } = formSource(context), disabled = !context.canEdit;
  container.append(select('Default Form mode', metadata.modes!.default, Object.keys(metadata.modes!.overrides).map(name => [name, name]), disabled, value => editForm(context, 'form/default-mode', m => { m.modes!.default = value; m.public!.properties.mode.default = value; })));
  container.append(button('Add mode', () => { const name = prompt('Mode name'); if (!name || !/^[A-Za-z][\w-]*$/.test(name)) return; editForm(context, `mode/${name}`, m => { if (Object.hasOwn(m.modes!.overrides, name)) throw new Error('Mode exists.'); m.modes!.overrides[name] = {}; }); }, disabled));
  for (const [mode, overrides] of Object.entries(metadata.modes?.overrides ?? {})) {
    const group = el('fieldset'); group.append(el('legend', mode));
    for (const field of metadata.form!.fields) {
      const row = el('fieldset'); row.append(el('legend', field.label ?? field.key));
      for (const property of ['visible', 'editable', 'required'] as const) row.append(select(`${mode} ${field.key} ${property}`, overrides[field.node]?.[property] === undefined ? 'inherit' : String(overrides[field.node][property]), [['inherit', 'Inherit'], ['true', 'Yes'], ['false', 'No']], disabled || property === 'required' && !!field.datasetRequired, value => editForm(context, `mode/${mode}/${field.id}/${property}`, m => { const next = m.modes!.overrides[mode][field.node] ??= {}; if (value === 'inherit') delete next[property]; else next[property] = value === 'true'; })));
      group.append(row);
    }
    container.append(group);
  }
}
export function registerFormEditor(plugins: EditorPluginRegistry, preview: (container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) => void) {
  const render = (fn: (container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) => void) => (container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) => { try { fn(container, context, scope); } catch { container.append(el('p', 'Structured Form editing is paused. Source is retained; use Advanced Source to repair it.'), button('Advanced Source', scope.openSource)); } };
  plugins.register({ id: 'visual-form', artifactTypes: ['visual-form'], definitionVersions: [1], contributes: [
    { id: 'mapping', label: 'Dataset Mapping', slot: 'tab', order: -5 }, { id: 'fields', label: 'Structure and Fields', slot: 'tab', order: -4 },
    { id: 'rules', label: 'Validation and Calculations', slot: 'tab', order: -3 }, { id: 'modes', label: 'Modes', slot: 'tab', order: -2 }, { id: 'preview', label: 'Preview and Submission Test', slot: 'tab', order: -1 },
  ] }, { mapping: render(renderMapping), fields: render((c, x) => renderFields(c, x, false)), rules: render((c, x) => renderFields(c, x, true)), modes: render(renderModes), preview: render(preview) });
}
