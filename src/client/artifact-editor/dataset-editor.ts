import { ApplicationDataClient, createSessionApplicationDataTransport } from '@uib/platform-core/application-data';
import type { AuthoringDatasetSchema, DatasetDevelopmentStatus } from '../../shared/dataset-authoring.js';
import type { EditorRuntimeContext } from './context.js';
import type { EditorPluginScope } from './plugins.js';
import { createEditorSessionBinding } from './session.js';

type Capabilities = DatasetDevelopmentStatus['capabilities'];
type State = { capabilities?: Capabilities; status?: DatasetDevelopmentStatus; message?: string; records?: Record<string, unknown>[] };
const states = new WeakMap<EditorRuntimeContext, State>();
const stateFor = (context: EditorRuntimeContext) => { let state = states.get(context); if (!state) { state = {}; states.set(context, state); } return state; };
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
function button(label: string, action: () => void, disabled = false) { const node = el('button', label); node.type = 'button'; node.disabled = disabled; node.onclick = action; return node; }
function source(context: EditorRuntimeContext) {
  const file = context.snapshot?.artifact.files.find(f => f.role === 'definition');
  if (!file) throw new Error('Dataset definition unavailable.');
  return { file, schema: JSON.parse(file.content) as AuthoringDatasetSchema };
}
function edit(context: EditorRuntimeContext, group: string, mutate: (schema: AuthoringDatasetSchema) => void) {
  const { file, schema } = source(context); mutate(schema); context.setFile(file.path, JSON.stringify(schema, null, 2), file.role, file.language, group);
}
export async function datasetRequest<T>(context: EditorRuntimeContext, action: string, input?: Record<string, unknown>): Promise<T> {
  const binding = createEditorSessionBinding(), headers = await binding.headers(), snapshot = context.snapshot;
  if (!snapshot) throw new Error('Dataset access suspended.');
  const response = await fetch(`/api/apps/${encodeURIComponent(context.applicationKey)}/datasets/${action}${input ? '' : `?locator=${encodeURIComponent(snapshot.artifact.locator)}`}`, {
    method: input ? 'POST' : 'GET', headers: { ...headers, 'content-type': 'application/json' }, cache: 'no-store',
    ...(input ? { body: JSON.stringify({ locator: snapshot.artifact.locator, expectedChecksum: snapshot.artifact.checksum, ...input }) } : {}) });
  const value = await response.json(); binding.assert();
  if (context.suspended || !response.ok) throw new Error(value.error ?? 'Dataset operation denied.');
  return value;
}
export function renderDatasetFields(container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) {
  const state = stateFor(context);
  const render = () => {
    container.replaceChildren();
    let schema: AuthoringDatasetSchema;
    try { schema = source(context).schema; if (!Array.isArray(schema.fields)) throw new Error(); }
    catch { container.append(el('p', 'The definition needs source repair before structured editing is available.'), button('Advanced Source', scope.openSource)); return; }
    container.append(el('p', `Permanent Dataset ID: ${schema.dataset.id}`), el('p', `Storage key: ${schema.dataset.key}`));
    const textControl = (label: string, value: string, key: string, change: (value: string) => void, disabled = false, onBlur = false) => {
      const row = el('label', label), input = el('input'); input.value = value; input.setAttribute('aria-label', label);
      input.dataset.editorFocus = `dataset/${key}`; input.disabled = disabled || !context.canEdit;
      const commit = () => { try { input.setCustomValidity(''); change(input.value); } catch (error) { input.setCustomValidity((error as Error).message); input.reportValidity(); } };
      if (onBlur) input.onchange = commit; else input.oninput = commit;
      row.append(input); return row;
    };
    container.append(textControl('Dataset name', schema.dataset.name, 'name', value => edit(context, 'dataset-name', s => { s.dataset.name = value; })),
      textControl('Plural name', schema.dataset.pluralName, 'pluralName', value => edit(context, 'dataset-plural', s => { s.dataset.pluralName = value; })));
    if (!state.capabilities) { container.append(el('p', 'Reading registered schema capabilities…')); return; }
    for (const field of schema.fields) {
      const row = el('article'); row.className = 'proof-collection-row'; row.append(el('p', `Permanent field ID: ${field.id}`));
      const change = (group: string, fn: (f: AuthoringDatasetSchema['fields'][number]) => void) => edit(context, `${field.id}/${group}`, s => { const f = s.fields.find(f => f.id === field.id); if (f) fn(f); });
      row.append(textControl('Field name', field.key, `${field.id}/key`, value => change('key', f => { f.key = value; }), field.key === 'id'));
      const typeLabel = el('label', 'Data type'), type = el('select'); type.setAttribute('aria-label', 'Data type'); type.dataset.editorFocus = `dataset/${field.id}/type`;
      for (const value of state.capabilities.fieldTypes.filter(t => t !== 'id' || field.key === 'id')) { const option = el('option', value); option.value = value; type.append(option); }
      type.value = field.type; type.disabled = !context.canEdit || field.key === 'id'; type.onchange = () => change('type', f => { f.type = type.value; }); typeLabel.append(type); row.append(typeLabel);
      const requiredLabel = el('label', 'Required'), required = el('input'); required.type = 'checkbox'; required.checked = !!field.required; required.setAttribute('aria-label', 'Required');
      required.disabled = !context.canEdit || field.key === 'id'; required.onchange = () => change('required', f => { f.required = required.checked; }); requiredLabel.append(required); row.append(requiredLabel);
      const hasDefaultLabel = el('label', 'Use default value'), hasDefault = el('input'); hasDefault.type = 'checkbox'; hasDefault.checked = Object.hasOwn(field, 'default'); hasDefault.setAttribute('aria-label', 'Use default value'); hasDefault.disabled = !context.canEdit || field.key === 'id';
      hasDefault.onchange = () => change('default', f => { if (!hasDefault.checked) delete f.default; else f.default = f.type === 'number' ? 0 : f.type === 'boolean' ? false : f.type === 'json' ? {} : f.type === 'date' ? new Date().toISOString() : ''; }); hasDefaultLabel.append(hasDefault); row.append(hasDefaultLabel);
      if (hasDefault.checked) {
        if (field.type === 'boolean') {
          const label = el('label', 'Default value'), input = el('input'); input.type = 'checkbox'; input.checked = field.default === true; input.setAttribute('aria-label', 'Default value'); input.disabled = !context.canEdit;
          input.onchange = () => change('default', f => { f.default = input.checked; }); label.append(input); row.append(label);
        } else row.append(textControl('Default value', field.type === 'json' ? JSON.stringify(field.default) : String(field.default ?? ''), `${field.id}/default`, value => change('default', f => { f.default = field.type === 'number' ? (value === '' ? '' : Number(value)) : field.type === 'json' ? JSON.parse(value) : value; }), false, field.type === 'json'));
        if (field.type === 'date') row.append(el('p', 'Use a UTC ISO date, for example 2026-01-01T00:00:00.000Z.'));
        if (field.type === 'json') row.append(el('p', 'Enter a complete JSON value and leave the field to apply it. Invalid JSON is not committed.'));
      }
      row.append(button('Remove field', () => edit(context, `remove/${field.id}`, s => { s.fields = s.fields.filter(f => f.id !== field.id); }), !context.canEdit || field.key === 'id'));
      container.append(row);
    }
    container.append(button('Add field', () => edit(context, `add/${crypto.randomUUID()}`, s => { s.fields.push({ id: crypto.randomUUID(), key: `field${s.fields.length}`, type: 'string' }); }), !context.canEdit));
    container.append(el('p', 'Field labels and relationships are unsupported by the registered V1 schema. Field names can change without replacing their IDs. Applying changes to an existing Dataset requires a separately reviewed migration.'));
  };
  let live = true; scope.onCleanup(() => { live = false; });
  if (!state.capabilities) void datasetRequest<Capabilities>(context, 'capabilities').then(value => { state.capabilities = value; if (live) render(); }).catch(error => { if (live) container.append(el('p', error.message)); });
  render();
}
export function renderDatasetDevelopment(container: HTMLElement, context: EditorRuntimeContext, _scope: EditorPluginScope) {
  const state = stateFor(context), snapshot = context.snapshot;
  const render = () => {
    container.replaceChildren();
    container.append(el('p', 'Saving source does not publish, activate or migrate the Dataset. Apply requires Dataset administration authority; runtime permissions are assigned separately through trusted security administration.'));
    if (state.message) container.append(el('p', state.message));
    if (state.status && state.status.sourceChecksum === snapshot?.artifact.checksum && !snapshot.dirty) {
      const status = state.status;
      container.append(el('p', `Source: ${status.sourceValid ? 'valid' : 'invalid'} · Validated revision: ${status.validated ? 'current' : 'not current'} · Published: ${status.publication ? `version ${status.publication.version}` : 'no'} · Applied: ${status.applied ? 'verified' : 'unverified'} · Runtime: ${status.connection}`));
      if (status.connectedDatasetId) container.append(el('p', `Connected Dataset: ${status.connectedDatasetId}`));
      if (status.diagnostic) container.append(el('p', status.diagnostic));
    }
    else if (state.status) container.append(el('p', 'Source changed. Refresh development status to compare the saved revision with the applied Dataset.'));
    const action = (name: string, confirmed = false) => {
      if (name === 'connect' && state.status) state.status = { ...state.status, connection: 'connecting' };
      void context.perform(async () => { try { state.status = await datasetRequest<DatasetDevelopmentStatus>(context, name, name === 'status' ? undefined : { confirmed }); state.message = `${name} completed.`; }
        catch (error) { state.message = (error as Error).message; if (name === 'connect' && state.status) state.status = { ...state.status, connection: 'failed', diagnostic: state.message }; } }).catch(error => { state.message = error.message; render(); });
    };
    container.append(button('Refresh development status', () => action('status'), context.pending),
      button('Validate saved definition', () => action('validate'), context.pending || !!snapshot?.dirty),
      button('Apply to Development…', () => { if (confirm('Publish and activate this saved Dataset in Development? This creates real development storage and does not grant runtime permissions. Existing schema migrations are unsupported.')) action('apply', true); }, context.pending || !!snapshot?.dirty),
      button('Connect Runtime…', () => { if (confirm('Connect this applied Dataset to this Application’s protected development host? One Dataset is supported per host.')) action('connect', true); }, context.pending || !!snapshot?.dirty));
    container.append(el('p', 'Required values and defaults use the existing protected engine. Permission rules reference permanent Dataset and field IDs through I-AM. The creator receives no automatic runtime or security grant.'));
  };
  render();
}
export function renderDatasetRelationships(container: HTMLElement) {
  container.append(el('p', 'Relationships are unsupported by the registered V1 schema and protected host. No relationship definition will be approximated.'));
}
export function renderDatasetValidation(container: HTMLElement) {
  container.append(el('p', 'Required fields and supported defaults use the existing SchemaManager and protected engine. Configure Required and Default in Fields, save, then validate the saved definition in Development Apply/Connect. Additional validation operators are unsupported.'));
}
export function renderDatasetPermissions(container: HTMLElement, context: EditorRuntimeContext) {
  try {
    const { schema } = source(context);
    container.append(el('p', `Dataset permission reference: ${schema.dataset.id}`));
    for (const field of schema.fields) container.append(el('p', `${field.key}: ${field.id}`));
    container.append(el('p', 'Definition editing: ui.artifact.edit. Schema application and host connection: ui.artifact.admin. Runtime operation permissions: dataset.read, dataset.create, dataset.update, dataset.delete; field writes: dataset.write. These are separate grants through the existing trusted I-AM administration paths.'));
    container.append(el('p', 'Schema-embedded visibility, editability, labels and permission references are unsupported. I-AM rules use the permanent IDs above. This editor does not automatically grant the creator runtime or security authority.'));
  } catch { container.append(el('p', 'Repair the source to inspect permission references.')); }
}
export function renderDatasetRecords(container: HTMLElement, context: EditorRuntimeContext, _scope: EditorPluginScope) {
  const state = stateFor(context), schema = state.status?.appliedSchema;
  if (!schema) {
    container.append(el('p', state.message ?? 'Load the verified applied schema before using records.'), button('Load applied Dataset status', () => {
      void context.perform(async () => {
        try { state.status = await datasetRequest<DatasetDevelopmentStatus>(context, 'status'); state.message = state.status.appliedSchema ? undefined : 'Apply the Dataset before using Records.'; }
        catch (error) { state.message = (error as Error).message; }
      }).catch(error => { container.append(el('p', error.message)); });
    }, context.pending)); return;
  }
  container.append(el('p', `Records use applied schema version ${state.status?.publication?.version}; unsaved or newer source does not change record fields.`));
  container.append(el('p', 'These are real development records. Every operation uses the protected Application data service.'));
  if (state.message) container.append(el('p', state.message));
  const endpoint = `/api/apps/${encodeURIComponent(context.applicationKey)}/application-data`;
  const perform = (action: (client: ApplicationDataClient) => Promise<unknown>) => {
    const binding = createEditorSessionBinding();
    void context.perform(async () => {
      try {
        await binding.headers();
        const transport = createSessionApplicationDataTransport({ endpoint });
        const client = new ApplicationDataClient({ async send(path, intent) { binding.assert(); if (context.suspended) throw new Error('Access suspended.'); const value = await transport.send(path, intent); binding.assert(); if (context.suspended) throw new Error('Access suspended.'); return value; } });
        const result = await action(client) as { success?: boolean; errors?: { message: string }[]; commitOutcome?: string };
        if (result?.success === false) throw new Error(`${result.errors?.map(e => e.message).join('; ')} (commit: ${result.commitOutcome})`);
        state.records = await client.read(schema.dataset.id) as Record<string, unknown>[]; state.message = 'Records reloaded from the protected service.';
      } catch (error) { state.message = (error as Error).message; }
    }).catch(error => { container.append(el('p', error.message)); });
  };
  container.append(button('Reload records', () => perform(client => client.read(schema.dataset.id)), context.pending));
  const editor = (row: Record<string, unknown>, creating: boolean) => {
    const form = el('form'), values: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (!creating && !Object.hasOwn(row, field.key)) continue;
      const label = el('label', field.key), input = el('input'); input.setAttribute('aria-label', `${creating ? 'New' : 'Edit'} ${field.key}`);
      input.value = row[field.key] === undefined ? '' : field.type === 'json' ? JSON.stringify(row[field.key]) : String(row[field.key]);
      input.disabled = context.pending || !creating && field.key === 'id'; if (field.key === 'id') values.id = row.id;
      input.oninput = () => { if (input.value === '' && creating) { delete values[field.key]; return; } values[field.key] = input.value; };
      label.append(input); form.append(label);
    }
    const payload = () => Object.fromEntries(Object.entries(values).map(([key, value]) => {
      const type = schema.fields.find(f => f.key === key)?.type;
      if (type === 'json') return [key, JSON.parse(String(value))];
      if (type === 'number') { const number = Number(value); if (!Number.isFinite(number) || value === '') throw new Error(`${key} requires a number.`); return [key, number]; }
      if (type === 'boolean') { if (!['true', 'false'].includes(String(value))) throw new Error(`${key} requires true or false.`); return [key, String(value) === 'true']; }
      return [key, value];
    }));
    form.append(button(creating ? 'Create record' : 'Update record', () => perform(client => creating ? client.create(schema.dataset.id, [payload()]) : client.update(schema.dataset.id, [payload()])), context.pending));
    if (!creating) form.append(button('Delete record', () => { if (confirm('Delete this development record?')) perform(client => client.delete(schema.dataset.id, [{ id: row.id }])); }, context.pending));
    return form;
  };
  container.append(editor({ id: crypto.randomUUID() }, true));
  for (const row of state.records ?? []) container.append(editor(row, false));
}
